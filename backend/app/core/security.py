import base64
import hashlib
import hmac
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt

_PBKDF2_ITERATIONS = 200_000
_PBKDF2_PREFIX = "pbkdf2_sha256"

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_SECRET_FILE = os.path.join(_BACKEND_DIR, ".secret_key")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "72"))


def _load_secret_key() -> str:
    """
    Clave para firmar los tokens. Orden: variable SECRET_KEY, archivo .secret_key
    (se genera una sola vez y persiste entre reinicios).
    """
    env_key = os.getenv("SECRET_KEY")
    if env_key:
        return env_key
    try:
        if os.path.isfile(_SECRET_FILE):
            with open(_SECRET_FILE, "r", encoding="utf-8") as f:
                key = f.read().strip()
                if key:
                    return key
        key = secrets.token_hex(32)
        with open(_SECRET_FILE, "w", encoding="utf-8") as f:
            f.write(key)
        try:
            os.chmod(_SECRET_FILE, 0o600)
        except OSError:
            pass
        return key
    except OSError:
        # Sin escritura en disco: clave efímera (los tokens se invalidan al reiniciar)
        return secrets.token_hex(32)


SECRET_KEY = _load_secret_key()


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Hash de contraseña con PBKDF2-HMAC-SHA256 y sal aleatoria."""
    if not salt:
        salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), _PBKDF2_ITERATIONS)
    digest = base64.b64encode(dk).decode("ascii")
    return f"{_PBKDF2_PREFIX}${_PBKDF2_ITERATIONS}${salt}${digest}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Verifica contraseña (formato nuevo PBKDF2 y formato antiguo salt$sha256)."""
    try:
        if stored_hash.startswith(_PBKDF2_PREFIX + "$"):
            _, iterations, salt, digest = stored_hash.split("$", 3)
            dk = hashlib.pbkdf2_hmac(
                "sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), int(iterations)
            )
            return hmac.compare_digest(base64.b64encode(dk).decode("ascii"), digest)

        # Formato antiguo (SHA-256 con sal): se acepta y se re-hashea al iniciar sesión
        salt, hashed = stored_hash.split("$", 1)
        computed = hashlib.sha256((plain_password + salt).encode("utf-8")).hexdigest()
        return secrets.compare_digest(computed, hashed)
    except Exception:
        return False


def needs_rehash(stored_hash: str) -> bool:
    """True si el hash guardado usa el formato antiguo."""
    return not stored_hash.startswith(_PBKDF2_PREFIX + "$")


def generate_session_token(user_id: int) -> str:
    """Genera un JWT firmado con expiración para el usuario autenticado."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_session_token(token: str) -> Optional[int]:
    """Devuelve el id de usuario si el token es válido y no ha expirado; si no, None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
