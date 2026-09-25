from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from ..core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    owner_name = Column(String(100), nullable=True, default="Administrador Principal")
    members = Column(Text, default="", nullable=True)  # Comma-separated member names
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Project id={self.id} name={self.name} owner={self.owner_name}>"
