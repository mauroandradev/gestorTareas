from typing import List, Optional, Dict, Any, Set
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from ..models.task import Task
from ..models.project import Project
from ..schemas.task import TaskCreate, TaskUpdate, TaskStatusUpdate


class TaskService:
    @staticmethod
    def _get_user_accessible_projects(db: Session, user_name: str) -> Set[str]:
        """Find all project names where user is owner, assigned member, or has tasks assigned."""
        user_clean = user_name.strip()
        accessible_projects: Set[str] = set()

        # 1. Check Project model
        projects = db.query(Project).all()
        for p in projects:
            owner = p.owner_name or "Administrador Principal"
            members_list = [m.strip() for m in (p.members or "").split(",") if m.strip()]
            if owner.lower() == user_clean.lower() or any(m.lower() == user_clean.lower() for m in members_list):
                accessible_projects.add(p.name)

        # 2. Check Tasks assignees
        task_projects = db.query(Task.project).filter(Task.assignee.ilike(f"%{user_clean}%")).distinct().all()
        for tp in task_projects:
            if tp[0]:
                accessible_projects.add(tp[0])

        return accessible_projects

    @staticmethod
    def get_tasks(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        project: Optional[str] = None,
        assignee: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        user_name: Optional[str] = None,
        is_admin: bool = False
    ) -> List[Task]:
        """Fetch tasks matching any optional filter criteria with role-based project visibility."""
        query = db.query(Task)

        # Role-based project visibility: non-admins only see tasks in projects they are owner/member/assigned to
        if not is_admin and user_name:
            accessible_projects = TaskService._get_user_accessible_projects(db, user_name)
            if accessible_projects:
                query = query.filter(Task.project.in_(accessible_projects))
            else:
                query = query.filter(Task.assignee.ilike(f"%{user_name.strip()}%"))

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
            query = query.filter(Task.assignee.ilike(f"%{assignee.strip()}%"))

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
        """Create a new task with formatted dates and multiple assignees support."""
        today_str = datetime.now().strftime("%Y-%m-%d")
        completed_at = today_str if task_in.status == "Completada" else None
        start_date = task_in.start_date or today_str

        if task_in.assignees and len(task_in.assignees) > 0:
            assignee_val = ", ".join([a.strip() for a in task_in.assignees if a.strip()])
        else:
            assignee_val = task_in.assignee or "Sin asignar"

        task = Task(
            title=task_in.title.strip(),
            description=task_in.description.strip() if task_in.description else None,
            priority=task_in.priority,
            status=task_in.status,
            project=task_in.project.strip() if task_in.project else "General",
            assignee=assignee_val,
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

        # Handle assignees array if provided
        if "assignees" in update_data and update_data["assignees"] is not None:
            assignees_list = update_data.pop("assignees")
            update_data["assignee"] = ", ".join([a.strip() for a in assignees_list if a.strip()]) if assignees_list else "Sin asignar"

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

        # Rename in tasks
        updated_count = db.query(Task).filter(Task.project == old_clean).update({Task.project: new_clean})

        # Rename in Project model if exists
        project = db.query(Project).filter(Project.name == old_clean).first()
        if project:
            project.name = new_clean

        db.commit()
        return updated_count

    @staticmethod
    def delete_project(db: Session, project_name: str) -> int:
        """Delete all tasks and Project record matching the specified project name."""
        clean_proj = project_name.strip()
        deleted_count = db.query(Task).filter(Task.project == clean_proj).delete()
        project = db.query(Project).filter(Project.name == clean_proj).first()
        if project:
            db.delete(project)
        db.commit()
        return deleted_count

    @staticmethod
    def get_stats(db: Session, user_name: Optional[str] = None, is_admin: bool = False) -> Dict[str, Any]:
        """Compute aggregated statistics for tasks and projects with role-based visibility."""
        if is_admin or not user_name:
            tasks = db.query(Task).all()
            db_projects = [p.name for p in db.query(Project.name).all()]
            task_projects = [t.project for t in tasks if t.project]
            projects_set = set(db_projects + task_projects)
            if not projects_set:
                projects_set = {"Q3 Lanzamiento", "Soporte al Cliente", "Rediseño Web"}
        else:
            # Non-admin: only projects where the user is owner, member, or assigned
            accessible_projects = TaskService._get_user_accessible_projects(db, user_name)
            if accessible_projects:
                tasks = db.query(Task).filter(Task.project.in_(accessible_projects)).all()
                projects_set = accessible_projects
            else:
                tasks = db.query(Task).filter(Task.assignee.ilike(f"%{user_name.strip()}%")).all()
                projects_set = {t.project for t in tasks if t.project}

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
