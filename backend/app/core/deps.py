from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .security import decode_session_token
from ..models.user import User

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Valida el token Bearer y devuelve el usuario activo asociado."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión inválida o expirada. Inicia sesión nuevamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not credentials or not credentials.credentials:
        raise unauthorized

    user_id = decode_session_token(credentials.credentials)
    if user_id is None:
        raise unauthorized

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise unauthorized
    return user


def is_admin_user(user: User) -> bool:
    return bool(user.is_admin or (user.role or "") == "Administrador")


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Permite el acceso solo a administradores."""
    if not is_admin_user(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta acción requiere permisos de Administrador",
        )
    return user
