from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "Media"
    status: Optional[str] = "Pendiente"
    project: Optional[str] = "General"
    assignee: Optional[str] = "Sin asignar"
    due_date: Optional[str] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    project: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None

class TaskStatusUpdate(BaseModel):
    status: str

class TaskResponse(TaskBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TaskStatsResponse(BaseModel):
    total: int
    pendientes: int
    en_progreso: int
    completadas: int
    urgentes: int
    proyectos: List[str] = []
