import hashlib
import secrets
import uuid
from typing import Optional


def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Hash password using SHA-256 with a random salt."""
    if not salt:
        salt = secrets.token_hex(8)
    hashed = hashlib.sha256((password + salt).encode("utf-8")).hexdigest()
    return f"{salt}${hashed}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Verify plain password against stored salt$hash with timing-attack resistance."""
    try:
        salt, hashed = stored_hash.split("$", 1)
        computed = hashlib.sha256((plain_password + salt).encode("utf-8")).hexdigest()
        return secrets.compare_digest(computed, hashed)
    except Exception:
        return False


def generate_session_token(user_id: int) -> str:
    """Generate unique session token for authenticated users."""
    return f"taskpulse_{user_id}_{uuid.uuid4().hex[:16]}"
