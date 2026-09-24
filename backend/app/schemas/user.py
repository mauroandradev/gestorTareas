from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nombre completo del usuario")
    email: str = Field(..., description="Correo electrónico único")
    role: Optional[str] = Field("Miembro", description="Rol del usuario en el sistema")
    is_admin: Optional[bool] = Field(False, description="Indica si tiene privilegios de administrador")
    avatar: Optional[str] = Field(None, description="URL del avatar del usuario")
    is_active: Optional[bool] = Field(True, description="Estado activo del usuario")


class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(...)
    password: str = Field(..., min_length=4, description="Contraseña en texto plano")
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
