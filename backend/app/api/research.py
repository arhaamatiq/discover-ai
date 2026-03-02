import logging
import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.llm import get_llm
from app.agents.research import research_company
from app.agents.disambiguate import disambiguate_company

router = APIRouter()
logger = logging.getLogger(__name__)


class ResearchRequest(BaseModel):
    company: str


class ResearchResponse(BaseModel):
    company: str
    summary: str
    research: str
    logo_url: Optional[str] = None


class DisambiguateRequest(BaseModel):
    company: str


class CandidateResponse(BaseModel):
    name: str
    domain: Optional[str] = None
    description: str
    logo_url: Optional[str] = None


class DisambiguateResponse(BaseModel):
    ambiguous: bool
    candidates: list[CandidateResponse]


def _extract_summary(research: str) -> str:
    """Pull a clean one-liner from the structured research brief."""
    overview = re.search(
        r"## Company Overview\n(.+?)(?:\n\n|\n##)", research, re.DOTALL
    )
    if overview:
        text = overview.group(1).strip()
        first = text.split(".")[0].strip() if "." in text else text[:150]
    else:
        first = research.split(".")[0].strip() if "." in research else research[:150]
    return first.replace("**", "").replace("*", "").replace("#", "").strip()


@router.post("/disambiguate", response_model=DisambiguateResponse)
async def disambiguate(req: DisambiguateRequest):
    """Quick check: does this company name match multiple notable companies?"""
    try:
        llm = get_llm(streaming=False)
        result = await disambiguate_company(llm, req.company)
        return DisambiguateResponse(
            ambiguous=result.ambiguous,
            candidates=[
                CandidateResponse(
                    name=c.name,
                    domain=c.domain,
                    description=c.description,
                    logo_url=c.logo_url,
                )
                for c in result.candidates
            ],
        )
    except ValueError as e:
        logger.warning("Disambiguate config error: %s", e)
        raise HTTPException(status_code=503, detail="LLM not configured.") from e
    except Exception as e:
        logger.exception("Disambiguate failed for company=%s", req.company)
        raise HTTPException(status_code=500, detail=str(e) or "Disambiguation failed.") from e


@router.post("/research", response_model=ResearchResponse)
async def research(req: ResearchRequest):
    """Research a company using web search + LLM synthesis."""
    try:
        llm = get_llm()
        result = await research_company(llm, req.company, "")
        return ResearchResponse(
            company=result.company_name,
            summary=_extract_summary(result.research),
            research=result.research,
            logo_url=result.logo_url,
        )
    except ValueError as e:
        logger.warning("Research config error: %s", e)
        raise HTTPException(
            status_code=503,
            detail="LLM not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in backend .env.",
        ) from e
    except Exception as e:
        logger.exception("Research failed for company=%s", req.company)
        raise HTTPException(
            status_code=500,
            detail=str(e) if str(e) else "Research failed. Check server logs.",
        ) from e
