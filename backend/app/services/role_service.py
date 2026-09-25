from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models.role import Role
from ..models.user import User
from ..schemas.role import RoleCreate, RoleUpdate, RoleResponse


class RoleService:
    @staticmethod
    def get_roles(db: Session) -> List[RoleResponse]:
        """Fetch all roles with dynamic user counts."""
        roles = db.query(Role).order_by(Role.name).all()
        
        # Calculate user counts per role
        user_counts = dict(
            db.query(User.role, func.count(User.id))
            .filter(User.role.isnot(None))
            .group_by(User.role)
            .all()
        )

        response_list = []
        for r in roles:
            response_list.append(
                RoleResponse(
                    id=r.id,
                    name=r.name,
                    description=r.description,
                    user_count=user_counts.get(r.name, 0),
                    created_at=r.created_at,
                    updated_at=r.updated_at
                )
            )
        return response_list

    @staticmethod
    def get_role_by_id(db: Session, role_id: int) -> Optional[Role]:
        """Fetch single role by ID."""
        return db.query(Role).filter(Role.id == role_id).first()

    @staticmethod
    def get_role_by_name(db: Session, name: str) -> Optional[Role]:
        """Fetch single role by normalized name."""
        return db.query(Role).filter(func.lower(Role.name) == name.strip().lower()).first()

    @staticmethod
    def create_role(db: Session, role_in: RoleCreate) -> RoleResponse:
        """Create a new role after uniqueness check."""
        clean_name = role_in.name.strip()
        if not clean_name:
            raise ValueError("El nombre del rol es requerido")

        if RoleService.get_role_by_name(db, clean_name):
            raise ValueError(f"Ya existe un rol con el nombre '{clean_name}'")

        role = Role(
            name=clean_name,
            description=role_in.description.strip() if role_in.description else None
        )
        db.add(role)
        db.commit()
        db.refresh(role)
        return RoleResponse(
            id=role.id,
            name=role.name,
            description=role.description,
            user_count=0,
            created_at=role.created_at,
            updated_at=role.updated_at
        )

    @staticmethod
    def update_role(db: Session, role_id: int, role_in: RoleUpdate) -> RoleResponse:
        """Update role name and description; cascade name change to existing users."""
        role = RoleService.get_role_by_id(db, role_id)
        if not role:
            raise ValueError("Rol no encontrado")

        old_name = role.name
        new_name = role_in.name.strip() if role_in.name else None

        if new_name and new_name.lower() != old_name.lower():
            existing = RoleService.get_role_by_name(db, new_name)
            if existing and existing.id != role_id:
                raise ValueError(f"Ya existe otro rol con el nombre '{new_name}'")
            
            # Cascade rename to all users with the old role name
            db.query(User).filter(User.role == old_name).update({User.role: new_name})
            role.name = new_name

        if role_in.description is not None:
            role.description = role_in.description.strip() if role_in.description else None

        db.commit()
        db.refresh(role)

        user_count = db.query(User).filter(User.role == role.name).count()
        return RoleResponse(
            id=role.id,
            name=role.name,
            description=role.description,
            user_count=user_count,
            created_at=role.created_at,
            updated_at=role.updated_at
        )

    @staticmethod
    def delete_role(db: Session, role_id: int) -> bool:
        """Delete role, protecting 'Administrador' and reassigning users to 'Miembro'."""
        role = RoleService.get_role_by_id(db, role_id)
        if not role:
            return False

        if role.name.lower() == "administrador":
            raise ValueError("No se puede eliminar el rol esencial 'Administrador'")

        # Reassign users with this role to 'Miembro'
        db.query(User).filter(User.role == role.name).update({User.role: "Miembro"})

        db.delete(role)
        db.commit()
        return True
