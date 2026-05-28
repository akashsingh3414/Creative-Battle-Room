import os

# Manual .env loader for zero-dependency environment variable parsing (KISS)
# Active shell env vars always override static .env values to satisfy standard engineering principles.
# Corrected nesting: backend/.env is three directories up from app/core/config.py
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                key_clean = key.strip()
                if key_clean not in os.environ:
                    os.environ[key_clean] = val.strip().strip('"').strip("'")

class Settings:
    PROJECT_NAME: str = "Prompt Arena"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./arena_battle.db")
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_cyberpunk_campaign_key_31337_!")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # AI Provider Configurations
    GROQ_API_KEY: str | None = os.getenv("GROQ_API_KEY")
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY")
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
    
    # Force Mock AI Provider
    FORCE_MOCK_AI: bool = os.getenv("FORCE_MOCK_AI", "false").lower() in ("true", "1", "yes")

settings = Settings()
