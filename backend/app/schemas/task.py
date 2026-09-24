from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Título de la tarea")
    description: Optional[str] = Field(None, description="Descripción detallada")
    priority: Optional[str] = Field("Media", description="Prioridad: Baja, Media, Alta, Urgente")
    status: Optional[str] = Field("Pendiente", description="Estado: Pendiente, En Progreso, Completada")
    project: Optional[str] = Field("General", description="Nombre del proyecto vinculado")
    assignee: Optional[str] = Field("Sin asignar", description="Nombre del responsable asignado")
    start_date: Optional[str] = Field(None, description="Fecha de inicio YYYY-MM-DD")
    due_date: Optional[str] = Field(None, description="Fecha límite YYYY-MM-DD")


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    project: Optional[str] = None
    assignee: Optional[str] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    completed_at: Optional[str] = None


class TaskStatusUpdate(BaseModel):
    status: str = Field(..., description="Nuevo estado: Pendiente, En Progreso, Completada")


class TaskResponse(TaskBase):
    id: int
    completed_at: Optional[str] = None
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
    project_counts: Dict[str, int] = {}
