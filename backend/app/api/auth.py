from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import generate_session_token
from ..schemas.user import UserCreate, UserUpdate, UserResponse, UserLogin, LoginResponse
from ..services.user_service import UserService

router = APIRouter(tags=["Autenticación y Usuarios"])


@router.post("/auth/login", response_model=LoginResponse, summary="Iniciar sesión")
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Iniciar sesión con correo electrónico y contraseña."""
    user = UserService.authenticate(db, credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas o usuario inactivo"
        )

    token = generate_session_token(user.id)
    return {
        "user": user,
        "token": token,
        "message": f"Bienvenido, {user.name}"
    }


@router.get("/auth/users", response_model=List[UserResponse], summary="Listar usuarios")
def get_users(db: Session = Depends(get_db)):
    """Listar todos los usuarios registrados en el sistema."""
    return UserService.get_users(db)


@router.post(
    "/auth/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear usuario"
)
def create_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """Crear un nuevo usuario y asignar su rol (Función de Administrador)."""
    try:
        return UserService.create_user(db, user_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/auth/users/{user_id}", response_model=UserResponse, summary="Actualizar usuario")
def update_user(user_id: int, user_in: UserUpdate, db: Session = Depends(get_db)):
    """Actualizar datos, rol o contraseña de un usuario."""
    try:
        user = UserService.update_user(db, user_id, user_in)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/auth/users/{user_id}", summary="Eliminar usuario")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Eliminar un usuario del sistema (Función de Administrador)."""
    try:
        success = UserService.delete_user(db, user_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
        return {"status": "success", "message": f"Usuario {user_id} eliminado exitosamente"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
