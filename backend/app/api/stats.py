from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..schemas.task import TaskStatsResponse
from ..services.task_service import TaskService

router = APIRouter(prefix="/stats", tags=["Métricas y Estadísticas"])


@router.get("", response_model=TaskStatsResponse, summary="Obtener estadísticas y proyectos")
def get_stats(db: Session = Depends(get_db)):
    """Obtener resumen numérico de tareas por estado, prioridad y conteos por proyecto."""
    return TaskService.get_stats(db)
