from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.llm import get_llm
from app.agents.chat import chat_followup

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    prompt: str
    history: list
    research_context: str
    provider: Optional[str] = None


class ChatResponse(BaseModel):
    content: str


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Follow-up chat on an idea card."""
    # Build context string from history
    parts = [f"Company Research:\n{req.research_context}"]
    for msg in req.history:
        label = "User" if msg.get("role") == "user" else "Assistant"
        parts.append(f"{label}: {msg.get('content', '')}")
    parts.append(f"User: {req.prompt}")
    context = "\n\n".join(parts)

    llm = get_llm(req.provider)
    response = await chat_followup(llm, context)
    return ChatResponse(content=response)
