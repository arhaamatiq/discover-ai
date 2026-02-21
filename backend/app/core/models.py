from typing import Optional

from pydantic import BaseModel


class DiscoverRequest(BaseModel):
    company: str
    summary: Optional[str] = None
    research: Optional[str] = None
    context: Optional[str] = None
    provider: Optional[str] = None
    logo_url: Optional[str] = None


class NodeData(BaseModel):
    id: str
    type: str  # "company" | "opportunity" | "idea" | "scope"
    label: str
    content: str
    parent_id: Optional[str] = None


class EdgeData(BaseModel):
    id: str
    source: str
    target: str


class DiscoverEvent(BaseModel):
    """A single SSE event sent to the frontend."""
    event: str  # "node" | "edge" | "update" | "done" | "error"
    data: dict
