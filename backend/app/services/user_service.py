from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models.user import User
from ..schemas.user import UserCreate, UserUpdate, UserLogin
from ..core.security import hash_password, verify_password


class UserService:
    @staticmethod
    def get_users(db: Session) -> List[User]:
        """List all users ordered by admin privilege and then by name."""
        return db.query(User).order_by(desc(User.is_admin), User.name).all()

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Fetch single user by ID."""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Fetch single user by normalized email."""
        if not email:
            return None
        return db.query(User).filter(User.email == email.strip().lower()).first()

    @staticmethod
    def authenticate(db: Session, credentials: UserLogin) -> Optional[User]:
        """Authenticate user credentials against active user records."""
        user = UserService.get_user_by_email(db, credentials.email)
        if not user or not user.is_active:
            return None
        if not verify_password(credentials.password, user.password_hash):
            return None
        return user

    @staticmethod
    def create_user(db: Session, user_in: UserCreate) -> User:
        """Create a new user with hashed password and role assignment."""
        email_clean = user_in.email.strip().lower()
        if UserService.get_user_by_email(db, email_clean):
            raise ValueError(f"Ya existe un usuario registrado con el correo {email_clean}")

        is_admin = bool(user_in.is_admin or (user_in.role == "Administrador"))

        user = User(
            name=user_in.name.strip(),
            email=email_clean,
            password_hash=hash_password(user_in.password),
            role=user_in.role or "Miembro",
            is_admin=is_admin,
            avatar=user_in.avatar,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_user(db: Session, user_id: int, user_in: UserUpdate) -> Optional[User]:
        """Update user properties."""
        user = UserService.get_user_by_id(db, user_id)
        if not user:
            return None

        update_data = user_in.model_dump(exclude_unset=True)

        if "email" in update_data and update_data["email"]:
            new_email = update_data["email"].strip().lower()
            existing = UserService.get_user_by_email(db, new_email)
            if existing and existing.id != user_id:
                raise ValueError(f"El correo {new_email} ya está en uso por otro usuario")
            user.email = new_email

        if "password" in update_data and update_data["password"]:
            user.password_hash = hash_password(update_data["password"])

        if "name" in update_data and update_data["name"]:
            user.name = update_data["name"].strip()

        if "role" in update_data and update_data["role"]:
            user.role = update_data["role"]
            if user.role == "Administrador":
                user.is_admin = True

        if "is_admin" in update_data and update_data["is_admin"] is not None:
            user.is_admin = update_data["is_admin"]

        if "is_active" in update_data and update_data["is_active"] is not None:
            user.is_active = update_data["is_active"]

        if "avatar" in update_data:
            user.avatar = update_data["avatar"]

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        """Delete user, ensuring the last administrator is preserved."""
        user = UserService.get_user_by_id(db, user_id)
        if not user:
            return False

        if user.is_admin:
            admin_count = db.query(User).filter(User.is_admin == True).count()
            if admin_count <= 1:
                raise ValueError("No se puede eliminar la única cuenta de Administrador del sistema")

        db.delete(user)
        db.commit()
        return True
