from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from .models import Task
from .schemas import TaskCreate, TaskUpdate, TaskStatusUpdate

class TaskController:
    @staticmethod
    def get_tasks(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        project: Optional[str] = None,
        assignee: Optional[str] = None
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

        # Order by Urgent first, then creation date desc
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
        task = Task(
            title=task_in.title.strip(),
            description=task_in.description.strip() if task_in.description else None,
            priority=task_in.priority or "Media",
            status=task_in.status or "Pendiente",
            project=task_in.project or "General",
            assignee=task_in.assignee or "Sin asignar",
            due_date=task_in.due_date
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
        # Get distinct projects
        projects_set = {t.project for t in tasks if t.project}
        if not projects_set:
            projects_set = {"Q3 Lanzamiento", "Soporte al Cliente", "Rediseño Web"}
        return {
            "total": len(tasks),
            "pendientes": sum(1 for t in tasks if t.status == "Pendiente"),
            "en_progreso": sum(1 for t in tasks if t.status == "En Progreso"),
            "completadas": sum(1 for t in tasks if t.status == "Completada"),
            "urgentes": sum(1 for t in tasks if t.priority == "Urgente"),
            "proyectos": sorted(list(projects_set))
        }

task_controller = TaskController()
