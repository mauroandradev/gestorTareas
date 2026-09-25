from .user_service import UserService
from .task_service import TaskService
from .role_service import RoleService

user_service = UserService()
task_service = TaskService()
role_service = RoleService()

__all__ = [
    "UserService",
    "TaskService",
    "RoleService",
    "user_service",
    "task_service",
    "role_service"
]
