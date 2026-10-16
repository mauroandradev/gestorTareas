import os
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from ..models.device_token import DeviceToken
from ..models.user import User

_FIREBASE_INITIALIZED = False


def _init_firebase():
    global _FIREBASE_INITIALIZED
    if _FIREBASE_INITIALIZED:
        return True
    try:
        import firebase_admin
        from firebase_admin import credentials

        # Ruta opcional a la clave de cuenta de servicio de Firebase (serviceAccountKey.json)
        # Puede definirse via variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
        if not cred_path:
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            candidate = os.path.join(backend_dir, "firebase-service-account.json")
            if os.path.isfile(candidate):
                cred_path = candidate

        if cred_path and os.path.isfile(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            _FIREBASE_INITIALIZED = True
            print("[OK] Firebase Admin SDK inicializado exitosamente.")
            return True
        else:
            # Si no hay credencial configurada aún, dejamos listo el log
            return False
    except Exception as e:
        print(f"[WARN] No se pudo inicializar Firebase Admin SDK: {e}")
        return False


class NotificationService:
    @staticmethod
    def register_device_token(
        db: Session,
        user_id: int,
        user_email: Optional[str],
        fcm_token: str,
        platform: str = "android"
    ) -> DeviceToken:
        """Registra o actualiza el token FCM de un dispositivo para un usuario."""
        token_clean = fcm_token.strip()
        existing = db.query(DeviceToken).filter(DeviceToken.fcm_token == token_clean).first()
        if existing:
            existing.user_id = user_id
            existing.user_email = user_email
            existing.platform = platform
            existing.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(existing)
            return existing

        dev = DeviceToken(
            user_id=user_id,
            user_email=user_email,
            fcm_token=token_clean,
            platform=platform,
        )
        db.add(dev)
        db.commit()
        db.refresh(dev)
        return dev

    @staticmethod
    def unregister_device_token(db: Session, fcm_token: str) -> bool:
        """Elimina el token FCM al cerrar sesión."""
        token_clean = fcm_token.strip()
        count = db.query(DeviceToken).filter(DeviceToken.fcm_token == token_clean).delete()
        db.commit()
        return count > 0

    @staticmethod
    def get_tokens_for_users(db: Session, user_names: List[str]) -> List[str]:
        """Obtiene todos los tokens FCM registrados para una lista de nombres de usuario."""
        if not user_names:
            return []
        users = db.query(User).filter(User.name.in_(user_names), User.is_active == True).all()
        user_ids = [u.id for u in users]
        if not user_ids:
            return []
        tokens = db.query(DeviceToken.fcm_token).filter(DeviceToken.user_id.in_(user_ids)).all()
        return [t[0] for t in tokens if t[0]]

    @staticmethod
    def get_admin_tokens(db: Session) -> List[str]:
        """Obtiene tokens FCM de todos los administradores."""
        admins = db.query(User).filter(
            (User.is_admin == True) | (User.role == "Administrador"),
            User.is_active == True
        ).all()
        admin_ids = [a.id for a in admins]
        if not admin_ids:
            return []
        tokens = db.query(DeviceToken.fcm_token).filter(DeviceToken.user_id.in_(admin_ids)).all()
        return [t[0] for t in tokens if t[0]]

    @staticmethod
    def send_push(
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, str]] = None
    ) -> int:
        """Envía notificación push a una lista de tokens FCM vía Firebase Cloud Messaging."""
        if not tokens:
            return 0

        initialized = _init_firebase()
        if not initialized:
            print(f"[PUSH SIMULADO] A {len(tokens)} dispositivo(s) -> '{title}': {body}")
            return len(tokens)

        try:
            from firebase_admin import messaging

            # Convertir todos los valores de data a string
            str_data = {k: str(v) for k, v in (data or {}).items()}

            message = messaging.MulticastMessage(
                tokens=tokens,
                notification=messaging.Notification(title=title, body=body),
                data=str_data,
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        sound="default",
                        channel_id="taskpulse_tasks_channel",
                    ),
                ),
            )
            response = messaging.send_multicast(message)
            print(f"[PUSH FCM] Enviado: {response.success_count} exitosos, {response.failure_count} fallidos.")
            return response.success_count
        except Exception as e:
            print(f"[ERROR PUSH FCM] {e}")
            return 0
