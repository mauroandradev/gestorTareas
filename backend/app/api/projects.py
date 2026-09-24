from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..services.task_service import TaskService

router = APIRouter(prefix="/projects", tags=["Proyectos"])


@router.delete("/{project_name}", summary="Eliminar proyecto")
def delete_project(project_name: str, db: Session = Depends(get_db)):
    """
    Elimina un proyecto y todas las tareas vinculadas a él.
    """
    clean_name = project_name.strip()
    if not clean_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nombre de proyecto inválido")

    deleted_count = TaskService.delete_project(db, clean_name)
    return {
        "status": "success",
        "message": f"Proyecto '{clean_name}' eliminado exitosamente ({deleted_count} tareas eliminadas)",
        "project": clean_name,
        "deleted_tasks_count": deleted_count
    }
