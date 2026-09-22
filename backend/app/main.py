import os
import uuid
from typing import List, Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .database import engine, Base, get_db, SessionLocal
from .models import Task, User
from .schemas import (
    TaskCreate, TaskUpdate, TaskStatusUpdate,
    TaskResponse, TaskStatsResponse,
    UserCreate, UserUpdate, UserResponse, UserLogin, LoginResponse
)
from .controllers import task_controller, user_controller
from .seed import seed_initial_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables & initial seed
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_data(db)
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

# ----------------- AUTH & USER MANAGEMENT ENDPOINTS -----------------

@app.post("/api/auth/login", response_model=LoginResponse, tags=["Autenticación"])
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Iniciar sesión con correo electrónico y contraseña."""
    user = user_controller.authenticate(db, credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas o usuario inactivo"
        )
    
    # Generar token de sesión
    token = f"taskpulse_{user.id}_{uuid.uuid4().hex[:16]}"
    return {
        "user": user,
        "token": token,
        "message": f"Bienvenido, {user.name}"
    }

@app.get("/api/auth/users", response_model=List[UserResponse], tags=["Usuarios"])
def get_users(db: Session = Depends(get_db)):
    """Listar todos los usuarios registrados en el sistema."""
    return user_controller.get_users(db)

@app.post("/api/auth/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED, tags=["Usuarios"])
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """Crear un nuevo usuario y asignar su rol (Función de Administrador)."""
    try:
        return user_controller.create_user(db, user_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.put("/api/auth/users/{user_id}", response_model=UserResponse, tags=["Usuarios"])
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db)):
    """Actualizar datos, rol o contraseña de un usuario (Función de Administrador)."""
    try:
        user = user_controller.update_user(db, user_id, user_in)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.delete("/api/auth/users/{user_id}", tags=["Usuarios"])
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Eliminar un usuario del sistema (Función de Administrador)."""
    try:
        success = user_controller.delete_user(db, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        return {"status": "success", "message": f"Usuario {user_id} eliminado exitosamente"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

# ----------------- TASK ENDPOINTS -----------------

@app.get("/api/tasks", response_model=List[TaskResponse], tags=["Tareas"])
def get_tasks(
    search: Optional[str] = Query(None, description="Buscar en título, descripción, responsable o proyecto"),
    status: Optional[str] = Query(None, description="Pendiente, En Progreso, Completada"),
    priority: Optional[str] = Query(None, description="Baja, Media, Alta, Urgente"),
    project: Optional[str] = Query(None, description="Filtrar por proyecto"),
    assignee: Optional[str] = Query(None, description="Filtrar por responsable"),
    from_date: Optional[str] = Query(None, description="Fecha límite desde (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Fecha límite hasta (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """Listar todas las tareas con filtros opcionales de estado, prioridad, proyecto y fechas."""
    return task_controller.get_tasks(
        db=db,
        search=search,
        status=status,
        priority=priority,
        project=project,
        assignee=assignee,
        from_date=from_date,
        to_date=to_date
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
