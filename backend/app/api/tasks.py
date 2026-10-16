from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.deps import get_current_user, require_admin, is_admin_user
from ..models.user import User
from ..schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate, TaskResponse
from ..services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["Tareas"])


class DeleteRequestResponse(BaseModel):
    id: int
    task_id: int
    task_title: str
    project: Optional[str] = None
    requested_by: str
    status: str
    resolved_by: Optional[str] = None
    created_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


@router.get("/delete-requests", response_model=List[DeleteRequestResponse], summary="Listar solicitudes de eliminación (Admin)")
def list_delete_requests(
    is_admin: bool = Query(False, description="(Ignorado) se usa el rol del token"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return TaskService.get_delete_requests(db)


@router.post("/delete-requests/{request_id}/approve", response_model=DeleteRequestResponse, summary="Aprobar eliminación (Admin)")
def approve_delete_request(
    request_id: int,
    admin_name: str = Query("", description="(Ignorado) se usa el usuario del token"),
    is_admin: bool = Query(False, description="(Ignorado) se usa el rol del token"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    try:
        req = TaskService.resolve_delete_request(db, request_id, True, admin.name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")
    return req


@router.post("/delete-requests/{request_id}/reject", response_model=DeleteRequestResponse, summary="Rechazar eliminación (Admin)")
def reject_delete_request(
    request_id: int,
    admin_name: str = Query("", description="(Ignorado) se usa el usuario del token"),
    is_admin: bool = Query(False, description="(Ignorado) se usa el rol del token"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    try:
        req = TaskService.resolve_delete_request(db, request_id, False, admin.name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada")
    return req


@router.get("", response_model=List[TaskResponse], summary="Listar tareas con filtros")
def get_tasks(
    search: Optional[str] = Query(None, description="Buscar en título, descripción, responsable o proyecto"),
    status_filter: Optional[str] = Query(None, alias="status", description="Pendiente, En Progreso, Completada"),
    priority: Optional[str] = Query(None, description="Baja, Media, Alta, Urgente"),
    project: Optional[str] = Query(None, description="Filtrar por proyecto"),
    assignee: Optional[str] = Query(None, description="Filtrar por responsable"),
    from_date: Optional[str] = Query(None, description="Fecha límite desde (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Fecha límite hasta (YYYY-MM-DD)"),
    user_name: Optional[str] = Query(None, description="(Ignorado) se usa el usuario del token"),
    is_admin: bool = Query(False, description="(Ignorado) se usa el rol del token"),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
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
        to_date=to_date,
        user_name=current.name,
        is_admin=is_admin_user(current)
    )


@router.get("/{task_id}", response_model=TaskResponse, summary="Obtener tarea por ID")
def get_task(task_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
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
def create_task(task_in: TaskCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Crear una nueva tarea vinculada a un proyecto."""
    try:
        return TaskService.create_task(db, task_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{task_id}", response_model=TaskResponse, summary="Actualizar tarea")
def update_task(task_id: int, task_in: TaskUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Actualizar datos de una tarea."""
    try:
        task = TaskService.update_task(db, task_id, task_in)
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
        return task
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{task_id}/status", response_model=TaskResponse, summary="Cambio rápido de estado")
def update_task_status(task_id: int, status_in: TaskStatusUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Cambio rápido de estado (Pendiente / En Progreso / Completada)."""
    task = TaskService.update_status(db, task_id, status_in)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    return task


@router.post("/{task_id}/delete-request", response_model=DeleteRequestResponse, summary="Solicitar eliminación de tarea")
def request_task_deletion(
    task_id: int,
    requested_by: Optional[str] = Query(None, description="(Ignorado) se usa el usuario del token"),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Los usuarios no administradores solicitan la eliminación; un Administrador debe aprobarla."""
    try:
        return TaskService.create_delete_request(db, task_id, current.name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{task_id}", summary="Eliminar tarea")
def delete_task(
    task_id: int,
    is_admin: bool = Query(False, description="(Ignorado) se usa el rol del token"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Eliminar una tarea del sistema (solo Administrador autenticado)."""
    success = TaskService.delete_task(db, task_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tarea no encontrada")
    return {"status": "success", "message": f"Tarea {task_id} eliminada correctamente"}

