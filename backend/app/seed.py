from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import Task

def seed_initial_tasks(db: Session):
    if db.query(Task).count() > 0:
        return

    today = datetime.now()
    initial_tasks = [
        {
            "title": "Optimizar consultas de base de datos en pasarela de pagos",
            "description": "Reducir latencia de respuesta bajo 200ms implementando índices y caché.",
            "priority": "Urgente",
            "status": "En Progreso",
            "project": "Q3 Lanzamiento",
            "assignee": "Carlos Méndez",
            "due_date": (today + timedelta(days=1)).strftime("%Y-%m-%d")
        },
        {
            "title": "Implementar autenticación y permisos de usuarios",
            "description": "Configurar tokens JWT y roles de acceso para líderes y colaboradores.",
            "priority": "Alta",
            "status": "Pendiente",
            "project": "Q3 Lanzamiento",
            "assignee": "Sofía Ramos",
            "due_date": (today + timedelta(days=3)).strftime("%Y-%m-%d")
        },
        {
            "title": "Diseñar interfaz del panel de control",
            "description": "Crear componentes de interfaz con tema oscuro y diseño responsivo.",
            "priority": "Alta",
            "status": "En Progreso",
            "project": "Rediseño Web",
            "assignee": "Lucas Torres",
            "due_date": (today + timedelta(days=4)).strftime("%Y-%m-%d")
        },
        {
            "title": "Automatizar pipeline de pruebas continuas",
            "description": "Configurar ejecución automática de linters y tests unitarios.",
            "priority": "Media",
            "status": "Pendiente",
            "project": "Soporte al Cliente",
            "assignee": "Mateo Morales",
            "due_date": (today + timedelta(days=6)).strftime("%Y-%m-%d")
        },
        {
            "title": "Documentar manual de despliegue del MVP",
            "description": "Escribir guía paso a paso para ejecutar frontend y backend en local.",
            "priority": "Baja",
            "status": "Completada",
            "project": "Soporte al Cliente",
            "assignee": "Elena Vega",
            "due_date": (today - timedelta(days=1)).strftime("%Y-%m-%d")
        }
    ]

    for item in initial_tasks:
        task = Task(**item)
        db.add(task)
    db.commit()
    print("Seed inicial cargado exitosamente.")
