import hashlib
import secrets
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from .models import Task, User
from .schemas import (
    TaskCreate, TaskUpdate, TaskStatusUpdate,
    UserCreate, UserUpdate, UserLogin
)

def hash_password(password: str, salt: Optional[str] = None) -> str:
    if not salt:
        salt = secrets.token_hex(8)
    hashed = hashlib.sha256((password + salt).encode('utf-8')).hexdigest()
    return f"{salt}${hashed}"

def verify_password(plain_password: str, stored_hash: str) -> bool:
    try:
        salt, hashed = stored_hash.split("$", 1)
        return hashlib.sha256((plain_password + salt).encode('utf-8')).hexdigest() == hashed
    except Exception:
        return False


class UserController:
    @staticmethod
    def get_users(db: Session) -> List[User]:
        return db.query(User).order_by(desc(User.is_admin), User.name).all()

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email.strip().lower()).first()

    @staticmethod
    def authenticate(db: Session, credentials: UserLogin) -> Optional[User]:
        user = UserController.get_user_by_email(db, credentials.email)
        if not user:
            return None
        if not verify_password(credentials.password, user.password_hash):
            return None
        if not user.is_active:
            return None
        return user

    @staticmethod
    def create_user(db: Session, user_in: UserCreate) -> User:
        email_clean = user_in.email.strip().lower()
        if UserController.get_user_by_email(db, email_clean):
            raise ValueError(f"Ya existe un usuario registrado con el correo {email_clean}")

        # Check if role implies admin
        is_admin = user_in.is_admin or (user_in.role == "Administrador")

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
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        update_data = user_in.model_dump(exclude_unset=True)

        if "email" in update_data and update_data["email"]:
            new_email = update_data["email"].strip().lower()
            existing = UserController.get_user_by_email(db, new_email)
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
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False

        # Do not allow deleting if it's the last admin
        if user.is_admin:
            admin_count = db.query(User).filter(User.is_admin == True).count()
            if admin_count <= 1:
                raise ValueError("No se puede eliminar la única cuenta de Administrador del sistema")

        db.delete(user)
        db.commit()
        return True


class TaskController:
    @staticmethod
    def get_tasks(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        project: Optional[str] = None,
        assignee: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> List[Task]:
        query = db.query(Task)

        if search:
            search_fmt = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Task.title.ilike(search_fmt),
                    Task.description.ilike(search_fmt),
                    Task.assignee.ilike(search_fmt),
                    Task.project.ilike(search_fmt)
                )
            )

        if status and status != "Todas":
            query = query.filter(Task.status == status)

        if priority and priority != "Todas":
            query = query.filter(Task.priority == priority)

        if project and project != "Todos":
            query = query.filter(Task.project == project)

        if assignee and assignee != "Todos":
            query = query.filter(Task.assignee == assignee)

        if from_date:
            query = query.filter(Task.due_date >= from_date)

        if to_date:
            query = query.filter(Task.due_date <= to_date)

        return query.order_by(
            desc(Task.priority == "Urgente"),
            desc(Task.priority == "Alta"),
            desc(Task.created_at)
        ).all()

    @staticmethod
    def get_task_by_id(db: Session, task_id: int) -> Optional[Task]:
        return db.query(Task).filter(Task.id == task_id).first()

    @staticmethod
    def create_task(db: Session, task_in: TaskCreate) -> Task:
        today_str = datetime.now().strftime("%Y-%m-%d")
        completed_at = today_str if task_in.status == "Completada" else None
        start_date = task_in.start_date or today_str

        task = Task(
            title=task_in.title.strip(),
            description=task_in.description.strip() if task_in.description else None,
            priority=task_in.priority or "Media",
            status=task_in.status or "Pendiente",
            project=task_in.project or "General",
            assignee=task_in.assignee or "Sin asignar",
            start_date=start_date,
            due_date=task_in.due_date,
            completed_at=completed_at
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def update_task(db: Session, task_id: int, task_in: TaskUpdate) -> Optional[Task]:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None

        update_data = task_in.model_dump(exclude_unset=True)
        
        # If status changed to Completada, set completed_at
        if "status" in update_data:
            if update_data["status"] == "Completada" and not task.completed_at:
                update_data["completed_at"] = datetime.now().strftime("%Y-%m-%d")
            elif update_data["status"] != "Completada":
                update_data["completed_at"] = None

        for field, value in update_data.items():
            setattr(task, field, value)

        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def update_status(db: Session, task_id: int, status_in: TaskStatusUpdate) -> Optional[Task]:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None

        task.status = status_in.status
        if status_in.status == "Completada":
            task.completed_at = datetime.now().strftime("%Y-%m-%d")
        else:
            task.completed_at = None

        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def delete_task(db: Session, task_id: int) -> bool:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return False

        db.delete(task)
        db.commit()
        return True

    @staticmethod
    def get_stats(db: Session) -> dict:
        tasks = db.query(Task).all()
        projects_set = {t.project for t in tasks if t.project}
        if not projects_set:
            projects_set = {"Q3 Lanzamiento", "Soporte al Cliente", "Rediseño Web"}
        
        project_counts = {}
        for t in tasks:
            proj = t.project or "General"
            project_counts[proj] = project_counts.get(proj, 0) + 1

        for p in projects_set:
            if p not in project_counts:
                project_counts[p] = 0

        return {
            "total": len(tasks),
            "pendientes": sum(1 for t in tasks if t.status == "Pendiente"),
            "en_progreso": sum(1 for t in tasks if t.status == "En Progreso"),
            "completadas": sum(1 for t in tasks if t.status == "Completada"),
            "urgentes": sum(1 for t in tasks if t.priority == "Urgente"),
            "proyectos": sorted(list(projects_set)),
            "project_counts": project_counts
        }


user_controller = UserController()
task_controller = TaskController()
