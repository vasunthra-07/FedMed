# =============================================================================
# logger.py  —  FedMed Structured Logging
# =============================================================================
# Provides:
#   • get_logger(name)  — returns a configured logger with JSON formatting
#   • RotatingFileHandler with size-based rotation and backup count
#   • Console handler (human-readable) + file handler (JSON)
#   • Automatic log-level from config.LOG_LEVEL
# =============================================================================

import json
import logging
import sys
from logging.handlers import RotatingFileHandler
from datetime import datetime, timezone

from config import LOG_LEVEL, LOG_MAX_BYTES, LOG_BACKUP_COUNT, LOGS_DIR


class _JSONFormatter(logging.Formatter):
    """
    Formats each log record as a single JSON line.
    Schema: { ts, level, logger, msg, module, line, ...extras }
    Compatible with Datadog, CloudWatch, ELK stack ingest.
    """

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts":      datetime.now(timezone.utc).isoformat(),
            "level":   record.levelname,
            "logger":  record.name,
            "msg":     record.getMessage(),
            "module":  record.module,
            "line":    record.lineno,
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        # Merge any extra fields passed via logger.info("msg", extra={...})
        for key, val in record.__dict__.items():
            if key not in (
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "message",
                "taskName",
            ):
                try:
                    json.dumps(val)   # only serialisable values
                    payload[key] = val
                except (TypeError, ValueError):
                    payload[key] = str(val)

        return json.dumps(payload, ensure_ascii=False)


class _HumanFormatter(logging.Formatter):
    """Console-friendly format: [HH:MM:SS] LEVEL  logger  message"""

    COLOURS = {
        "DEBUG":    "\033[36m",   # cyan
        "INFO":     "\033[32m",   # green
        "WARNING":  "\033[33m",   # amber
        "ERROR":    "\033[31m",   # red
        "CRITICAL": "\033[35m",   # magenta
    }
    RESET = "\033[0m"

    def format(self, record: logging.LogRecord) -> str:
        ts    = datetime.now().strftime("%H:%M:%S")
        col   = self.COLOURS.get(record.levelname, "")
        level = f"{col}{record.levelname:<8}{self.RESET}"
        return f"[{ts}] {level} {record.name:<20} {record.getMessage()}"


# Cache loggers to avoid duplicate handlers across imports
_loggers: dict[str, logging.Logger] = {}


def get_logger(name: str) -> logging.Logger:
    """
    Get (or create) a named logger with:
      - Console handler (human-readable, coloured)
      - Rotating file handler (JSON, size-based rotation)

    Args:
        name : logger name, e.g. "server", "client.Alpha", "dashboard"

    Returns:
        Configured logging.Logger instance
    """
    if name in _loggers:
        return _loggers[name]

    logger = logging.getLogger(f"fedmed.{name}")
    logger.setLevel(getattr(logging, LOG_LEVEL.upper(), logging.INFO))
    logger.propagate = False   # don't double-log to root logger

    # ── Console handler ────────────────────────────────────────────────────────
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(_HumanFormatter())
    logger.addHandler(ch)

    # ── Rotating file handler (JSON) ───────────────────────────────────────────
    log_path = LOGS_DIR / f"{name.replace('.', '_')}.jsonl"
    fh = RotatingFileHandler(
        log_path,
        maxBytes  = LOG_MAX_BYTES,
        backupCount = LOG_BACKUP_COUNT,
        encoding  = "utf-8",
    )
    fh.setFormatter(_JSONFormatter())
    logger.addHandler(fh)

    _loggers[name] = logger
    return logger
