import uvicorn
import os

if __name__ == "__main__":
    # Ensure current directory is in PYTHONPATH
    import sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

    print("=" * 60)
    print("🚀 Iniciando TaskPulse FastAPI Backend (MVC)")
    print("📖 Documentación Swagger UI: http://127.0.0.1:8000/docs")
    print("📖 Documentación ReDoc:      http://127.0.0.1:8000/redoc")
    print("🔗 API Base URL:             http://127.0.0.1:8000/api/v1")
    print("=" * 60)
    
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
