import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Optional

import httpx
from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class CompanyCandidate:
    name: str
    domain: Optional[str]
    description: str
    logo_url: Optional[str] = None


@dataclass
class DisambiguationResult:
    ambiguous: bool
    candidates: list[CompanyCandidate]


DISAMBIGUATE_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a company identification assistant. Given a user query and web search "
        "results, determine whether the query unambiguously refers to a single well-known "
        "company, or whether there are multiple notable companies that could match.\n\n"
        "A query is UNAMBIGUOUS when:\n"
        "- The name is distinctive (e.g. 'Stripe', 'Airbnb', 'Snowflake')\n"
        "- A domain or URL was provided\n"
        "- Additional context makes the identity clear\n\n"
        "A query is AMBIGUOUS when:\n"
        "- Multiple notable companies share the same or very similar names\n"
        "- The name is a common English word used by several businesses "
        "(e.g. 'Mercury', 'Notion', 'Figma' are NOT ambiguous because they dominate; "
        "'Bolt', 'Hive', 'Beam' could be ambiguous)\n\n"
        "Return ONLY valid JSON (no markdown fences):\n"
        '{{"ambiguous": true/false, "candidates": [\n'
        '  {{"name": "Full Company Name", "domain": "example.com", '
        '"description": "One-sentence description of what they do"}}\n'
        "]}}\n\n"
        "Rules:\n"
        "- If unambiguous, return exactly 1 candidate\n"
        "- If ambiguous, return 2-5 of the most notable/likely candidates\n"
        "- Always include domain if you can determine it\n"
        "- Descriptions should be concise (under 15 words)\n"
        "- Focus on notable, currently-operating companies\n"
        "- If the user clearly provided a domain or URL, treat as unambiguous",
    ),
    (
        "human",
        "User input: {input}\n\n"
        "--- WEB SEARCH RESULTS ---\n{search_results}",
    ),
])


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
    return text.strip()


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


async def _resolve_logo_url(domain: str) -> Optional[str]:
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


async def disambiguate_company(
    llm: BaseChatModel, user_input: str
) -> DisambiguationResult:
    """Determine if a company name is ambiguous and return candidates."""

    import re
    has_url = bool(re.search(r"https?://|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}", user_input))
    if has_url:
        # Domain/URL provided — skip disambiguation entirely, treat as unambiguous
        # Extract domain for logo
        url_match = re.search(r"https?://([^\s/]+)", user_input)
        if url_match:
            domain = url_match.group(1).lower().lstrip("www.")
        else:
            domain_match = re.search(
                r"\b([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)\b",
                user_input,
            )
            domain = domain_match.group(1).lower() if domain_match else None
        logo = await _resolve_logo_url(domain) if domain else None
        return DisambiguationResult(
            ambiguous=False,
            candidates=[CompanyCandidate(
                name=user_input.strip(),
                domain=domain,
                description="",
                logo_url=logo,
            )],
        )

    search_query = f"{user_input.strip()} company"
    results = await _tavily_search(search_query, max_results=8)
    search_text = "\n\n".join(
        f"Title: {r.get('title', '')}\nURL: {r.get('url', '')}\n"
        f"Content: {r.get('content', '')}"
        for r in results
    ) if results else "No search results available."

    chain = DISAMBIGUATE_PROMPT | llm
    llm_result = await chain.ainvoke({
        "input": user_input,
        "search_results": search_text,
    })

    try:
        parsed = json.loads(_strip_json_fences(llm_result.content))
    except (json.JSONDecodeError, Exception):
        return DisambiguationResult(
            ambiguous=False,
            candidates=[CompanyCandidate(
                name=user_input.strip(),
                domain=None,
                description="",
            )],
        )

    raw_candidates = parsed.get("candidates", [])
    is_ambiguous = parsed.get("ambiguous", False) and len(raw_candidates) > 1

    logo_tasks = [
        _resolve_logo_url(c.get("domain")) for c in raw_candidates
    ]
    logos = await asyncio.gather(*logo_tasks, return_exceptions=True)

    candidates = []
    for i, c in enumerate(raw_candidates):
        logo = logos[i] if not isinstance(logos[i], Exception) else None
        candidates.append(CompanyCandidate(
            name=c.get("name", user_input),
            domain=c.get("domain"),
            description=c.get("description", ""),
            logo_url=logo,
        ))

    return DisambiguationResult(
        ambiguous=is_ambiguous,
        candidates=candidates,
    )
