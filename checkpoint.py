# =============================================================================
# checkpoint.py  —  FedMed Model Checkpointing
# =============================================================================
# Provides:
#   • save_checkpoint()    — persist global model + training state to disk
#   • load_checkpoint()    — restore model + state, return round to resume from
#   • list_checkpoints()   — enumerate saved checkpoints (newest first)
#   • prune_checkpoints()  — keep only the N most recent files
# =============================================================================

import json
import shutil
import time
from pathlib import Path
from typing import Optional

import torch
import numpy as np

from config import CHECKPOINTS_DIR, KEEP_LAST_N_CHECKPOINTS
from logger import get_logger

log = get_logger("checkpoint")


# Checkpoint filename pattern: checkpoint_round_{N:03d}_{timestamp}.pt
_FMT = "checkpoint_round_{round:03d}_{ts}.pt"
_META_FMT = "checkpoint_round_{round:03d}_{ts}.meta.json"


def save_checkpoint(
    model_state_dict: dict,
    round_num: int,
    metrics: dict,
    epsilon: float,
    mu: float,
) -> Path:
    """
    Save a training checkpoint to CHECKPOINTS_DIR.

    Saves two files atomically (write-to-temp → rename):
      • {name}.pt         — model weights (torch format)
      • {name}.meta.json  — round number, metrics, hyperparams

    Atomic write pattern prevents a corrupt checkpoint if the process
    is killed mid-write (the rename is atomic on POSIX filesystems).

    Args:
        model_state_dict : model.state_dict() from the global model
        round_num        : FL round just completed
        metrics          : dict of {'loss': float, 'accuracy': float}
        epsilon          : privacy budget spent so far
        mu               : FedProx μ value used this round

    Returns:
        Path to the saved .pt file
    """
    ts   = int(time.time())
    name = f"checkpoint_round_{round_num:03d}_{ts}"

    pt_path   = CHECKPOINTS_DIR / f"{name}.pt"
    meta_path = CHECKPOINTS_DIR / f"{name}.meta.json"
    tmp_pt    = CHECKPOINTS_DIR / f"{name}.pt.tmp"
    tmp_meta  = CHECKPOINTS_DIR / f"{name}.meta.json.tmp"

    # ── Write model weights ────────────────────────────────────────────────────
    torch.save(model_state_dict, tmp_pt)
    tmp_pt.rename(pt_path)

    # ── Write metadata ─────────────────────────────────────────────────────────
    meta = {
        "round":         round_num,
        "timestamp":     ts,
        "loss":          round(metrics.get("loss", 0.0), 6),
        "accuracy":      round(metrics.get("accuracy", 0.0), 6),
        "epsilon_spent": round(epsilon, 4),
        "mu":            mu,
        "pt_file":       pt_path.name,
    }
    tmp_meta.write_text(json.dumps(meta, indent=2))
    tmp_meta.rename(meta_path)

    log.info(
        f"Checkpoint saved → {pt_path.name}  "
        f"(round={round_num}, acc={meta['accuracy']:.4f}, ε={epsilon:.4f})"
    )

    # ── Prune old checkpoints ──────────────────────────────────────────────────
    prune_checkpoints()

    return pt_path


def load_checkpoint(
    model,
    device: torch.device,
    specific_round: Optional[int] = None,
) -> tuple[int, dict]:
    """
    Load the most recent (or a specific) checkpoint into `model`.

    Args:
        model          : MedXRayCNN instance (will be mutated in-place)
        device         : torch device
        specific_round : if given, load checkpoint for exactly this round

    Returns:
        (round_num, meta_dict)
        round_num = 0 if no checkpoint found (train from scratch)
    """
    checkpoints = list_checkpoints()
    if not checkpoints:
        log.info("No checkpoints found — starting from round 0")
        return 0, {}

    if specific_round is not None:
        matching = [c for c in checkpoints if c["round"] == specific_round]
        if not matching:
            log.warning(f"No checkpoint for round {specific_round} — starting from round 0")
            return 0, {}
        target = matching[0]
    else:
        target = checkpoints[0]   # newest first

    pt_path = CHECKPOINTS_DIR / target["pt_file"]

    try:
        state_dict = torch.load(pt_path, map_location=device, weights_only=True)
        model.load_state_dict(state_dict)
        log.info(
            f"Resumed from checkpoint round {target['round']}  "
            f"(acc={target.get('accuracy', '?'):.4f})"
        )
        return target["round"], target
    except Exception as e:
        log.error(f"Failed to load checkpoint {pt_path}: {e}", exc_info=True)
        return 0, {}


def list_checkpoints() -> list[dict]:
    """
    Return all checkpoints sorted newest-first.
    Each entry is the parsed metadata dict with a 'pt_file' key.
    """
    meta_files = sorted(
        CHECKPOINTS_DIR.glob("checkpoint_round_*.meta.json"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    result = []
    for mf in meta_files:
        try:
            meta = json.loads(mf.read_text())
            result.append(meta)
        except Exception:
            pass
    return result


def prune_checkpoints(keep: int = KEEP_LAST_N_CHECKPOINTS) -> int:
    """
    Delete all but the `keep` most recent checkpoints.

    Returns:
        Number of checkpoint pairs deleted
    """
    checkpoints = list_checkpoints()
    to_delete   = checkpoints[keep:]
    deleted     = 0

    for meta in to_delete:
        pt_path   = CHECKPOINTS_DIR / meta["pt_file"]
        meta_path = pt_path.with_suffix("").with_suffix(".meta.json")
        for p in (pt_path, meta_path):
            if p.exists():
                p.unlink()
                deleted += 1

    if deleted:
        log.info(f"Pruned {deleted // 2} old checkpoint(s) (keeping last {keep})")
    return deleted // 2


def get_best_checkpoint() -> Optional[dict]:
    """Return the checkpoint with highest accuracy, or None if none exist."""
    checkpoints = list_checkpoints()
    if not checkpoints:
        return None
    return max(checkpoints, key=lambda c: c.get("accuracy", 0.0))
