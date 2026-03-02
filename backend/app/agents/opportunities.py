import json
import logging

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.language_models import BaseChatModel

logger = logging.getLogger(__name__)

from app.core.guidelines import get_guidelines


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
    return text.strip()


# Build the system prompt. {guidelines} is filled at request time so edits to
# guidelines.md apply without restart. {research} and {context} in the human message.
_SYSTEM = (
    "You are the ideation engine for Applied Engineering (AE), a student software "
    "agency at San Jose State University. AE pitches and delivers software projects "
    "to companies. Your output feeds directly into client pitches — this is not a "
    "brainstorm, it is a sales asset.\n\n"
    "Your core rule: make the company feel SEEN, not sold to. Every idea must start "
    "from a specific, observable signal and work backward to a bounded deliverable.\n\n"
    "=== AE IDEATION GUIDELINES ===\n"
    "{guidelines}\n"
    "=== END GUIDELINES ===\n\n"
    "TASK\n"
    "Using the company research brief below, generate 4–5 project pitches.\n\n"
    "OUTPUT FORMAT\n"
    "Return ONLY a valid JSON array. Each object has exactly two keys:\n\n"
    '"title": Project name following the naming conventions in the guidelines.\n'
    "  - Action-oriented, outcome-referenced, specific\n"
    '  - Good: "Acquisition Data Bridge", "AI Evaluation Workbench"\n'
    '  - Bad: "Dashboard", "Data Tool", "Internal App"\n\n'
    '"description": A structured pitch. Use a single newline between sections (no blank lines). '
    "Format: each label on its own line, then the content on the next line(s), then one newline before the next label.\n\n"
    "Signal:\n"
    "[1–2 sentences: the specific company event/news that makes this relevant NOW. If no signal, anchor to the clearest business pain.]\n"
    "Problem:\n"
    "[2–3 sentences: who feels this pain, what breaks for them, why it hasn't been solved internally.]\n"
    "What we build:\n"
    "[2–3 sentences. Use: \"A [deliverable type] that lets [persona] [accomplish action] without [current painful workaround].\"]\n"
    "Why a student team:\n"
    "[1–2 sentences: scope is right — modular, non-production, independent of core systems, standard stack.]\n"
    "Innovation angle:\n"
    "[1 sentence: tie to a current tech trend — agentic AI, RAG, AI eval, data mesh, LLM doc intelligence, multimodal.]\n"
    "Version 0:\n"
    "[1 sentence: position as a prototype the company can evaluate before staffing it internally.]\n\n"
    "Escape newlines in the JSON string as \\n. Do not use markdown (no ** or ##) in the description.\n\n"
    "ORDERING (by conversion likelihood)\n"
    "1. Most tightly tied to a recent, specific, named signal\n"
    "2. Most technically forward-looking / highest innovation angle\n"
    "3. Most conservative / lowest risk / easiest Green Zone pitch\n"
    "4–5. Additional high-quality pitches\n\n"
    "ZONE RULES\n"
    "- Lead with Green Zone ideas\n"
    "- Yellow Zone only when there is a strong signal AND you note the caveat\n"
    "- Never Red Zone\n"
    "- If no signals were found, generate 4–5 strong ideas from business model analysis\n\n"
    "Return ONLY the JSON array. No markdown fences, no explanation, no preamble."
)

OPPORTUNITIES_PROMPT = ChatPromptTemplate.from_messages([
    ("system", _SYSTEM),
    (
        "human",
        "Company research brief:\n{research}\n\n"
        "Additional context from client: {context}",
    ),
])


async def identify_opportunities(
    llm: BaseChatModel, research: str, context: str = ""
) -> list[dict]:
    """Generate signal-first project pitches following AE guidelines."""
    guidelines = get_guidelines()
    if not guidelines:
        guidelines = "(Guidelines file not found — use best judgment.)"
    # Escape braces so LangChain doesn't treat { } in guidelines as template variables.
    guidelines_safe = guidelines.replace("{", "{{").replace("}", "}}")
    chain = OPPORTUNITIES_PROMPT | llm
    result = await chain.ainvoke({
        "guidelines": guidelines_safe,
        "research": research,
        "context": context or "None provided",
    })
    raw = _strip_json_fences(result.content)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Best-effort recovery: find the JSON array in the response
        logger.warning("JSON parse failed, attempting recovery. Raw: %s", raw[:200])
        match = raw[raw.find("["):raw.rfind("]") + 1] if "[" in raw and "]" in raw else ""
        return json.loads(match) if match else []
