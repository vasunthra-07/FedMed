# =============================================================================
# config.py  —  FedMed Central Configuration
# =============================================================================
# Single source of truth for every tunable parameter.
# All other modules import from here — no magic strings anywhere else.
# Override any value via environment variables (12-factor app pattern).
# =============================================================================

import os
from pathlib import Path


def _env(key: str, default: str) -> str:
    return os.environ.get(key, default)


def _env_optional(key: str) -> str | None:
    return os.environ.get(key)


def _env_int(key: str, default: int) -> int:
    return int(os.environ.get(key, str(default)))


def _env_float(key: str, default: float) -> float:
    return float(os.environ.get(key, str(default)))


def _env_bool(key: str, default: bool) -> bool:
    return os.environ.get(key, str(default)).lower() in ("1", "true", "yes")


# =============================================================================
# PATHS
# =============================================================================

BASE_DIR        = Path(__file__).parent
STATE_DIR       = Path(_env("FEDMED_STATE_DIR", str(BASE_DIR)))
RESULTS_DIR     = Path(_env("FEDMED_RESULTS_DIR", str(BASE_DIR / "results")))
CERTS_DIR       = Path(_env("FEDMED_CERTS_DIR", str(BASE_DIR / "certs")))
CHECKPOINTS_DIR = Path(_env("FEDMED_CHECKPOINTS_DIR", str(BASE_DIR / "checkpoints")))
LOGS_DIR        = Path(_env("FEDMED_LOGS_DIR", str(BASE_DIR / "logs")))
METRICS_CSV     = STATE_DIR / "metrics.csv"
TELEMETRY_JSONL = STATE_DIR / "telemetry.jsonl"
STATUS_JSON     = STATE_DIR / "status.json"
MU_CONFIG       = STATE_DIR / "mu_config.json"

# Ensure runtime dirs exist
for _d in (STATE_DIR, RESULTS_DIR, CERTS_DIR, CHECKPOINTS_DIR, LOGS_DIR):
    _d.mkdir(parents=True, exist_ok=True)


# =============================================================================
# SERVER
# =============================================================================

SERVER_HOST             = _env("FEDMED_SERVER_HOST", "0.0.0.0")
SERVER_PORT             = _env_int("FEDMED_SERVER_PORT", 8080)
SERVER_ADDRESS          = f"{SERVER_HOST}:{SERVER_PORT}"

NUM_ROUNDS              = _env_int("FEDMED_NUM_ROUNDS", 10)
MIN_CLIENTS             = _env_int("FEDMED_MIN_CLIENTS", 2)
FRACTION_FIT            = _env_float("FEDMED_FRACTION_FIT", 1.0)
FRACTION_EVAL           = _env_float("FEDMED_FRACTION_EVAL", 1.0)

TARGET_ACCURACY         = _env_float("FEDMED_TARGET_ACCURACY", 0.75)
RESUME_FROM_CHECKPOINT  = _env_bool("FEDMED_RESUME", False)


# =============================================================================
# FEDPROX / FEDAVG
# =============================================================================

FEDPROX_MU              = _env_float("FEDMED_MU", 0.01)
LOCAL_EPOCHS            = _env_int("FEDMED_LOCAL_EPOCHS", 3)
BATCH_SIZE              = _env_int("FEDMED_BATCH_SIZE", 32)
LEARNING_RATE           = _env_float("FEDMED_LR", 0.01)
SGD_MOMENTUM            = _env_float("FEDMED_MOMENTUM", 0.9)
WEIGHT_DECAY            = _env_float("FEDMED_WEIGHT_DECAY", 1e-4)


# =============================================================================
# DIFFERENTIAL PRIVACY
# =============================================================================

DP_NOISE_MULTIPLIER     = _env_float("FEDMED_DP_NOISE", 1.2)
DP_MAX_GRAD_NORM        = _env_float("FEDMED_DP_CLIP", 1.0)
DP_TARGET_DELTA         = _env_float("FEDMED_DP_DELTA", 1e-5)
SERVER_DP_NOISE_STD     = _env_float("FEDMED_SERVER_DP_NOISE", 0.005)
MAX_CLIENT_UPDATE_NORM  = _env_float("FEDMED_MAX_UPDATE_NORM", 100.0)
CLIENT_UPDATE_CLIP_VALUE = _env_float("FEDMED_UPDATE_CLIP_VALUE", 0.25)
SUSPICIOUS_UPDATE_NORM  = _env_float("FEDMED_SUSPICIOUS_UPDATE_NORM", 25.0)
CLIENT_DP_ENABLED      = _env_bool("FEDMED_CLIENT_DP", True)


# =============================================================================
# SECURITY / TLS
# =============================================================================

USE_TLS                 = _env_bool("FEDMED_USE_TLS", True)
TLS_CA_CERT             = CERTS_DIR / "ca.crt"
TLS_SERVER_CERT         = CERTS_DIR / "server.crt"
TLS_SERVER_KEY          = CERTS_DIR / "server.key"
TLS_CLIENT_CERT         = CERTS_DIR / "client.crt"
TLS_CLIENT_KEY          = CERTS_DIR / "client.key"

# JWT for dashboard authentication
JWT_SECRET              = _env_optional("FEDMED_JWT_SECRET")
JWT_ALGORITHM           = "HS256"
JWT_EXPIRY_HOURS        = _env_int("FEDMED_JWT_EXPIRY_HOURS", 8)

# Streamlit dashboard credentials (override via env in production)
DASHBOARD_USERNAME      = _env("FEDMED_DASH_USER", "admin")
DASHBOARD_PASSWORD_HASH = _env_optional("FEDMED_DASH_PASS_HASH")


def validate_runtime_config(require_dashboard: bool = False) -> None:
    """Fail fast when required runtime secrets are missing or placeholders."""
    bad_values = {
        "",
        "CHANGE_THIS_IN_PRODUCTION_USE_SECRETS_MANAGER",
        "CHANGE_THIS_TO_A_RANDOM_64_CHARACTER_SECRET",
        "change-me-in-production",
        "your-long-random-secret",
    }
    if not JWT_SECRET or JWT_SECRET in bad_values or len(JWT_SECRET) < 32:
        raise RuntimeError(
            "FEDMED_JWT_SECRET must be set to a cryptographically random value "
            "of at least 32 characters."
        )
    if require_dashboard:
        if not DASHBOARD_PASSWORD_HASH or DASHBOARD_PASSWORD_HASH in bad_values:
            raise RuntimeError("FEDMED_DASH_PASS_HASH must be set to a bcrypt password hash.")
        if not DASHBOARD_PASSWORD_HASH.startswith("$2"):
            raise RuntimeError("FEDMED_DASH_PASS_HASH must be a bcrypt hash, not plaintext.")


# =============================================================================
# DATA
# =============================================================================

DATASET_DOWNLOAD        = _env_bool("FEDMED_DOWNLOAD", True)
SYNTHETIC_DATA          = _env_bool("FEDMED_SYNTHETIC_DATA", False)
SYNTHETIC_TEST_SAMPLES  = _env_int("FEDMED_SYNTHETIC_TEST_SAMPLES", 96)
SAMPLES_PER_CLIENT      = _env_int("FEDMED_SAMPLES_PER_CLIENT", 2000)
BIAS_FRACTION           = _env_float("FEDMED_BIAS_FRACTION", 0.75)
NUM_DATALOADER_WORKERS  = _env_int("FEDMED_NUM_WORKERS", 4)   # was 0 — now uses multiprocessing
EVAL_BATCH_SIZE         = _env_int("FEDMED_EVAL_BATCH_SIZE", 64)


# =============================================================================
# LOGGING
# =============================================================================

LOG_LEVEL               = _env("FEDMED_LOG_LEVEL", "INFO")
LOG_MAX_BYTES           = _env_int("FEDMED_LOG_MAX_BYTES", 10 * 1024 * 1024)  # 10 MB
LOG_BACKUP_COUNT        = _env_int("FEDMED_LOG_BACKUP_COUNT", 5)
TELEMETRY_MAX_LINES     = _env_int("FEDMED_TELEMETRY_MAX_LINES", 5000)


# =============================================================================
# CHECKPOINTING
# =============================================================================

CHECKPOINT_EVERY_N      = _env_int("FEDMED_CHECKPOINT_EVERY", 1)   # every N rounds
KEEP_LAST_N_CHECKPOINTS = _env_int("FEDMED_KEEP_CHECKPOINTS", 3)


# =============================================================================
# DASHBOARD / STREAMLIT
# =============================================================================

DASHBOARD_PORT          = _env_int("FEDMED_DASH_PORT", 8501)
DASHBOARD_REFRESH_S     = _env_int("FEDMED_DASH_REFRESH", 5)
MAX_UPLOAD_MB           = _env_int("FEDMED_MAX_UPLOAD_MB", 10)
ALLOWED_IMAGE_TYPES     = {"png", "jpg", "jpeg", "bmp", "tiff"}


# =============================================================================
# RETRY / RESILIENCE
# =============================================================================

GRPC_MAX_RETRIES        = _env_int("FEDMED_GRPC_RETRIES", 5)
GRPC_RETRY_DELAY_S      = _env_float("FEDMED_GRPC_RETRY_DELAY", 3.0)
GRPC_RETRY_BACKOFF      = _env_float("FEDMED_GRPC_BACKOFF", 1.5)


# =============================================================================
# HOSPITAL METADATA
# =============================================================================

HOSPITAL_NAMES          = {0: "Alpha", 1: "Beta", 2: "Gamma"}
HOSPITAL_SPECIALTIES    = {
    0: "Pneumonia / Infiltration",
    1: "Cardiomegaly / Edema",
    2: "Pneumothorax / Mass",
}
CLIENT_CLASS_BIAS       = {
    0: [6, 3, 0],
    1: [1, 9, 2],
    2: [7, 4, 10],
}
