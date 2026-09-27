from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./block_planning.db"
    SECRET_KEY: str = "super_secret_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    APP_NAME: str = "SIH26027 AI-Powered Block Planning System"
    VERSION: str = "1.0.0"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    DATA_GOV_IN_API_KEY: str = ""
    DATA_GOV_IN_RESOURCE_IDS: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
