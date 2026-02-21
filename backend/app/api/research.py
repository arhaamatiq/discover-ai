import re
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate

from app.core.llm import get_llm
from app.agents.research import research_company

router = APIRouter()


class ResearchRequest(BaseModel):
    company: str


class ResearchResponse(BaseModel):
    company: str
    summary: str
    research: str
    logo_url: Optional[str] = None


DOMAIN_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "Given a company name or description, return ONLY the company's primary "
        "website domain (e.g. 'apple.com', 'stripe.com'). No protocol, no path, "
        "just the bare domain. If you cannot determine it, return 'unknown'.",
    ),
    ("human", "{company}"),
])


async def _get_logo_url(llm, company: str) -> Optional[str]:
    """Ask the LLM for the company domain, then build a Clearbit logo URL."""
    try:
        chain = DOMAIN_PROMPT | llm
        result = await chain.ainvoke({"company": company})
        domain = result.content.strip().lower()
        # Basic validation — must look like a domain
        if domain == "unknown" or not re.match(r"^[a-z0-9.-]+\.[a-z]{2,}$", domain):
            return None
        return f"https://logo.clearbit.com/{domain}"
    except Exception:
        return None


@router.post("/research", response_model=ResearchResponse)
async def research(req: ResearchRequest):
    """Research a company and return a structured brief."""
    llm = get_llm()
    full_research = await research_company(llm, req.company, "")

    # Extract one-liner summary (first sentence)
    summary = full_research.split(".")[0].strip() if "." in full_research else full_research[:100]
    # Clean up markdown bold markers if present
    summary = summary.replace("**", "").replace("*", "")

    # Get company logo
    logo_url = await _get_logo_url(llm, req.company)

    return ResearchResponse(
        company=req.company,
        summary=summary,
        research=full_research,
        logo_url=logo_url,
    )
