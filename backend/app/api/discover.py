import json
import uuid
from typing import AsyncGenerator, Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.llm import get_llm
from app.core.models import DiscoverRequest
from app.agents.research import research_company
from app.agents.opportunities import identify_opportunities

router = APIRouter()


def sse_event(event: str, data: dict) -> str:
    """Format a Server-Sent Event."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def run_discovery(
    company: str,
    summary: Optional[str],
    research: Optional[str],
    context: str,
    provider: Optional[str],
    logo_url: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Orchestration pipeline that yields SSE events as nodes/edges are created."""
    try:
        llm = get_llm(provider)
        company_node_id = str(uuid.uuid4())

        # Use pre-researched data if available, otherwise research now
        if research:
            final_research = research
            final_summary = summary or (research.split(".")[0] if "." in research else research[:100])
        else:
            yield sse_event("status", {"message": "Researching company..."})
            result = await research_company(llm, company, context)
            final_research = result.research
            final_summary = final_research.split(".")[0] if "." in final_research else final_research[:100]

        # Clean up markdown
        final_summary = final_summary.replace("**", "").replace("*", "").strip()

        # Emit company header node
        node_data = {
            "id": company_node_id,
            "type": "company-header",
            "label": company,
            "content": final_summary,
        }
        if logo_url:
            node_data["logo_url"] = logo_url
        yield sse_event("node", node_data)

        # Generate ideas from research
        yield sse_event("status", {"message": "Generating ideas..."})
        opportunities = await identify_opportunities(llm, final_research, context)

        # Emit idea cards
        for opp in opportunities:
            idea_id = str(uuid.uuid4())
            yield sse_event("node", {
                "id": idea_id,
                "type": "idea-card",
                "label": opp.get("title", "Untitled"),
                "content": opp.get("description", ""),
            })
            yield sse_event("edge", {
                "id": str(uuid.uuid4()),
                "source": company_node_id,
                "target": idea_id,
            })

        yield sse_event("done", {"message": "Discovery complete"})

    except Exception as e:
        yield sse_event("error", {"message": "Discovery failed: {}".format(str(e))})
        yield sse_event("done", {"message": "Discovery complete"})


@router.post("/discover")
async def discover(req: DiscoverRequest):
    """SSE endpoint that streams discovery results as nodes and edges."""
    return StreamingResponse(
        run_discovery(
            req.company,
            req.summary,
            req.research,
            req.context or "",
            req.provider,
            req.logo_url,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
