"""
Migra todos los datos de SQLite a MySQL conservando IDs.

Uso (desde la carpeta backend):
    python migrate_sqlite_to_mysql.py sqlite:///./taskpulse_v4.db "mysql+pymysql://user:pass@host:3306/tareas?charset=utf8mb4"

La base MySQL debe existir (vacia). Las tablas se crean con los modelos.
"""
import sys
from sqlalchemy import create_engine, select, func, text

# Importar modelos para registrarlos en Base.metadata
from app.core.database import Base
import app.models  # noqa: F401


def main(src_url: str, dst_url: str) -> None:
    src = create_engine(src_url)
    dst = create_engine(dst_url, pool_pre_ping=True)

    Base.metadata.create_all(bind=dst)

    with dst.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())

        for table in Base.metadata.sorted_tables:
            with src.connect() as s:
                rows = [dict(r._mapping) for r in s.execute(select(table))]
            if rows:
                for i in range(0, len(rows), 500):
                    conn.execute(table.insert(), rows[i:i + 500])
            print(f"{table.name}: {len(rows)} filas copiadas")
        conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))

    # Verificacion
    ok = True
    for table in Base.metadata.sorted_tables:
        with src.connect() as s, dst.connect() as d:
            a = s.execute(select(func.count()).select_from(table)).scalar()
            b = d.execute(select(func.count()).select_from(table)).scalar()
        flag = "OK" if a == b else "DIFERENTE"
        ok &= a == b
        print(f"verificacion {table.name}: sqlite={a} mysql={b} {flag}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
