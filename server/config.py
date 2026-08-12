import os

class Settings:
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    DB_PATH: str = os.getenv("DB_PATH", "collab_editor.db")
    SNAPSHOT_INTERVAL: int = int(os.getenv("SNAPSHOT_INTERVAL", 50))
    PRESENCE_THROTTLE_MS: int = int(os.getenv("PRESENCE_THROTTLE_MS", 50))
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

settings = Settings()
