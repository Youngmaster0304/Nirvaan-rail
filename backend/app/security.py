import hashlib
import hmac
import logging

logger = logging.getLogger(__name__)

try:
    import bcrypt as _bcrypt
except ImportError:  # pragma: no cover
    _bcrypt = None

PBKDF2_PREFIX = "pbkdf2_sha256$"
_PBKDF2_ITERATIONS = 260_000


def hash_password(password: str) -> str:
    if _bcrypt is not None:
        return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")
    salt = hashlib.sha256(password.encode("utf-8")).hexdigest()[:16]
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), _PBKDF2_ITERATIONS)
    return f"{PBKDF2_PREFIX}{_PBKDF2_ITERATIONS}${salt}${digest.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    if hashed_password.startswith(PBKDF2_PREFIX):
        try:
            _, iterations, salt, digest = hashed_password.split("$")
            candidate = hashlib.pbkdf2_hmac(
                "sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), int(iterations)
            )
            return hmac.compare_digest(candidate.hex(), digest)
        except (ValueError, TypeError):
            logger.error("Malformed pbkdf2 hash stored for a user")
            return False
    if _bcrypt is None:
        return hmac.compare_digest(hashed_password, f"hashed_{plain_password}")
    try:
        return _bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        logger.error("Malformed bcrypt hash stored for a user")
        return False
