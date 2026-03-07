from pydantic_settings import BaseSettings


class Config(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://localhost:5432/polkadot_learnearn"

    # CORS – comma-separated allowed origins
    CORS_ORIGINS: str = "http://localhost:3000"

    # AI settings
    AI_PROVIDER: str = "gemini"
    AI_MODEL: str = "gemini-2.5-flash"
    GEMINI_API_KEY: str = ""

    # Blockchain settings
    NETWORK: str = "paseo"
    TX_SEARCH_MAX_BLOCKS: int = 50

    model_config = {"env_file": ".env"}


settings = Config()
