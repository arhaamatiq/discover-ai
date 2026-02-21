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


OPPORTUNITIES_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a technology consultant for Applied Engineering, a student-run "
        "software agency. Based on a company research brief, identify 3-5 key "
        "opportunities where a software team could create value. Focus on "
        "realistic, impactful projects a talented student engineering team could "
        "deliver.\n\n"
        "Return a JSON array of objects with keys: "
        '"title" (short label), "description" (2-3 sentences).\n'
        "Return ONLY the JSON array, no markdown.",
    ),
    (
        "human",
        "Company research:\n{research}\n\nAdditional context from client: {context}",
    ),
])


async def identify_opportunities(
    llm: BaseChatModel, research: str, context: str = ""
) -> list[dict]:
    """Identify opportunities and return structured list."""
    chain = OPPORTUNITIES_PROMPT | llm
    result = await chain.ainvoke({
        "research": research,
        "context": context or "None provided",
    })
    return json.loads(_strip_json_fences(result.content))
