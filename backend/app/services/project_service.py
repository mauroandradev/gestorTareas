from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.project import Project
from ..models.task import Task
from ..schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse


class ProjectService:
    @staticmethod
    def get_projects(db: Session, user_name: Optional[str] = None, is_admin: bool = False) -> List[ProjectResponse]:
        """
        List all projects accessible by the user:
        - Admins see all projects.
        - Non-admins see projects where they are owner, member, or have tasks assigned.
        """
        projects = db.query(Project).order_by(Project.name.asc()).all()

        # Build task counts map
        task_counts = dict(
            db.query(Task.project, func.count(Task.id))
            .filter(Task.project.isnot(None))
            .group_by(Task.project)
            .all()
        )

        results = []
        user_clean = user_name.strip() if user_name else ""

        for proj in projects:
            # Parse members
            members_list = [m.strip() for m in (proj.members or "").split(",") if m.strip()]
            owner = proj.owner_name or "Administrador Principal"

            # Check accessibility
            if not is_admin and user_clean:
                is_owner = (owner.lower() == user_clean.lower())
                is_member = any(m.lower() == user_clean.lower() for m in members_list)
                has_task = (
                    db.query(Task)
                    .filter(
                        Task.project == proj.name,
                        Task.assignee.ilike(f"%{user_clean}%")
                    )
                    .count() > 0
                )
                if not (is_owner or is_member or has_task):
                    continue

            results.append(
                ProjectResponse(
                    id=proj.id,
                    name=proj.name,
                    description=proj.description,
                    owner_name=owner,
                    members=members_list,
                    task_count=task_counts.get(proj.name, 0),
                    created_at=proj.created_at
                )
            )

        return results

    @staticmethod
    def get_project_by_name(db: Session, name: str) -> Optional[Project]:
        """Fetch project database model by name."""
        return db.query(Project).filter(Project.name == name.strip()).first()

    @staticmethod
    def create_project(db: Session, project_in: ProjectCreate, creator_name: Optional[str] = None) -> ProjectResponse:
        """Create a new project with owner and initial members."""
        clean_name = project_in.name.strip()
        existing = db.query(Project).filter(Project.name == clean_name).first()
        if existing:
            raise ValueError(f"Ya existe un proyecto con el nombre '{clean_name}'")

        owner = project_in.owner_name or creator_name or "Administrador Principal"
        members_str = ", ".join([m.strip() for m in (project_in.members or []) if m.strip()])

        # If owner is not in members, add them
        members_list = [m.strip() for m in (project_in.members or []) if m.strip()]
        if owner and owner not in members_list:
            members_list.append(owner)
            members_str = ", ".join(members_list)

        new_project = Project(
            name=clean_name,
            description=project_in.description,
            owner_name=owner,
            members=members_str
        )
        db.add(new_project)
        db.commit()
        db.refresh(new_project)

        return ProjectResponse(
            id=new_project.id,
            name=new_project.name,
            description=new_project.description,
            owner_name=new_project.owner_name,
            members=members_list,
            task_count=0,
            created_at=new_project.created_at
        )

    @staticmethod
    def update_project(
        db: Session,
        old_name: str,
        update_in: ProjectUpdate,
        current_user: Optional[str] = None,
        is_admin: bool = False
    ) -> ProjectResponse:
        """
        Update project information (name, description, owner, members).
        Only project owner or admin can update.
        """
        old_clean = old_name.strip()
        project = db.query(Project).filter(Project.name == old_clean).first()

        # If project does not exist in projects table, create it on-the-fly
        if not project:
            project = Project(
                name=old_clean,
                owner_name=current_user or "Administrador Principal",
                members=""
            )
            db.add(project)
            db.commit()
            db.refresh(project)

        # Check permissions: owner or admin
        if not is_admin and current_user:
            if project.owner_name and project.owner_name.lower() != current_user.lower():
                raise PermissionError("Solo el dueño del proyecto o un Administrador pueden modificar este proyecto.")

        new_name = (update_in.name or update_in.new_name or "").strip()
        if new_name and new_name != old_clean:
            existing = db.query(Project).filter(Project.name == new_name).first()
            if existing and existing.id != project.id:
                raise ValueError(f"Ya existe otro proyecto con el nombre '{new_name}'")
            project.name = new_name
            # Cascade rename to all associated tasks
            db.query(Task).filter(Task.project == old_clean).update(
                {"project": new_name}, synchronize_session="fetch"
            )

        if update_in.description is not None:
            project.description = update_in.description

        if update_in.owner_name is not None and is_admin:
            project.owner_name = update_in.owner_name.strip()

        if update_in.members is not None:
            clean_members = [m.strip() for m in update_in.members if m.strip()]
            project.members = ", ".join(clean_members)

        db.commit()
        db.refresh(project)

        members_list = [m.strip() for m in (project.members or "").split(",") if m.strip()]
        task_count = db.query(Task).filter(Task.project == project.name).count()

        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            owner_name=project.owner_name,
            members=members_list,
            task_count=task_count,
            created_at=project.created_at
        )

    @staticmethod
    def add_member(
        db: Session,
        project_name: str,
        member_name: str,
        current_user: Optional[str] = None,
        is_admin: bool = False
    ) -> ProjectResponse:
        """Add a member to a project. Permitted for Project Owner and Admins."""
        clean_proj = project_name.strip()
        clean_member = member_name.strip()
        project = db.query(Project).filter(Project.name == clean_proj).first()
        if not project:
            project = Project(name=clean_proj, owner_name=current_user or "Administrador Principal", members="")
            db.add(project)
            db.commit()
            db.refresh(project)

        if not is_admin and current_user:
            if project.owner_name and project.owner_name.lower() != current_user.lower():
                raise PermissionError("Solo el dueño del proyecto o un Administrador pueden agregar miembros.")

        members = [m.strip() for m in (project.members or "").split(",") if m.strip()]
        if clean_member not in members:
            members.append(clean_member)
            project.members = ", ".join(members)
            db.commit()
            db.refresh(project)

        task_count = db.query(Task).filter(Task.project == project.name).count()
        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            owner_name=project.owner_name,
            members=members,
            task_count=task_count,
            created_at=project.created_at
        )

    @staticmethod
    def remove_member(
        db: Session,
        project_name: str,
        member_name: str,
        current_user: Optional[str] = None,
        is_admin: bool = False
    ) -> ProjectResponse:
        """Remove a member from a project. Permitted for Project Owner and Admins."""
        clean_proj = project_name.strip()
        clean_member = member_name.strip()
        project = db.query(Project).filter(Project.name == clean_proj).first()
        if not project:
            raise ValueError(f"Proyecto '{clean_proj}' no encontrado")

        if not is_admin and current_user:
            if project.owner_name and project.owner_name.lower() != current_user.lower():
                raise PermissionError("Solo el dueño del proyecto o un Administrador pueden remover miembros.")

        members = [m.strip() for m in (project.members or "").split(",") if m.strip()]
        if clean_member in members:
            members = [m for m in members if m != clean_member]
            project.members = ", ".join(members)
            db.commit()
            db.refresh(project)

        task_count = db.query(Task).filter(Task.project == project.name).count()
        return ProjectResponse(
            id=project.id,
            name=project.name,
            description=project.description,
            owner_name=project.owner_name,
            members=members,
            task_count=task_count,
            created_at=project.created_at
        )

    @staticmethod
    def delete_project(
        db: Session,
        project_name: str,
        current_user: Optional[str] = None,
        is_admin: bool = False
    ) -> int:
        """Delete project and associated tasks."""
        clean_proj = project_name.strip()
        project = db.query(Project).filter(Project.name == clean_proj).first()

        if project and not is_admin and current_user:
            if project.owner_name and project.owner_name.lower() != current_user.lower():
                raise PermissionError("Solo el dueño del proyecto o un Administrador pueden eliminar este proyecto.")

        deleted_tasks = db.query(Task).filter(Task.project == clean_proj).delete(synchronize_session="fetch")
        if project:
            db.delete(project)
        db.commit()
        return deleted_tasks
