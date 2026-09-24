from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate, TaskResponse
from ..services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["Tareas"])


@router.get("", response_model=List[TaskResponse], summary="Listar tareas con filtros")
def get_tasks(
    search: Optional[str] = Query(None, description="Buscar en título, descripción, responsable o proyecto"),
    status_filter: Optional[str] = Query(None, alias="status", description="Pendiente, En Progreso, Completada"),
    priority: Optional[str] = Query(None, description="Baja, Media, Alta, Urgente"),
    project: Optional[str] = Query(None, description="Filtrar por proyecto"),
    assignee: Optional[str] = Query(None, description="Filtrar por responsable"),
    from_date: Optional[str] = Query(None, description="Fecha límite desde (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Fecha límite hasta (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """Listar todas las tareas con filtros opcionales de estado, prioridad, proyecto y fechas."""
    return TaskService.get_tasks(
        db=db,
        search=search,
        status=status_filter,
        priority=priority,
        project=project,
        assignee=assignee,
        from_date=from_date,
        to_date=to_date
    )


@router.get("/{task_id}", response_model=TaskResponse, summary="Obtener tarea por ID")
def get_task(task_id: int, db: Session = Depends(get_db)):
    """Obtener detalle de una tarea."""
    task = TaskService.get_task_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    return task


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear nueva tarea"
)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db)):
    """Crear una nueva tarea vinculada a un proyecto."""
    return TaskService.create_task(db, task_in)


@router.put("/{task_id}", response_model=TaskResponse, summary="Actualizar tarea")
def update_task(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db)):
    """Actualizar datos de una tarea."""
    task = TaskService.update_task(db, task_id, task_in)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    return task


@router.patch("/{task_id}/status", response_model=TaskResponse, summary="Cambio rápido de estado")
def update_task_status(task_id: int, status_in: TaskStatusUpdate, db: Session = Depends(get_db)):
    """Cambio rápido de estado (Pendiente / En Progreso / Completada)."""
    task = TaskService.update_status(db, task_id, status_in)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    return task


@router.delete("/{task_id}", summary="Eliminar tarea")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Eliminar una tarea del sistema."""
    success = TaskService.delete_task(db, task_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    return {"status": "success", "message": f"Tarea {task_id} eliminada correctamente"}
