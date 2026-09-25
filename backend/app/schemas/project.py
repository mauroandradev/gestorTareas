from pydantic import BaseModel, Field


class ProjectUpdate(BaseModel):
    new_name: str = Field(..., min_length=1, max_length=100, description="Nuevo nombre del proyecto")
