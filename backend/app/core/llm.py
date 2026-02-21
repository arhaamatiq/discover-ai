from typing import Optional

from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.language_models import BaseChatModel

from app.core.config import settings


def get_llm(provider: Optional[str] = None, streaming: bool = True) -> BaseChatModel:
    """Return a LangChain chat model for the given provider."""
    provider = provider or settings.default_llm_provider

    if provider == "openai":
        return ChatOpenAI(
            model="gpt-4o",
            api_key=settings.openai_api_key,
            streaming=streaming,
            temperature=0.7,
        )
    elif provider == "anthropic":
        return ChatAnthropic(
            model="claude-sonnet-4-5-20250929",
            api_key=settings.anthropic_api_key,
            streaming=streaming,
            temperature=0.7,
        )
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")
