import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# Load .env if present
env_path = BASE_DIR.parent / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k not in os.environ:
                    os.environ[k] = v

class Settings(BaseModel):
    app_name: str = "SeamIT"
    app_version: str = "1.0.0"
    app_description: str = "The SMB ITSM-ITAM Bridge & Automation Seam Filler"
    database_url: str = os.getenv("DATABASE_URL", str(DATA_DIR / "seamit.db"))
    cors_origins: list[str] = ["*"]
    scheduler_enabled: bool = True
    scheduler_interval_seconds: int = 300  # checks every 5 minutes in background
    mock_connector_latency_ms: int = 200

settings = Settings()
