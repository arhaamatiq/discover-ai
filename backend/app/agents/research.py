from langchain_core.prompts import ChatPromptTemplate
from langchain_core.language_models import BaseChatModel


RESEARCH_PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are a company research analyst. Given a company name or website, "
        "produce a concise research brief covering: what the company does, their "
        "industry, approximate size, target market, tech stack (if known), and "
        "key business challenges. Be factual and concise. If the input is vague, "
        "make reasonable inferences and note assumptions.",
    ),
    ("human", "Company: {company}\n\nAdditional context: {context}"),
])


async def research_company(
    llm: BaseChatModel, company: str, context: str = ""
) -> str:
    """Research a company and return a structured brief."""
    chain = RESEARCH_PROMPT | llm
    result = await chain.ainvoke({"company": company, "context": context or "None provided"})
    return result.content
