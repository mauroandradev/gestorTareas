from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.deps import get_current_user, is_admin_user
from ..models.user import User
from ..schemas.task import TaskStatsResponse
from ..services.task_service import TaskService

router = APIRouter(prefix="/stats", tags=["Métricas y Estadísticas"])


@router.get("", response_model=TaskStatsResponse, summary="Obtener estadísticas y proyectos")
def get_stats(
    user_name: Optional[str] = Query(None, description="(Ignorado) se usa el usuario del token"),
    is_admin: bool = Query(False, description="(Ignorado) se usa el rol del token"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtener resumen numérico de tareas por estado, prioridad y conteos por proyecto con permisos."""
    return TaskService.get_stats(db, user_name=current_user.name, is_admin=is_admin_user(current_user))
