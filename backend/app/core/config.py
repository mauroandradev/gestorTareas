import os
from typing import List


def resolve_frontend_dir() -> str:
    """
    Busca inteligentemente el directorio del frontend compilado (dist)
    comprobando múltiples ubicaciones candidatas (producción Linux /home/tareas/..., 
    desarrollo local, variables de entorno, etc.).
    """
    env_path = os.getenv("FRONTEND_DIST_DIR")
    if env_path:
        env_candidates = [
            os.path.abspath(env_path),
            os.path.abspath(os.path.join(env_path, "dist")),
        ]
        for c in env_candidates:
            if os.path.isfile(os.path.join(c, "index.html")):
                return c
        if os.path.exists(env_path):
            return os.path.abspath(env_path)

    base_file = os.path.abspath(__file__)
    core_dir = os.path.dirname(base_file)             # .../backend/app/core
    app_dir = os.path.dirname(core_dir)               # .../backend/app
    backend_dir = os.path.dirname(app_dir)            # .../backend
    root_dir = os.path.dirname(backend_dir)           # .../ (project root)

    candidates = [
        # 1. Rutas exactas del servidor Linux /home/tareas
        "/home/tareas/frontend/dist",
        "/home/tareas/frontend",
        "/home/tareas/dist",
        
        # 2. Relativo a la raíz del repositorio (.../sistemaTareas o .../tareas)
        os.path.join(root_dir, "frontend", "dist"),
        os.path.join(root_dir, "frontend"),
        os.path.join(root_dir, "dist"),
        
        # 3. Relativo a backend/
        os.path.join(backend_dir, "frontend", "dist"),
        os.path.join(backend_dir, "frontend"),
        os.path.join(backend_dir, "dist"),
        
        # 4. Relativo al directorio de trabajo actual (CWD)
        os.path.join(os.getcwd(), "frontend", "dist"),
        os.path.join(os.getcwd(), "frontend"),
        os.path.join(os.getcwd(), "dist"),
        os.path.join(os.getcwd(), "..", "frontend", "dist"),
        os.path.join(os.getcwd(), "..", "frontend"),
    ]

    for candidate in candidates:
        candidate_abs = os.path.abspath(candidate)
        if os.path.isfile(os.path.join(candidate_abs, "index.html")):
            return candidate_abs

    # Fallback si aún no se ha compilado
    return os.path.abspath(os.path.join(root_dir, "frontend", "dist"))


class Settings:
    PROJECT_NAME: str = "Gestor de Tareas"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    API_PREFIX: str = "/api"

    # Default DB points to taskpulse_v4.db for continuity
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./taskpulse_v4.db")
    
    # Host y puerto configurables para producción / red LAN
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    @property
    def FRONTEND_DIST_DIR(self) -> str:
        return resolve_frontend_dir()

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://10.100.1.203:8000",
        "http://10.100.1.203:5173",
        "http://10.100.1.203:3000",
        "*",
    ]


settings = Settings()
