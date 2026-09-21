import os
from typing import List, Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .database import engine, Base, get_db, SessionLocal
from .models import Task
from .schemas import (
    TaskCreate, TaskUpdate, TaskStatusUpdate,
    TaskResponse, TaskStatsResponse
)
from .controllers import task_controller
from .seed import seed_initial_tasks

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables & initial seed
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_tasks(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="Gestor de Tareas de Equipo - MVP",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- API ENDPOINTS -----------------

@app.get("/api/tasks", response_model=List[TaskResponse], tags=["Tareas"])
def get_tasks(
    search: Optional[str] = Query(None, description="Buscar en título, descripción, responsable o proyecto"),
    status: Optional[str] = Query(None, description="Pendiente, En Progreso, Completada"),
    priority: Optional[str] = Query(None, description="Baja, Media, Alta, Urgente"),
    project: Optional[str] = Query(None, description="Filtrar por proyecto"),
    assignee: Optional[str] = Query(None, description="Filtrar por responsable"),
    db: Session = Depends(get_db)
):
    """Listar todas las tareas con filtros opcionales."""
    return task_controller.get_tasks(
        db=db,
        search=search,
        status=status,
        priority=priority,
        project=project,
        assignee=assignee
    )

@app.get("/api/tasks/{task_id}", response_model=TaskResponse, tags=["Tareas"])
def get_task(task_id: int, db: Session = Depends(get_db)):
    """Obtener detalle de una tarea."""
    task = task_controller.get_task_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return task

@app.post("/api/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED, tags=["Tareas"])
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    """Crear una nueva tarea vinculada a un proyecto."""
    return task_controller.create_task(db, task_in)

@app.put("/api/tasks/{task_id}", response_model=TaskResponse, tags=["Tareas"])
def update_task(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db)):
    """Actualizar datos de una tarea."""
    task = task_controller.update_task(db, task_id, task_in)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return task

@app.patch("/api/tasks/{task_id}/status", response_model=TaskResponse, tags=["Tareas"])
def update_task_status(task_id: int, status_in: TaskStatusUpdate, db: Session = Depends(get_db)):
    """Cambio rápido de estado (Pendiente / En Progreso / Completada)."""
    task = task_controller.update_status(db, task_id, status_in)
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return task

@app.delete("/api/tasks/{task_id}", tags=["Tareas"])
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Eliminar una tarea."""
    success = task_controller.delete_task(db, task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return {"status": "success", "message": f"Tarea {task_id} eliminada correctamente"}

@app.get("/api/stats", response_model=TaskStatsResponse, tags=["Métricas"])
def get_stats(db: Session = Depends(get_db)):
    """Obtener resumen numérico de tareas y proyectos."""
    return task_controller.get_stats(db)

# ----------------- FRONTEND SERVING -----------------
dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
assets_dir = os.path.join(dist_dir, "assets")

if os.path.exists(dist_dir):
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", tags=["Frontend"])
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc"):
            return None
        index_file = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend build no encontrado"}
