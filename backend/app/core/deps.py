from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from ..models.user import User

security_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    auth: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado"
        )
    token = auth.credentials
    try:
        parts = token.split("_")
        if len(parts) >= 2 and parts[0] == "taskpulse":
            user_id = int(parts[1])
            user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
            if user:
                return user
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado"
    )
