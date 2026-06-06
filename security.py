# =============================================================================
# security.py  —  FedMed Security Layer
# =============================================================================
# Provides:
#   • generate_certs()   — self-signed CA + server + client mTLS certificates
#   • get_server_credentials() / get_client_credentials() — grpc SSL objects
#   • create_jwt() / verify_jwt()  — dashboard session tokens
#   • validate_image_upload()      — file type + size validation
#   • hash_password() / verify_password()  — bcrypt wrappers
# =============================================================================

from __future__ import annotations

import hashlib
import io
import os
import struct
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from logger import get_logger

log = get_logger("security")

ROLE_PERMISSIONS = {
    "admin": {"dashboard:read", "metrics:read", "model:analyze", "settings:write", "users:manage"},
    "researcher": {"dashboard:read", "metrics:read", "model:analyze"},
    "viewer": {"dashboard:read", "metrics:read"},
}


def normalize_role(role: str | None) -> str:
    role = (role or "viewer").lower()
    return role if role in ROLE_PERMISSIONS else "viewer"


def has_permission(role: str | None, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(normalize_role(role), set())

# ── Optional heavy deps — degrade gracefully ──────────────────────────────────
try:
    import jwt as _jwt
    JWT_AVAILABLE = True
except ImportError:
    JWT_AVAILABLE = False
    log.warning("PyJWT not installed — JWT auth disabled. pip install pyjwt")

try:
    import bcrypt as _bcrypt
    BCRYPT_AVAILABLE = True
except ImportError:
    BCRYPT_AVAILABLE = False
    log.warning("bcrypt not installed — password hashing uses SHA-256 fallback")

try:
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    log.warning("cryptography not installed — TLS cert generation disabled. pip install cryptography")

try:
    import grpc
    GRPC_AVAILABLE = True
except ImportError:
    GRPC_AVAILABLE = False

from config import (
    CERTS_DIR, JWT_ALGORITHM, JWT_EXPIRY_HOURS, JWT_SECRET,
    MAX_UPLOAD_MB, ALLOWED_IMAGE_TYPES,
    TLS_CA_CERT, TLS_SERVER_CERT, TLS_SERVER_KEY,
    TLS_CLIENT_CERT, TLS_CLIENT_KEY,
)


def _require_jwt_secret() -> str:
    if not JWT_SECRET or len(JWT_SECRET) < 32:
        raise RuntimeError("FEDMED_JWT_SECRET is required before issuing or verifying tokens.")
    return JWT_SECRET


# =============================================================================
# mTLS CERTIFICATE GENERATION
# =============================================================================

def generate_certs(force: bool = False) -> bool:
    """
    Generate a self-signed PKI for mutual TLS (mTLS):
      • CA key + certificate (root of trust)
      • Server key + certificate (signed by CA)
      • Client key + certificate (signed by CA)

    In mTLS, both sides present certificates — the server proves it's the
    real FedMed aggregator, and each client proves it's an authorised hospital.
    This prevents rogue nodes from joining the federation.

    For production: replace these self-signed certs with certs from a real CA
    (e.g. Let's Encrypt for the server, your internal PKI for clients).

    Args:
        force : regenerate even if certs already exist

    Returns:
        True if certs were generated, False if already present
    """
    if not CRYPTO_AVAILABLE:
        log.error("cryptography package required for cert generation")
        return False

    if not force and TLS_SERVER_CERT.exists() and TLS_CLIENT_CERT.exists():
        log.info("TLS certificates already exist — skipping generation")
        return False

    log.info("Generating mTLS certificates...")

    def _new_key():
        return rsa.generate_private_key(public_exponent=65537, key_size=2048)

    def _cert_builder(subject_cn: str, issuer_name, serial: int):
        return (
            x509.CertificateBuilder()
            .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, subject_cn)]))
            .issuer_name(issuer_name)
            .serial_number(serial)
            .not_valid_before(datetime.now(timezone.utc))
            .not_valid_after(datetime.now(timezone.utc) + timedelta(days=365))
        )

    def _save_key(key, path: Path):
        path.write_bytes(key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.TraditionalOpenSSL,
            serialization.NoEncryption(),
        ))
        path.chmod(0o600)

    def _save_cert(cert, path: Path):
        path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))

    # ── CA ──────────────────────────────────────────────────────────────────────
    ca_key  = _new_key()
    ca_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "FedMed-CA")])
    ca_cert = (
        _cert_builder("FedMed-CA", ca_name, 1)
        .public_key(ca_key.public_key())
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(ca_key, hashes.SHA256())
    )
    _save_key(ca_key, CERTS_DIR / "ca.key")
    _save_cert(ca_cert, TLS_CA_CERT)

    # ── Server ──────────────────────────────────────────────────────────────────
    srv_key  = _new_key()
    srv_cert = (
        _cert_builder("fedmed-server", ca_name, 2)
        .public_key(srv_key.public_key())
        .add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.DNSName("fedmed-server"),
            ]),
            critical=False,
        )
        .sign(ca_key, hashes.SHA256())
    )
    _save_key(srv_key, TLS_SERVER_KEY)
    _save_cert(srv_cert, TLS_SERVER_CERT)

    # ── Client ──────────────────────────────────────────────────────────────────
    cli_key  = _new_key()
    cli_cert = (
        _cert_builder("fedmed-client", ca_name, 3)
        .public_key(cli_key.public_key())
        .sign(ca_key, hashes.SHA256())
    )
    _save_key(cli_key, TLS_CLIENT_KEY)
    _save_cert(cli_cert, TLS_CLIENT_CERT)

    log.info(f"mTLS certificates written to {CERTS_DIR}")
    return True


def get_server_credentials():
    """
    Return gRPC SSL server credentials for mTLS.
    Requires: CA cert, server cert+key.
    Client must present a cert signed by our CA.
    """
    if not GRPC_AVAILABLE or not CRYPTO_AVAILABLE:
        return None
    if not TLS_SERVER_CERT.exists():
        generate_certs()

    ca_cert  = TLS_CA_CERT.read_bytes()
    srv_cert = TLS_SERVER_CERT.read_bytes()
    srv_key  = TLS_SERVER_KEY.read_bytes()

    return grpc.ssl_server_credentials(
        [(srv_key, srv_cert)],
        root_certificates        = ca_cert,
        require_client_auth      = True,   # mTLS — reject unauthenticated clients
    )


def get_client_credentials():
    """
    Return gRPC SSL channel credentials for mTLS.
    Requires: CA cert, client cert+key.
    """
    if not GRPC_AVAILABLE or not CRYPTO_AVAILABLE:
        return None
    if not TLS_CLIENT_CERT.exists():
        generate_certs()

    ca_cert  = TLS_CA_CERT.read_bytes()
    cli_cert = TLS_CLIENT_CERT.read_bytes()
    cli_key  = TLS_CLIENT_KEY.read_bytes()

    return grpc.ssl_channel_credentials(
        root_certificates = ca_cert,
        private_key       = cli_key,
        certificate_chain = cli_cert,
    )


def get_flower_server_certificates() -> tuple[bytes, bytes, bytes] | None:
    """
    Return the certificate tuple expected by Flower start_server:
    (CA certificate, server certificate, server private key).

    Flower 1.8's public client API accepts root certificates but does not accept
    a client certificate/private key, so this enables server-authenticated TLS,
    not mutual TLS.
    """
    if not CRYPTO_AVAILABLE:
        return None
    if not TLS_SERVER_CERT.exists():
        generate_certs()
    return (
        TLS_CA_CERT.read_bytes(),
        TLS_SERVER_CERT.read_bytes(),
        TLS_SERVER_KEY.read_bytes(),
    )


def get_client_root_certificates() -> bytes | None:
    """Return CA certificate bytes expected by Flower client startup."""
    if not CRYPTO_AVAILABLE:
        return None
    if not TLS_CA_CERT.exists():
        generate_certs()
    return TLS_CA_CERT.read_bytes()


# =============================================================================
# JWT  —  dashboard session tokens
# =============================================================================

def create_jwt(username: str, role: str = "viewer") -> str:
    """
    Issue a signed JWT for the given username.
    Payload: { sub, iat, exp }
    Signed with HS256 + JWT_SECRET.

    Returns:
        Encoded JWT string (store in st.session_state, not a cookie)
    """
    secret = _require_jwt_secret()
    if not JWT_AVAILABLE:
        # Degrade to a simple HMAC token
        return _hmac_token(username, role)

    payload = {
        "sub": username,
        "role": normalize_role(role),
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return _jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)


def verify_jwt(token: str) -> Optional[str]:
    """
    Verify a JWT and return the username (sub claim).

    Returns:
        Username string if valid, None if expired/invalid.
    """
    secret = _require_jwt_secret()
    if not JWT_AVAILABLE:
        return _verify_hmac_token(token)

    try:
        payload = _jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except _jwt.ExpiredSignatureError:
        log.warning("JWT expired")
        return None
    except _jwt.InvalidTokenError as e:
        log.warning(f"Invalid JWT: {e}")
        return None


def _hmac_token(username: str, role: str = "viewer") -> str:
    """Fallback HMAC token when PyJWT is unavailable."""
    import hmac, base64, time
    secret = _require_jwt_secret()
    ts      = str(int(time.time() + JWT_EXPIRY_HOURS * 3600))
    payload = f"{username}:{normalize_role(role)}:{ts}"
    sig     = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}:{sig}".encode()).decode()


def _verify_hmac_token(token: str) -> Optional[str]:
    import hmac, base64, time
    secret = _require_jwt_secret()
    try:
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        parts = decoded.rsplit(":", 3)
        if len(parts) == 4:
            username, role, ts, sig = parts
            payload = f"{username}:{role}:{ts}"
        else:
            username, ts, sig = decoded.rsplit(":", 2)
            payload = f"{username}:{ts}"
        if int(ts) < int(time.time()):
            return None
        expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(sig, expected):
            return username
    except Exception:
        pass
    return None


def get_jwt_claims(token: str) -> Optional[dict]:
    """Return verified JWT claims with a normalized role, or None."""
    secret = _require_jwt_secret()
    if not JWT_AVAILABLE:
        username = _verify_hmac_token(token)
        return {"sub": username, "role": "viewer"} if username else None
    try:
        payload = _jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
        payload["role"] = normalize_role(payload.get("role"))
        return payload
    except (_jwt.ExpiredSignatureError, _jwt.InvalidTokenError):
        return None


# =============================================================================
# PASSWORD HASHING
# =============================================================================

def hash_password(password: str) -> str:
    """
    Hash a password with bcrypt (12 rounds).
    Falls back to SHA-256 + salt if bcrypt unavailable.
    """
    if BCRYPT_AVAILABLE:
        return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt(rounds=12)).decode()
    # Fallback: SHA-256 with a random salt (not as strong as bcrypt)
    salt   = os.urandom(16).hex()
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return f"sha256:{salt}:{hashed}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify a plaintext password against a stored hash."""
    if BCRYPT_AVAILABLE and hashed.startswith("$2"):
        try:
            return _bcrypt.checkpw(password.encode(), hashed.encode())
        except Exception:
            return False
    if hashed.startswith("sha256:"):
        _, salt, stored = hashed.split(":", 2)
        return hashlib.sha256(f"{salt}{password}".encode()).hexdigest() == stored
    return False


# =============================================================================
# FILE VALIDATION
# =============================================================================

# Magic bytes for each allowed image type
_MAGIC: dict[str, list[bytes]] = {
    "png":  [b"\x89PNG"],
    "jpg":  [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "bmp":  [b"BM"],
    "tiff": [b"II*\x00", b"MM\x00*"],
}


def validate_image_upload(
    file_bytes: bytes,
    filename: str,
    max_mb: int = MAX_UPLOAD_MB,
) -> tuple[bool, str]:
    """
    Validate an uploaded image file for:
      1. File size (≤ max_mb)
      2. Extension whitelist
      3. Magic byte verification (prevents extension spoofing)

    Args:
        file_bytes : raw bytes from the upload
        filename   : original filename (for extension check)
        max_mb     : maximum allowed file size in MB

    Returns:
        (is_valid: bool, error_message: str)
        error_message is empty string when is_valid is True.
    """
    # Size check
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > max_mb:
        return False, f"File too large ({size_mb:.1f} MB). Maximum is {max_mb} MB."

    # Extension check
    ext = Path(filename).suffix.lstrip(".").lower()
    if ext not in ALLOWED_IMAGE_TYPES:
        return False, f"File type '{ext}' not allowed. Accepted: {', '.join(ALLOWED_IMAGE_TYPES)}"

    # Magic byte check (prevents SVG/HTML disguised as PNG, etc.)
    magic_patterns = _MAGIC.get(ext, [])
    if magic_patterns:
        matched = any(file_bytes.startswith(m) for m in magic_patterns)
        if not matched:
            return False, f"File content does not match extension '{ext}' — possible spoofing attempt."

    # Minimum size sanity check
    if len(file_bytes) < 64:
        return False, "File appears empty or corrupt."

    return True, ""
