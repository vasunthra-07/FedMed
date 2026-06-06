from __future__ import annotations

import json
from pathlib import Path

import numpy as np


NUM_CLASSES = 14
PREDICTION_THRESHOLD = 0.5


def _safe_token(value: object) -> str:
    text = "unknown" if value is None else str(value)
    return "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in text)


def prediction_artifact_path(
    output_dir: Path,
    method: str,
    seed: int,
    split: str,
    checkpoint_id: str | None = None,
) -> Path:
    checkpoint = _safe_token(checkpoint_id or "none")
    name = f"{_safe_token(method)}_seed-{seed}_{_safe_token(split)}_checkpoint-{checkpoint}.npz"
    return output_dir / "predictions" / name


def build_prediction_artifact(
    y_true: np.ndarray,
    logits: np.ndarray,
    *,
    method: str,
    seed: int,
    split: str,
    sample_ids: np.ndarray | None = None,
    checkpoint_id: str | None = None,
    threshold: float = PREDICTION_THRESHOLD,
) -> dict[str, np.ndarray]:
    y_true = np.asarray(y_true).astype(np.int64)
    logits = np.asarray(logits).astype(np.float32)
    if y_true.ndim != 2 or logits.ndim != 2:
        raise ValueError("y_true and logits must be rank-2 arrays")
    if y_true.shape != logits.shape:
        raise ValueError(f"y_true/logits shape mismatch: {y_true.shape} != {logits.shape}")
    if y_true.shape[1] != NUM_CLASSES:
        raise ValueError(f"prediction artifacts require {NUM_CLASSES} labels, got {y_true.shape[1]}")

    probabilities = (1.0 / (1.0 + np.exp(-logits))).astype(np.float32)
    predictions = (probabilities >= threshold).astype(np.int64)
    if sample_ids is None:
        sample_ids = np.arange(y_true.shape[0], dtype=np.int64)
    else:
        sample_ids = np.asarray(sample_ids)
    if len(sample_ids) != y_true.shape[0]:
        raise ValueError(f"sample_ids length {len(sample_ids)} does not match n={y_true.shape[0]}")

    metadata = {
        "method": method,
        "seed": int(seed),
        "dataset_split": split,
        "checkpoint_id": checkpoint_id,
        "threshold": float(threshold),
        "format": "fedmed_prediction_artifact_v1",
    }
    return {
        "y_true": y_true,
        "logits": logits,
        "probabilities": probabilities,
        "predictions": predictions,
        "sample_ids": sample_ids,
        "metadata_json": np.array(json.dumps(metadata, sort_keys=True)),
    }


def save_prediction_artifact(
    output_dir: Path,
    y_true: np.ndarray,
    logits: np.ndarray,
    *,
    method: str,
    seed: int,
    split: str,
    sample_ids: np.ndarray | None = None,
    checkpoint_id: str | None = None,
    threshold: float = PREDICTION_THRESHOLD,
) -> Path:
    path = prediction_artifact_path(output_dir, method, seed, split, checkpoint_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    artifact = build_prediction_artifact(
        y_true,
        logits,
        method=method,
        seed=seed,
        split=split,
        sample_ids=sample_ids,
        checkpoint_id=checkpoint_id,
        threshold=threshold,
    )
    np.savez_compressed(path, **artifact)
    return path
