from pydantic_settings import BaseSettings


class Config(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://localhost:5432/polkadot_learnearn"

    # Blockchain settings
    NETWORK: str = "paseo"
    DEFAULT_RECIPIENT_WALLET: str = "1RPK4brFegTGGKHFpjZ7jxZ3jiwCMyihhMFQomyzHAJfcUV"
    TX_SEARCH_MAX_BLOCKS: int = 50

    model_config = {"env_file": ".env"}


settings = Config()
