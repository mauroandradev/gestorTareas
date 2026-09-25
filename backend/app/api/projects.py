from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..schemas.project import ProjectUpdate
from ..services.task_service import TaskService

router = APIRouter(prefix="/projects", tags=["Proyectos"])


@router.put("/{project_name}", summary="Modificar o renombrar proyecto")
def rename_project(project_name: str, update_in: ProjectUpdate, db: Session = Depends(get_db)):
    """
    Renombra un proyecto y actualiza todas las tareas vinculadas al nuevo nombre.
    """
    old_clean = project_name.strip()
    new_clean = update_in.new_name.strip()

    if not old_clean:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nombre de proyecto actual inválido")
    if not new_clean:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nuevo nombre no puede estar vacío")

    try:
        updated_count = TaskService.rename_project(db, old_clean, new_clean)
        return {
            "status": "success",
            "message": f"Proyecto '{old_clean}' renombrado a '{new_clean}' ({updated_count} tareas actualizadas)",
            "old_name": old_clean,
            "new_name": new_clean,
            "updated_tasks_count": updated_count
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


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
