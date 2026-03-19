from pydantic_settings import BaseSettings


class Config(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://localhost:5432/polkadot_learnearn"

    # AI settings
    AI_PROVIDER: str = "gemini"
    AI_MODEL: str = "gemini-2.5-flash"
    GEMINI_API_KEY: str = ""

    # Blockchain settings
    NETWORK: str = "paseo"
    TX_SEARCH_MAX_BLOCKS: int = 50

    # Substrate RPC endpoint for transaction submission
    SUBSTRATE_RPC_URL: str = "wss://sys.ibp.network/asset-hub-paseo"

    # JWT settings
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ACCESS_TOKEN_TTL: int = 15  # minutes
    JWT_REFRESH_TOKEN_TTL: int = 10080  # minutes (7 days)
    JWT_ALGORITHM: str = "HS256"

    # Platform wallet – receives student payments, distributes to teachers
    PLATFORM_WALLET_SEED: str = ""  # 12- or 24-word mnemonic
    PLATFORM_WALLET_ADDRESS: str = ""  # SS58 address (derived or explicit)

    # Platform fee percentage (0.0 – 1.0)
    PLATFORM_FEE_RATE: float = 0.10  # 10%

    # Token decimals (Paseo = 10 decimals, 1 PAS = 10^10 planck)
    TOKEN_DECIMALS: int = 10

    model_config = {"env_file": ".env"}


settings = Config()
