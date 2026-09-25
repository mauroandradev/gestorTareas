from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from ..models.task import Task
from ..schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate


class TaskService:
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
        """Fetch tasks matching any optional filter criteria."""
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
        """Fetch a single task by ID."""
        return db.query(Task).filter(Task.id == task_id).first()

    @staticmethod
    def create_task(db: Session, task_in: TaskCreate) -> Task:
        """Create a new task with formatted dates."""
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
        """Update existing task fields and adjust completed_at date appropriately."""
        task = TaskService.get_task_by_id(db, task_id)
        if not task:
            return None

        update_data = task_in.model_dump(exclude_unset=True)

        # Handle completion date on status change
        if "status" in update_data:
            if update_data["status"] == "Completada" and not task.completed_at:
                update_data["completed_at"] = datetime.now().strftime("%Y-%m-%d")
            elif update_data["status"] != "Completada":
                update_data["completed_at"] = None

        for field, value in update_data.items():
            if isinstance(value, str) and field in ["title", "description"]:
                value = value.strip() if value else None
            setattr(task, field, value)

        db.commit()
        db.refresh(task)
        return task

    @staticmethod
    def update_status(db: Session, task_id: int, status_in: TaskStatusUpdate) -> Optional[Task]:
        """Update task status and set/clear completion date."""
        task = TaskService.get_task_by_id(db, task_id)
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
        """Delete task by ID."""
        task = TaskService.get_task_by_id(db, task_id)
        if not task:
            return False

        db.delete(task)
        db.commit()
        return True

    @staticmethod
    def rename_project(db: Session, old_name: str, new_name: str) -> int:
        """Rename all tasks associated with old_name to new_name."""
        old_clean = old_name.strip()
        new_clean = new_name.strip()
        if not new_clean:
            raise ValueError("El nuevo nombre del proyecto no puede estar vacío")
        
        updated_count = db.query(Task).filter(Task.project == old_clean).update({Task.project: new_clean})
        db.commit()
        return updated_count

    @staticmethod
    def delete_project(db: Session, project_name: str) -> int:
        """Delete all tasks matching the specified project name."""
        deleted_count = db.query(Task).filter(Task.project == project_name).delete()
        db.commit()
        return deleted_count

    @staticmethod
    def get_stats(db: Session) -> Dict[str, Any]:
        """Compute aggregated statistics for tasks and projects."""
        tasks = db.query(Task).all()
        projects_set = {t.project for t in tasks if t.project}
        if not projects_set:
            projects_set = {"Q3 Lanzamiento", "Soporte al Cliente", "Rediseño Web"}

        project_counts: Dict[str, int] = {}
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
