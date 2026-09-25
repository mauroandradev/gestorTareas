from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..schemas.project import ProjectCreate, ProjectUpdate, ProjectMemberUpdate, ProjectResponse
from ..services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Proyectos"])


@router.get("", response_model=List[ProjectResponse], summary="Listar proyectos con permisos")
def get_projects(
    user_name: Optional[str] = Query(None, description="Nombre del usuario solicitante"),
    is_admin: bool = Query(False, description="Si el usuario tiene permisos de administrador"),
    db: Session = Depends(get_db)
):
    """
    Lista los proyectos accesibles según el rol:
    - Administrador: ve todos los proyectos.
    - Usuario regular: ve los proyectos donde es dueño, miembro o tiene tareas asignadas.
    """
    return ProjectService.get_projects(db, user_name=user_name, is_admin=is_admin)


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED, summary="Crear nuevo proyecto")
def create_project(
    project_in: ProjectCreate,
    creator_name: Optional[str] = Query(None, description="Nombre del creador"),
    db: Session = Depends(get_db)
):
    """
    Crea un nuevo proyecto y asigna a su creador/dueño y miembros iniciales.
    """
    try:
        return ProjectService.create_project(db, project_in, creator_name=creator_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{project_name}", response_model=ProjectResponse, summary="Actualizar o renombrar proyecto y miembros")
def update_project(
    project_name: str,
    update_in: ProjectUpdate,
    current_user: Optional[str] = Query(None, description="Usuario actual"),
    is_admin: bool = Query(False, description="Si el usuario es administrador"),
    db: Session = Depends(get_db)
):
    """
    Actualiza datos del proyecto (nombre, descripción, dueño y miembros).
    Permitido para el dueño del proyecto o Administradores.
    """
    try:
        return ProjectService.update_project(
            db=db,
            old_name=project_name,
            update_in=update_in,
            current_user=current_user,
            is_admin=is_admin
        )
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@router.post("/{project_name}/members", response_model=ProjectResponse, summary="Agregar miembro al proyecto")
def add_project_member(
    project_name: str,
    member_in: ProjectMemberUpdate,
    current_user: Optional[str] = Query(None, description="Usuario actual"),
    is_admin: bool = Query(False, description="Si el usuario es administrador"),
    db: Session = Depends(get_db)
):
    """
    Agrega una persona al equipo del proyecto. Permitido para el Dueño del proyecto o Administrador.
    """
    try:
        return ProjectService.add_member(
            db=db,
            project_name=project_name,
            member_name=member_in.member_name,
            current_user=current_user,
            is_admin=is_admin
        )
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@router.delete("/{project_name}/members/{member_name}", response_model=ProjectResponse, summary="Remover miembro del proyecto")
def remove_project_member(
    project_name: str,
    member_name: str,
    current_user: Optional[str] = Query(None, description="Usuario actual"),
    is_admin: bool = Query(False, description="Si el usuario es administrador"),
    db: Session = Depends(get_db)
):
    """
    Remueve a una persona del equipo del proyecto. Permitido para el Dueño del proyecto o Administrador.
    """
    try:
        return ProjectService.remove_member(
            db=db,
            project_name=project_name,
            member_name=member_name,
            current_user=current_user,
            is_admin=is_admin
        )
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@router.delete("/{project_name}", summary="Eliminar proyecto")
def delete_project(
    project_name: str,
    current_user: Optional[str] = Query(None, description="Usuario actual"),
    is_admin: bool = Query(False, description="Si el usuario es administrador"),
    db: Session = Depends(get_db)
):
    """
    Elimina un proyecto y todas las tareas vinculadas a él.
    Permitido para el Dueño del proyecto o Administrador.
    """
    clean_name = project_name.strip()
    if not clean_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nombre de proyecto inválido")

    try:
        deleted_count = ProjectService.delete_project(
            db=db,
            project_name=clean_name,
            current_user=current_user,
            is_admin=is_admin
        )
        return {
            "status": "success",
            "message": f"Proyecto '{clean_name}' eliminado exitosamente ({deleted_count} tareas eliminadas)",
            "project": clean_name,
            "deleted_tasks_count": deleted_count
        }
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
