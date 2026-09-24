import uvicorn
import os
import sys

if __name__ == "__main__":
    # Ensure backend directory is in PYTHONPATH
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

    from app.core.config import settings

    host = settings.HOST
    port = settings.PORT

    print("=" * 65)
    print("🚀 Iniciando Gestor de Tareas (FastAPI + React SPA)")
    print(f"💻 Frontend / Servidor: http://{host}:{port}")
    print(f"🔗 API Base URL:        http://{host}:{port}/api")
    print(f"📖 Swagger Docs:        http://{host}:{port}/docs")
    print(f"📁 Directorio Frontend: {settings.FRONTEND_DIST_DIR}")
    print("=" * 65)

    uvicorn.run("app.main:app", host=host, port=port, reload=True)
