# Gestor de Tareas de Equipo (TaskPulse API) - Backend

Backend profesional y modular construido con **FastAPI**, **SQLAlchemy** y **Pydantic**, organizado por capas bajo principios de Clean Architecture y separación de responsabilidades.

---

## 🏛️ Estructura Modular del Backend

```
backend/
├── app/
│   ├── api/                 # Controladores y Routers API
│   │   ├── auth.py          # Endpoints de autenticación y gestión de usuarios
│   │   ├── tasks.py         # Endpoints CRUD de tareas y filtros
│   │   ├── stats.py         # Endpoint de métricas y estadísticas
│   │   └── router.py        # Agrupador central de routers (/api)
│   ├── core/                # Configuración, Base de Datos y Seguridad
│   │   ├── config.py        # Parámetros globales y variables de entorno
│   │   ├── database.py      # Motor SQLAlchemy, SessionLocal y dependencias
│   │   └── security.py      # Hashing seguro SHA-256 + salt y tokens
│   ├── db/                  # Inicialización y sembrado
│   │   └── seed.py          # Carga de administrador y tareas iniciales
│   ├── models/              # Modelos de base de datos (SQLAlchemy ORM)
│   │   ├── user.py          # Modelo de Usuario
│   │   └── task.py          # Modelo de Tarea
│   ├── schemas/             # Esquemas de validación y serialización (Pydantic)
│   │   ├── user.py          # Esquemas de Usuario (Create, Update, Response, Login)
│   │   └── task.py          # Esquemas de Tareas y Estadísticas
│   ├── services/            # Lógica de negocio desacoplada
│   │   ├── user_service.py  # Operaciones y reglas de negocio para usuarios
│   │   └── task_service.py  # Operaciones y reglas de negocio para tareas
│   └── main.py              # Inicialización de FastAPI, middlewares y SPA estático
├── requirements.txt
└── run.py                   # Script de inicio del servidor
```

---

## 📡 Endpoints de la API

### Autenticación y Usuarios
* `POST /api/auth/login` - Iniciar sesión (correo y contraseña)
* `GET /api/auth/users` - Listar usuarios registrados
* `POST /api/auth/users` - Crear usuario (Admin)
* `PUT /api/auth/users/{id}` - Actualizar usuario / rol / contraseña
* `DELETE /api/auth/users/{id}` - Eliminar usuario

### Tareas
* `GET /api/tasks` - Listar tareas con filtros (`search`, `status`, `priority`, `project`, `assignee`, `from_date`, `to_date`)
* `GET /api/tasks/{id}` - Detalle de una tarea
* `POST /api/tasks` - Crear nueva tarea
* `PUT /api/tasks/{id}` - Actualizar tarea completa
* `PATCH /api/tasks/{id}/status` - Cambio rápido de estado
* `DELETE /api/tasks/{id}` - Eliminar tarea

### Métricas
* `GET /api/stats` - Métricas numéricas por estado, prioridad y proyecto

---

## 🚀 Cómo Iniciar el Backend

```bash
# Desde la carpeta backend:
python run.py
```
* **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
