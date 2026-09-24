from .user_service import UserService
from .task_service import TaskService

user_service = UserService()
task_service = TaskService()

__all__ = ["UserService", "TaskService", "user_service", "task_service"]
