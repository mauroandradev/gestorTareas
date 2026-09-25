from fastapi import APIRouter
from .auth import router as auth_router
from .tasks import router as tasks_router
from .stats import router as stats_router
from .projects import router as projects_router
from .roles import router as roles_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(tasks_router)
api_router.include_router(stats_router)
api_router.include_router(projects_router)
api_router.include_router(roles_router)
