import uvicorn
import os
import sys

if __name__ == "__main__":
    # Ensure backend directory is in PYTHONPATH
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

    print("=" * 65)
    print("🚀 Iniciando TaskPulse (FastAPI + React SPA)")
    print("💻 Aplicación Web (Frontend): http://127.0.0.1:8000")
    print("🔗 API Base URL:              http://127.0.0.1:8000/api")
    print("📖 Documentación Swagger UI:  http://127.0.0.1:8000/docs")
    print("📖 Documentación ReDoc:       http://127.0.0.1:8000/redoc")
    print("=" * 65)

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
