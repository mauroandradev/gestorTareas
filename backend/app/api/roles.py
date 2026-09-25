from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..schemas.role import RoleCreate, RoleUpdate, RoleResponse
from ..services.role_service import RoleService

router = APIRouter(prefix="/roles", tags=["Roles de Usuario"])


@router.get("", response_model=List[RoleResponse], summary="Listar todos los roles")
def get_roles(db: Session = Depends(get_db)):
    """Obtiene la lista completa de roles junto con el conteo de usuarios por rol."""
    return RoleService.get_roles(db)


@router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED, summary="Crear nuevo rol")
def create_role(role_in: RoleCreate, db: Session = Depends(get_db)):
    """Crea un nuevo rol en el sistema (Función de Administrador)."""
    try:
        return RoleService.create_role(db, role_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{role_id}", response_model=RoleResponse, summary="Modificar rol")
def update_role(role_id: int, role_in: RoleUpdate, db: Session = Depends(get_db)):
    """Actualiza el nombre y/o descripción de un rol. Si cambia el nombre, actualiza a los usuarios vinculados."""
    try:
        return RoleService.update_role(db, role_id, role_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{role_id}", summary="Eliminar rol")
def delete_role(role_id: int, db: Session = Depends(get_db)):
    """Elimina un rol del sistema. Los usuarios asignados pasan automáticamente al rol 'Miembro'."""
    try:
        success = RoleService.delete_role(db, role_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")
        return {"status": "success", "message": f"Rol {role_id} eliminado exitosamente"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
