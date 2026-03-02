import json
import logging

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.language_models import BaseChatModel

logger = logging.getLogger(__name__)

_AE_CONSTRAINTS = (
    "AE project constraints: 4–6 student engineers, ~14-week semester delivery, "
    "open-source or free-tier stack. Never suggest anything touching production "
    "customer data, core product logic, security infrastructure, or regulated data "
    "(HIPAA, PCI, GDPR). Each variation must be independently achievable within "
    "these constraints."
)


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
    return text.strip()


VARIATIONS_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a product strategist for Applied Engineering (AE), a student software "
        "agency at SJSU. Given a project idea and company context, generate 3 distinct "
        "variations of the idea.\n\n"
        + _AE_CONSTRAINTS + "\n\n"
        "Each variation must take a meaningfully different approach:\n"
        "- Variation 1: Narrower scope, fastest to ship, most conservative\n"
        "- Variation 2: Different technology angle or AI/automation layer\n"
        "- Variation 3: Broader vision, more ambitious, still within 14-week scope\n\n"
        "For each variation:\n"
        '- "title": Action-oriented, outcome-referenced name (not generic)\n'
        '- "description": 4–5 sentences covering: what makes this variation distinct, '
        "what it builds, who the user persona is, the key tech approach, and "
        "one sentence on why a student team can deliver it.\n\n"
        'Return ONLY a JSON array of objects with "title" and "description". '
        "No markdown.",
    ),
    ("human", "{context}"),
])


async def generate_variations(llm: BaseChatModel, context: str) -> list[dict]:
    """Generate 3 distinct variations of a project idea."""
    chain = VARIATIONS_PROMPT | llm
    result = await chain.ainvoke({"context": context})
    raw = _strip_json_fences(result.content)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Variations JSON parse failed, attempting recovery.")
        match = raw[raw.find("["):raw.rfind("]") + 1] if "[" in raw and "]" in raw else ""
        return json.loads(match) if match else []
