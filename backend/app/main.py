import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .core.config import settings
from .core.database import engine, Base, SessionLocal
from .db.seed import seed_initial_data
from .api.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager to create tables and seed initial data on startup."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(api_router)


# Health check endpoint
@app.get("/health", tags=["Salud"])
def health_check():
    return {"status": "ok", "version": settings.VERSION, "service": settings.PROJECT_NAME}


# -----------------------------------------------------------------------------
# Static Frontend Serving (SPA fallback from npm run build / dist)
# -----------------------------------------------------------------------------
dist_dir = settings.FRONTEND_DIST_DIR
assets_dir = os.path.join(dist_dir, "assets")

# Mount /assets if the directory exists in dist
if os.path.isdir(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")


@app.get("/", include_in_schema=False)
async def serve_root():
    """Serve index.html at root."""
    index_file = os.path.join(dist_dir, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    return {
        "message": "Frontend build no encontrado en dist/. Por favor ejecuta 'npm run build' en la carpeta frontend.",
        "dist_path": dist_dir
    }


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa_and_static(full_path: str):
    """
    Serve static files if found in dist/, or fallback to index.html for SPA routes.
    Preserves 404 for missing API/docs endpoints.
    """
    # Exclude API, docs and system paths so they don't get trapped by SPA fallback
    api_prefixes = ("api/", "docs", "redoc", "openapi.json", "health")
    if any(full_path.startswith(prefix) for prefix in api_prefixes):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recurso API no encontrado: /{full_path}"
        )

    # 1. Check if the exact requested file exists in dist/ (e.g. favicon.ico, vite.svg)
    requested_file = os.path.join(dist_dir, full_path)
    if os.path.isfile(requested_file):
        return FileResponse(requested_file)

    # 2. SPA fallback to index.html for client-side routing
    index_file = os.path.join(dist_dir, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)

    return {
        "message": "Frontend build no encontrado en dist/. Por favor ejecuta 'npm run build' en la carpeta frontend.",
        "dist_path": dist_dir
    }
