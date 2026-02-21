import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.language_models import BaseChatModel


def _strip_json_fences(text: str) -> str:
    """Remove markdown code fences from JSON output."""
    text = text.strip()
    if text.startswith("```"):
        # Remove opening fence line (e.g., ```json\n)
        text = text.split("\n", 1)[-1]
        # Remove closing fence
        text = text.rsplit("```", 1)[0]
    return text.strip()


IDEATION_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a creative product strategist for Applied Engineering, a "
        "student-run software agency. Given an opportunity area, generate 1-2 "
        "concrete project ideas that a student engineering team could build.\n\n"
        "Each idea should be specific and actionable. Return a JSON array of "
        "objects with keys: "
        '"title" (project name), "description" (what it does, 2-3 sentences), '
        '"tech_stack" (array of technologies).\n'
        "Return ONLY the JSON array, no markdown.",
    ),
    (
        "human",
        "Company context:\n{research}\n\nOpportunity:\n{opportunity}",
    ),
])


async def generate_ideas(
    llm: BaseChatModel, research: str, opportunity: str
) -> list[dict]:
    """Generate project ideas for a given opportunity."""
    chain = IDEATION_PROMPT | llm
    result = await chain.ainvoke({
        "research": research,
        "opportunity": opportunity,
    })
    return json.loads(_strip_json_fences(result.content))
