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


SCOPING_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a project scoping expert for Applied Engineering, a student-run "
        "software agency. Given a project idea, estimate its scope.\n\n"
        "Return a JSON object with keys: "
        '"complexity" ("Low" | "Medium" | "High"), '
        '"timeline" (estimated weeks, e.g. "4-6 weeks"), '
        '"team_size" (recommended number of engineers), '
        '"key_milestones" (array of 3-4 milestone strings).\n'
        "Return ONLY the JSON object, no markdown.",
    ),
    ("human", "Project idea:\n{idea}"),
])


async def scope_project(llm: BaseChatModel, idea: str) -> dict:
    """Scope a project idea and return estimates."""
    chain = SCOPING_PROMPT | llm
    result = await chain.ainvoke({"idea": idea})
    return json.loads(_strip_json_fences(result.content))
