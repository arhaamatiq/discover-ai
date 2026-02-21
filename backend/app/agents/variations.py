import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.language_models import BaseChatModel


def _strip_json_fences(text: str) -> str:
    """Remove markdown code fences from JSON output."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
    return text.strip()


VARIATIONS_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a creative product strategist for Applied Engineering, a "
        "student-run software agency. Given a project idea and company context, "
        "generate 3 distinct variations of the idea. Each variation should take "
        "a meaningfully different approach — different scope, technology, or angle — "
        "while addressing the same underlying need.\n\n"
        "Return a JSON array of objects with keys: "
        '"title" (short project name), "description" (2-3 sentences).\n'
        "Return ONLY the JSON array, no markdown.",
    ),
    ("human", "{context}"),
])


async def generate_variations(llm: BaseChatModel, context: str) -> list[dict]:
    """Generate variations of a project idea."""
    chain = VARIATIONS_PROMPT | llm
    result = await chain.ainvoke({"context": context})
    return json.loads(_strip_json_fences(result.content))
