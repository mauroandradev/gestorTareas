from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import Task, User
from .controllers import hash_password

def seed_initial_data(db: Session):
    # 1. Seed initial Administrator account (No other demo accounts)
    if db.query(User).count() == 0:
        admin_user = User(
            name="Administrador Principal",
            email="admin@taskpulse.io",
            password_hash=hash_password("admin123"),
            role="Administrador",
            is_admin=True,
            avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        print("Cuenta de Administrador inicial creada: admin@taskpulse.io / admin123")

    # 2. Seed initial tasks if table is empty
    if db.query(Task).count() == 0:
        today = datetime.now()
        initial_tasks = [
            {
                "title": "Configuración inicial de la plataforma y proyectos",
                "description": "Definir los flujos de trabajo, roles del equipo y parámetros de seguridad.",
                "priority": "Urgente",
                "status": "En Progreso",
                "project": "Q3 Lanzamiento",
                "assignee": "Administrador Principal",
                "start_date": (today - timedelta(days=2)).strftime("%Y-%m-%d"),
                "due_date": (today + timedelta(days=1)).strftime("%Y-%m-%d"),
                "completed_at": None
            },
            {
                "title": "Definición del plan de desarrollo para el rediseño web",
                "description": "Estructurar los entregables y componentes de la nueva interfaz de usuario.",
                "priority": "Alta",
                "status": "Pendiente",
                "project": "Rediseño Web",
                "assignee": "Administrador Principal",
                "start_date": today.strftime("%Y-%m-%d"),
                "due_date": (today + timedelta(days=4)).strftime("%Y-%m-%d"),
                "completed_at": None
            },
            {
                "title": "Optimización de base de datos y respaldos automáticos",
                "description": "Verificar integridad de datos y programar copias de seguridad periódicas.",
                "priority": "Media",
                "status": "Pendiente",
                "project": "Infraestructura",
                "assignee": "Administrador Principal",
                "start_date": today.strftime("%Y-%m-%d"),
                "due_date": (today + timedelta(days=7)).strftime("%Y-%m-%d"),
                "completed_at": None
            },
            {
                "title": "Revisión y aprobación de la arquitectura del MVP",
                "description": "Validación de endpoints REST y arquitectura MVC en FastAPI.",
                "priority": "Baja",
                "status": "Completada",
                "project": "Soporte al Cliente",
                "assignee": "Administrador Principal",
                "start_date": (today - timedelta(days=4)).strftime("%Y-%m-%d"),
                "due_date": (today - timedelta(days=1)).strftime("%Y-%m-%d"),
                "completed_at": (today - timedelta(days=1)).strftime("%Y-%m-%d")
            }
        ]

        for item in initial_tasks:
            task = Task(**item)
            db.add(task)
        db.commit()
        print("Tareas iniciales cargadas exitosamente.")

# Alias for backward compatibility
seed_initial_tasks = seed_initial_data
