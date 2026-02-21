from langchain_core.prompts import ChatPromptTemplate
from langchain_core.language_models import BaseChatModel


CHAT_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a creative product strategist for Applied Engineering, a "
        "student-run software agency. You are having a conversation about a "
        "software project idea for a company. You have access to the company "
        "research and the original idea. Continue the conversation by answering "
        "the user's follow-up question thoughtfully. Be specific and actionable. "
        "Respond in 2-4 paragraphs.",
    ),
    ("human", "{context}"),
])


async def chat_followup(llm: BaseChatModel, context: str) -> str:
    """Generate a follow-up response given full conversation context."""
    chain = CHAT_PROMPT | llm
    result = await chain.ainvoke({"context": context})
    return result.content
