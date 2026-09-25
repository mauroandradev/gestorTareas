from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..schemas.task import TaskStatsResponse
from ..services.task_service import TaskService

router = APIRouter(prefix="/stats", tags=["Métricas y Estadísticas"])


@router.get("", response_model=TaskStatsResponse, summary="Obtener estadísticas y proyectos")
def get_stats(
    user_name: Optional[str] = Query(None, description="Nombre del usuario solicitante"),
    is_admin: bool = Query(False, description="Si el usuario es administrador"),
    db: Session = Depends(get_db)
):
    """Obtener resumen numérico de tareas por estado, prioridad y conteos por proyecto con permisos."""
    return TaskService.get_stats(db, user_name=user_name, is_admin=is_admin)
