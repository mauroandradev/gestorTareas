from .user_service import UserService
from .task_service import TaskService
from .role_service import RoleService
from .project_service import ProjectService

user_service = UserService()
task_service = TaskService()
role_service = RoleService()
project_service = ProjectService()

__all__ = [
    "UserService",
    "TaskService",
    "RoleService",
    "ProjectService",
    "user_service",
    "task_service",
    "role_service",
    "project_service"
]
