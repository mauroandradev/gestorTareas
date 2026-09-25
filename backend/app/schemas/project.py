from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nombre del proyecto")
    description: Optional[str] = Field(None, description="Descripción del proyecto")
    owner_name: Optional[str] = Field(None, description="Nombre del dueño o creador del proyecto")
    members: Optional[List[str]] = Field(default_factory=list, description="Lista de personas asignadas al proyecto")


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Nombre del proyecto")
    description: Optional[str] = Field(None, description="Descripción del proyecto")
    owner_name: Optional[str] = Field(None, description="Nombre del dueño o creador del proyecto")
    members: Optional[List[str]] = Field(None, description="Lista de personas asignadas al proyecto")
    new_name: Optional[str] = Field(None, description="Nuevo nombre para compatibilidad hacia atrás")


class ProjectMemberUpdate(BaseModel):
    member_name: str = Field(..., min_length=1, description="Nombre del miembro a agregar o quitar")


class ProjectResponse(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    owner_name: Optional[str] = None
    members: List[str] = Field(default_factory=list)
    task_count: int = 0
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def parse_members_list(self):
        # If members is a string from database, split into list
        if isinstance(self.members, str):
            self.members = [m.strip() for m in self.members.split(",") if m.strip()]
        elif not self.members:
            self.members = []
        return self
