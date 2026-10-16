from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.deps import get_current_user
from ..models.user import User
from ..services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notificaciones Push"])


class RegisterTokenRequest(BaseModel):
    fcm_token: str = Field(..., min_length=10, description="Token FCM del dispositivo móvil")
    platform: Optional[str] = Field("android", description="android | ios | web")


class UnregisterTokenRequest(BaseModel):
    fcm_token: str = Field(..., min_length=10)


class TestNotificationRequest(BaseModel):
    title: Optional[str] = "Prueba de Notificación TaskPulse"
    body: Optional[str] = "¡Las notificaciones push están funcionando correctamente en tu teléfono!"


@router.post("/register-token", summary="Registrar token FCM del dispositivo móvil")
def register_token(
    payload: RegisterTokenRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Guarda o actualiza el token FCM asociado al usuario autenticado."""
    dev = NotificationService.register_device_token(
        db=db,
        user_id=current.id,
        user_email=current.email,
        fcm_token=payload.fcm_token,
        platform=payload.platform or "android"
    )
    return {
        "status": "success",
        "message": "Token de dispositivo registrado exitosamente",
        "device_id": dev.id,
        "platform": dev.platform
    }


@router.post("/unregister-token", summary="Desregistrar token FCM al cerrar sesión")
def unregister_token(
    payload: UnregisterTokenRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Elimina el token FCM del dispositivo cuando el usuario cierra sesión."""
    success = NotificationService.unregister_device_token(db, payload.fcm_token)
    return {"status": "success", "removed": success}


@router.post("/test", summary="Enviar notificación de prueba a los dispositivos del usuario")
def send_test_notification(
    payload: TestNotificationRequest,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Envía una notificación push inmediata a todos los teléfonos registrados del usuario."""
    tokens = NotificationService.get_tokens_for_users(db, [current.name])
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tienes ningún dispositivo móvil registrado aún. Abre la app en tu teléfono primero."
        )

    sent = NotificationService.send_push(
        tokens=tokens,
        title=payload.title or "TaskPulse",
        body=payload.body or "Notificación de prueba",
        data={"type": "test"}
    )
    return {
        "status": "success",
        "devices_found": len(tokens),
        "notifications_sent": sent
    }
