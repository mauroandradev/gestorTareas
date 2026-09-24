import os
from typing import List


class Settings:
    PROJECT_NAME: str = "TaskPulse API - Gestor de Tareas de Equipo"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    API_PREFIX: str = "/api"

    # Default DB points to taskpulse_v4.db for continuity
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./taskpulse_v4.db")

    # Path to the compiled frontend dist directory
    FRONTEND_DIST_DIR: str = os.getenv(
        "FRONTEND_DIST_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "dist"))
    )

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*",
    ]


settings = Settings()
