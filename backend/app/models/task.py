from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from ..core.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String(20), default="Media")       # Baja, Media, Alta, Urgente
    status = Column(String(20), default="Pendiente")     # Pendiente, En Progreso, Completada
    project = Column(String(100), default="General")     # Proyecto vinculado
    assignee = Column(String(100), default="Sin asignar")# Responsable
    start_date = Column(String(20), nullable=True)       # Fecha de inicio (YYYY-MM-DD)
    due_date = Column(String(20), nullable=True)         # Fecha límite (YYYY-MM-DD)
    completed_at = Column(String(30), nullable=True)     # Fecha en que se completó (YYYY-MM-DD)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Task id={self.id} title={self.title} status={self.status}>"
