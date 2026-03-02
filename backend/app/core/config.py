from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    tavily_api_key: str = ""
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    host: str = "0.0.0.0"
    port: int = 8000
    default_llm_provider: str = "openai"  # "openai" or "anthropic"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
