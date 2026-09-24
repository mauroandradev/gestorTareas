from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from ..core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(50), default="Miembro")  # Administrador, Líder de Proyecto, Desarrollador, Diseñador, QA, Miembro
    is_admin = Column(Boolean, default=False)
    avatar = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
