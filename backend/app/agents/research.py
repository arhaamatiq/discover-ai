import asyncio
import json
import logging
import re
from dataclasses import dataclass
from typing import Optional

import httpx
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.language_models import BaseChatModel

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ResearchResult:
    company_name: str
    domain: Optional[str]
    research: str
    logo_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Step 1 – Analyse raw user input → company name, domain, signal-hunting queries
# ---------------------------------------------------------------------------

INPUT_ANALYSIS_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a precise input parser. Given user input about a company, extract "
        "structured information for a signal-first research pipeline.\n\n"
        "Return ONLY valid JSON (no markdown fences) with these keys:\n"
        '- "company_name": The official company name (best guess)\n'
        '- "domain": The website domain if provided or confidently known '
        '(e.g. "stripe.com"), or null\n'
        '- "search_queries": Array of EXACTLY 6 targeted search queries.\n\n'
        "The 6 queries must cover these categories IN ORDER:\n"
        "1. Company overview: business model, products, industry, customers\n"
        "2. Technology: engineering stack, developer blog, APIs, open-source\n"
        "3. M&A and funding: acquisitions, mergers, investments, IPO prep (2024-2025)\n"
        "4. Product signals: new launches, feature releases, press releases (2024-2025)\n"
        "5. Org signals: layoffs, hiring trends, leadership hires or exits (2024-2025)\n"
        "6. Pain points: user complaints, reviews, regulatory issues, public criticism\n\n"
        "Examples:\n"
        '{{"company_name": "Stripe", "domain": "stripe.com", "search_queries": [\n'
        '  "Stripe company overview business model payment products",\n'
        '  "Stripe engineering blog technology stack APIs developer tools",\n'
        '  "Stripe acquisition merger funding round 2024 2025",\n'
        '  "Stripe new product feature launch announcement 2024 2025",\n'
        '  "Stripe layoffs hiring leadership executive change 2024 2025",\n'
        '  "Stripe user complaints reviews fraud pain points"\n'
        "]}}\n\n"
        '{{"company_name": "Rivian", "domain": "rivian.com", "search_queries": [\n'
        '  "Rivian company overview electric vehicles business model",\n'
        '  "Rivian technology software platform engineering stack",\n'
        '  "Rivian partnership investment funding 2024 2025",\n'
        '  "Rivian new vehicle product launch announcement 2024 2025",\n'
        '  "Rivian layoffs headcount hiring leadership change 2024 2025",\n'
        '  "Rivian customer complaints delivery issues recalls"\n'
        "]}}"
    ),
    ("human", "{input}"),
])


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
    return text.strip()


async def _analyze_input(llm: BaseChatModel, user_input: str) -> dict:
    """Extract company name, domain, and 6 signal-hunting queries from raw input."""
    extracted_domain: Optional[str] = None
    url_match = re.search(r"https?://([^\s/]+)", user_input)
    if url_match:
        extracted_domain = url_match.group(1).lower().lstrip("www.")
    else:
        domain_match = re.search(
            r"\b([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)\b",
            user_input,
        )
        if domain_match:
            extracted_domain = domain_match.group(1).lower()

    chain = INPUT_ANALYSIS_PROMPT | llm
    result = await chain.ainvoke({"input": user_input})

    try:
        parsed = json.loads(_strip_json_fences(result.content))
    except (json.JSONDecodeError, Exception):
        name = user_input.strip()
        parsed = {
            "company_name": name,
            "domain": extracted_domain,
            "search_queries": [
                f"{name} company overview business model products",
                f"{name} engineering technology stack blog APIs",
                f"{name} acquisition merger funding 2024 2025",
                f"{name} new product launch announcement 2024 2025",
                f"{name} layoffs hiring leadership change 2024 2025",
                f"{name} user complaints reviews pain points",
            ],
        }

    if extracted_domain:
        parsed["domain"] = extracted_domain

    return parsed


# ---------------------------------------------------------------------------
# Logo resolution (runs in parallel with search + scrape)
# ---------------------------------------------------------------------------

async def _resolve_logo_url(domain: str) -> Optional[str]:
    """Clearbit first (2s HEAD), Google Favicons fallback. Returns None if no domain."""
    if not domain:
        return None

    clearbit_url = f"https://logo.clearbit.com/{domain}"
    google_url = f"https://www.google.com/s2/favicons?domain_url=https://{domain}&sz=128"

    try:
        async with httpx.AsyncClient(
            timeout=2.0,
            follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0"},
        ) as client:
            resp = await client.head(clearbit_url)
            if resp.status_code == 200 and "image" in resp.headers.get("content-type", ""):
                return clearbit_url
    except Exception:
        pass

    return google_url


# ---------------------------------------------------------------------------
# Step 2 – Web search via Tavily (6 parallel queries)
# ---------------------------------------------------------------------------

async def _tavily_search(query: str, max_results: int = 5) -> list[dict]:
    if not settings.tavily_api_key:
        return []
    try:
        from tavily import AsyncTavilyClient

        client = AsyncTavilyClient(api_key=settings.tavily_api_key)
        response = await client.search(
            query=query,
            max_results=max_results,
            include_raw_content=False,
            search_depth="basic",
        )
        return response.get("results", [])
    except Exception as e:
        logger.warning("Tavily search failed for '%s': %s", query, e)
        return []


async def _run_web_searches(queries: list[str]) -> str:
    """Run all 6 signal-hunting queries in parallel, deduplicate, and format."""
    tasks = [_tavily_search(q) for q in queries[:6]]
    all_results = await asyncio.gather(*tasks, return_exceptions=True)

    combined: list[str] = []
    seen_urls: set[str] = set()
    for batch in all_results:
        if isinstance(batch, (Exception, BaseException)):
            continue
        for r in batch:
            url = r.get("url", "")
            if url in seen_urls:
                continue
            seen_urls.add(url)
            combined.append(
                f"Source: {url}\n"
                f"Title: {r.get('title', 'N/A')}\n"
                f"Content: {r.get('content', 'N/A')}"
            )

    return "\n\n---\n\n".join(combined[:30]) if combined else ""


# ---------------------------------------------------------------------------
# Step 3 – Website scraping (homepage + /about in parallel)
# ---------------------------------------------------------------------------

async def _scrape_website(domain: str) -> str:
    if not domain:
        return ""

    async def _fetch_page(client: httpx.AsyncClient, url: str) -> str:
        try:
            resp = await client.get(url)
            if resp.status_code != 200:
                return ""
            from bs4 import BeautifulSoup

            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "noscript", "svg", "img"]):
                tag.decompose()
            text = soup.get_text(separator="\n", strip=True)
            lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
            text = "\n".join(lines)
            if len(text) > 3500:
                text = text[:3500] + "\n[truncated]"
            return f"[{url}]\n{text}" if text else ""
        except Exception as e:
            logger.debug("Scrape failed for %s: %s", url, e)
            return ""

    urls = [f"https://{domain}", f"https://{domain}/about"]
    async with httpx.AsyncClient(
        timeout=6.0,
        follow_redirects=True,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        },
    ) as client:
        results = await asyncio.gather(
            *[_fetch_page(client, url) for url in urls],
            return_exceptions=True,
        )

    parts = [r for r in results if isinstance(r, str) and r]
    return "\n\n---\n\n".join(parts) if parts else ""


# ---------------------------------------------------------------------------
# Step 4 – LLM synthesis (with dedicated Key Signals section)
# ---------------------------------------------------------------------------

SYNTHESIS_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a senior technology research analyst preparing a brief for a "
        "student software agency pitching projects to companies. Your brief must "
        "surface every observable signal that could trigger a relevant software project.\n\n"
        "Structure your brief with EXACTLY these sections:\n\n"
        "## Company Overview\n"
        "What they do, mission, founding year, headquarters, key leadership, "
        "company size and revenue range.\n\n"
        "## Key Signals (Ideation Priority)\n"
        "CRITICAL SECTION. Extract every observable signal from the sources. "
        "For each signal, output one line:\n"
        "[Signal Type] | [What specifically happened] | [Date if known] | "
        "[Why this creates a software tooling need]\n\n"
        "Signal types to scan for: M&A/Acquisition, New Product Launch, "
        "Layoffs/Restructuring, Rapid Hiring, Funding/IPO, Regulatory Pressure, "
        "ESG Commitment, Leadership Change, Public Pain Point, Engineering Blog/Talk.\n\n"
        "If no signals are found, write: "
        "'No recent signals identified — ideas will be based on business model analysis.'\n\n"
        "## Products & Services\n"
        "Core products, services, platforms. Value propositions and revenue model.\n\n"
        "## Target Market & Customers\n"
        "Primary customer segments, market size, notable clients, geographic reach.\n\n"
        "## Technology & Engineering\n"
        "Known tech stack, engineering culture, APIs, platforms, open-source activity, "
        "technical blog insights.\n\n"
        "## Industry Landscape & Competitors\n"
        "Industry trends, direct competitors, market positioning.\n\n"
        "## Challenges & Pain Points\n"
        "Known business challenges, technical debt areas, industry-wide pain points, "
        "areas where they visibly struggle.\n\n"
        "RULES:\n"
        "- Be specific and factual. Reference concrete details from the sources.\n"
        "- Prioritise recency — signals from the past 12 months are most valuable.\n"
        "- Do NOT fabricate. Only include what the data supports.",
    ),
    (
        "human",
        "User input: {company}\n\n"
        "--- WEB SEARCH RESULTS ---\n{search_results}\n\n"
        "--- WEBSITE CONTENT ---\n{website_content}\n\n"
        "Additional context: {context}",
    ),
])

FALLBACK_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a company research analyst producing a brief for a student software "
        "agency. Use your training knowledge to write a concise, signal-aware brief.\n\n"
        "## Company Overview\n"
        "What they do, mission, founding year, HQ, leadership, size.\n\n"
        "## Key Signals (Ideation Priority)\n"
        "From your training knowledge, identify any known signals:\n"
        "[Signal Type] | [What happened] | [Date if known] | [Software opportunity]\n\n"
        "Signal types: M&A/Acquisition, New Product Launch, Layoffs/Restructuring, "
        "Rapid Hiring, Funding/IPO, Leadership Change, Public Pain Point, "
        "Engineering Blog/Talk.\n\n"
        "Note: '(From prior knowledge — verify with current sources)' after each entry.\n"
        "If nothing is known, write: 'No signals in training data — ideas based on "
        "business model.'\n\n"
        "## Products & Services\n"
        "Core offerings and value propositions.\n\n"
        "## Target Market & Customers\n"
        "Customer segments, notable clients, market size.\n\n"
        "## Technology & Engineering\n"
        "Tech stack, engineering culture, APIs, platforms.\n\n"
        "## Challenges & Pain Points\n"
        "Business challenges, technical debt, pain points.\n\n"
        "Be concise. Note assumptions when info is uncertain.",
    ),
    ("human", "Company: {company}\n\nAdditional context: {context}"),
])


# ---------------------------------------------------------------------------
# Main orchestration
# ---------------------------------------------------------------------------

async def research_company(
    llm: BaseChatModel, company: str, context: str = ""
) -> ResearchResult:
    """Full pipeline: analyse input → parallel search + scrape + logo → synthesise."""

    # Step 1: Extract company name, domain, and 6 signal-hunting queries
    analysis = await _analyze_input(llm, company)
    company_name: str = analysis.get("company_name", company)
    domain: Optional[str] = analysis.get("domain")
    search_queries: list[str] = analysis.get("search_queries", [])

    # Step 2 + 3 + logo — all in parallel
    async def _noop_str() -> str:
        return ""

    async def _noop_none() -> None:
        return None

    search_coro = _run_web_searches(search_queries) if search_queries else _noop_str()
    scrape_coro = _scrape_website(domain) if domain else _noop_str()
    logo_coro = _resolve_logo_url(domain) if domain else _noop_none()

    search_results, website_content, logo_url = await asyncio.gather(
        search_coro, scrape_coro, logo_coro
    )

    has_web_data = bool(search_results or website_content)

    # Step 4: Synthesise
    if has_web_data:
        chain = SYNTHESIS_PROMPT | llm
        llm_result = await chain.ainvoke({
            "company": company,
            "search_results": search_results or "No web search results available.",
            "website_content": website_content or "No website content available.",
            "context": context or "None provided",
        })
    else:
        chain = FALLBACK_PROMPT | llm
        llm_result = await chain.ainvoke({
            "company": company,
            "context": context or "None provided",
        })

    return ResearchResult(
        company_name=company_name,
        domain=domain,
        research=llm_result.content,
        logo_url=logo_url,
    )
