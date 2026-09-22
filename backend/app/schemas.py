from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr

# ----------------- USER SCHEMAS -----------------

class UserBase(BaseModel):
    name: str
    email: str
    role: Optional[str] = "Miembro"
    is_admin: Optional[bool] = False
    avatar: Optional[str] = None
    is_active: Optional[bool] = True

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "Miembro"
    is_admin: Optional[bool] = False
    avatar: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_admin: Optional[bool] = None
    avatar: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    user: UserResponse
    token: str
    message: str


# ----------------- TASK SCHEMAS -----------------

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "Media"
    status: Optional[str] = "Pendiente"
    project: Optional[str] = "General"
    assignee: Optional[str] = "Sin asignar"
    start_date: Optional[str] = None
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
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    completed_at: Optional[str] = None

class TaskStatusUpdate(BaseModel):
    status: str

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
    project_counts: dict = {}

