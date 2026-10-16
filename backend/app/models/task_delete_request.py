from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from ..core.database import Base


class TaskDeleteRequest(Base):
    """Solicitud de eliminación de una tarea que debe aprobar un administrador."""
    __tablename__ = "task_delete_requests"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, nullable=False, index=True)
    task_title = Column(String(200), nullable=False)
    project = Column(String(100), nullable=True)
    requested_by = Column(String(100), nullable=False)
    status = Column(String(20), default="Pendiente", index=True)  # Pendiente, Aprobada, Rechazada
    resolved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
