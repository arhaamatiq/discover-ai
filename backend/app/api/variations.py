from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.llm import get_llm
from app.agents.variations import generate_variations

router = APIRouter()


class VariationsRequest(BaseModel):
    idea_title: str
    idea_description: str
    research_context: str
    history: list = []
    provider: Optional[str] = None


class VariationItem(BaseModel):
    title: str
    description: str


class VariationsResponse(BaseModel):
    variations: list[VariationItem]


@router.post("/variations", response_model=VariationsResponse)
async def variations(req: VariationsRequest):
    """Generate variations of a project idea."""
    # Build context string
    parts = [f"Company Research:\n{req.research_context}"]
    for msg in req.history:
        label = "User" if msg.get("role") == "user" else "Assistant"
        parts.append(f"{label}: {msg.get('content', '')}")
    parts.append(
        f"Current Idea:\nTitle: {req.idea_title}\n"
        f"Description: {req.idea_description}"
    )
    context = "\n\n".join(parts)

    llm = get_llm(req.provider)
    items = await generate_variations(llm, context)
    return VariationsResponse(
        variations=[VariationItem(**item) for item in items]
    )
