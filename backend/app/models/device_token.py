from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from ..core.database import Base


class DeviceToken(Base):
    """Token FCM para envío de notificaciones push a dispositivos móviles."""
    __tablename__ = "device_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    user_email = Column(String(150), nullable=True)
    fcm_token = Column(String(500), unique=True, nullable=False, index=True)
    platform = Column(String(20), default="android")  # android | ios | web
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
