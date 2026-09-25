from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models.user import User
from ..models.task import Task
from ..models.role import Role
from ..models.project import Project
from ..core.security import hash_password


def seed_initial_data(db: Session) -> None:
    """Seed initial administrator user, roles, projects, and sample tasks if tables are empty."""
    # 1. Seed initial Roles if empty
    if db.query(Role).count() == 0:
        default_roles = [
            ("Administrador", "Acceso completo a la plataforma, gestión de usuarios y roles"),
            ("Líder de Proyecto", "Planificación estratégica, asignación de tareas y seguimiento"),
            ("Desarrollador", "Implementación de código, lógica y funcionalidades del sistema"),
            ("Diseñador UI/UX", "Diseño de interfaces, experiencia de usuario y maquetación"),
            ("QA Engineer", "Aseguramiento de calidad, pruebas y reporte de incidencias"),
            ("DevOps Engineer", "Infraestructura, despliegues continuos y soporte de servidores"),
            ("Miembro", "Colaborador general con permisos estándar"),
        ]
        for name, desc in default_roles:
            role_obj = Role(name=name, description=desc)
            db.add(role_obj)
        db.commit()
        print("[OK] Roles iniciales del sistema cargados exitosamente.")

    # 2. Seed initial Administrator account if no users exist
    if db.query(User).count() == 0:
        admin_user = User(
            name="Administrador Principal",
            email="admin@taskpulse.io",
            password_hash=hash_password("admin123"),
            role="Administrador",
            is_admin=True,
            avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
            is_active=True,
        )
        db.add(admin_user)
        db.commit()
        print("[OK] Cuenta de Administrador inicial creada: admin@taskpulse.io / admin123")

    # 3. Seed initial Projects if table is empty
    if db.query(Project).count() == 0:
        initial_projects = [
            ("Q3 Lanzamiento", "Lanzamiento y despliegue del producto para el tercer trimestre", "Administrador Principal", "Administrador Principal"),
            ("Rediseño Web", "Modernización completa de interfaces de usuario y experiencia visual", "Administrador Principal", "Administrador Principal"),
            ("Soporte al Cliente", "Gestión de solicitudes, resolución de dudas y tickets técnicos", "Administrador Principal", "Administrador Principal"),
            ("Infraestructura", "Mantenimiento de servidores, bases de datos y seguridad", "Administrador Principal", "Administrador Principal"),
        ]
        for name, desc, owner, members in initial_projects:
            proj_obj = Project(name=name, description=desc, owner_name=owner, members=members)
            db.add(proj_obj)
        db.commit()
        print("[OK] Proyectos iniciales cargados exitosamente.")

    # 4. Seed initial tasks if table is empty
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
                "completed_at": None,
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
                "completed_at": None,
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
                "completed_at": None,
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
                "completed_at": (today - timedelta(days=1)).strftime("%Y-%m-%d"),
            },
        ]

        for item in initial_tasks:
            task = Task(**item)
            db.add(task)
        db.commit()
        print("[OK] Tareas iniciales cargadas exitosamente.")
