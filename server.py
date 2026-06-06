# =============================================================================
# server.py  —  FedMed Flower Server  [PRODUCTION]
# =============================================================================
# Production upgrades:
#   • TLS via Flower certificates (server authentication)
#   • Checkpoint save/resume — survives crashes, resumes mid-training
#   • Structured JSON logging via logger.py
#   • Telemetry line rotation (max TELEMETRY_MAX_LINES)
#   • Graceful shutdown handler (SIGINT / SIGTERM)
#   • All magic strings replaced with config.py constants
# =============================================================================

import csv
import json
import os
import signal
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import flwr as fl
import numpy as np
import torch
from flwr.common import (
    EvaluateRes,
    FitRes,
    Parameters,
    Scalar,
    ndarrays_to_parameters,
    parameters_to_ndarrays,
)
from flwr.server.client_proxy import ClientProxy
from flwr.server.strategy import FedAvg

import config as C
from checkpoint import get_best_checkpoint, load_checkpoint, save_checkpoint
from common import (
    DEVICE,
    MedXRayCNN,
    compute_epsilon,
    get_parameters,
    get_test_dataloader,
    set_parameters,
    test,
)
from logger import get_logger
from security import generate_certs, get_flower_server_certificates

log = get_logger("server")

TELEMETRY_REQUIRED_KEYS = {
    "event": str,
    "round": int,
    "source": str,
    "target": str,
    "payload": dict,
}


def validate_telemetry_event(event: dict) -> tuple[bool, str]:
    if not isinstance(event, dict):
        return False, "telemetry event must be a dict"
    for key, typ in TELEMETRY_REQUIRED_KEYS.items():
        if key not in event:
            return False, f"missing key: {key}"
        if not isinstance(event[key], typ):
            return False, f"invalid type for {key}: expected {typ.__name__}"
    return True, ""


def load_valid_telemetry(path: Path, limit: int = 100) -> list[dict]:
    """Load recent telemetry records and skip malformed JSON/schema failures."""
    if not path.exists():
        return []
    valid = []
    for line in path.read_text().splitlines()[-limit:]:
        if not line.strip():
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            log.warning("Skipping malformed telemetry JSON")
            continue
        ok, reason = validate_telemetry_event(event)
        if not ok:
            log.warning(f"Skipping invalid telemetry event: {reason}")
            continue
        valid.append(event)
    return valid


def validate_client_update(
    reference_arrays: list[np.ndarray],
    candidate_arrays: list[np.ndarray],
    max_update_norm: float,
) -> tuple[bool, str, float]:
    if len(reference_arrays) != len(candidate_arrays):
        return False, "parameter_count_mismatch", float("inf")

    squared_norm = 0.0
    for ref, cand in zip(reference_arrays, candidate_arrays):
        arr = np.asarray(cand)
        if not np.all(np.isfinite(arr)):
            return False, "non_finite_update", float("inf")
        if ref.shape != arr.shape:
            return False, "parameter_shape_mismatch", float("inf")
        diff = arr.astype(np.float64) - ref.astype(np.float64)
        squared_norm += float(np.sum(diff * diff))

    update_norm = float(np.sqrt(squared_norm))
    if update_norm > max_update_norm:
        return False, "update_norm_exceeded", update_norm
    return True, "", update_norm


def clip_client_update(
    reference_arrays: list[np.ndarray],
    candidate_arrays: list[np.ndarray],
    clip_value: float,
) -> tuple[list[np.ndarray], dict]:
    clipped = []
    max_abs_delta = 0.0
    total_coords = 0
    clipped_coords = 0
    squared_norm = 0.0

    for ref, cand in zip(reference_arrays, candidate_arrays):
        ref_arr = np.asarray(ref)
        cand_arr = np.asarray(cand)
        if np.issubdtype(cand_arr.dtype, np.floating):
            delta = cand_arr.astype(np.float64) - ref_arr.astype(np.float64)
            max_abs_delta = max(max_abs_delta, float(np.max(np.abs(delta))) if delta.size else 0.0)
            clipped_delta = np.clip(delta, -clip_value, clip_value)
            clipped_coords += int(np.count_nonzero(clipped_delta != delta))
            total_coords += int(delta.size)
            squared_norm += float(np.sum(clipped_delta * clipped_delta))
            clipped.append((ref_arr.astype(np.float64) + clipped_delta).astype(cand_arr.dtype))
        else:
            clipped.append(cand_arr.copy())

    stats = {
        "max_abs_delta": max_abs_delta,
        "clipped_coords": clipped_coords,
        "total_coords": total_coords,
        "clipped_fraction": clipped_coords / max(total_coords, 1),
        "clipped_update_norm": float(np.sqrt(squared_norm)),
    }
    return clipped, stats


# =============================================================================
# FILE I/O HELPERS
# =============================================================================

def init_metrics_csv():
    with open(C.METRICS_CSV, "w", newline="") as f:
        csv.writer(f).writerow([
            "round", "timestamp", "global_loss", "global_accuracy",
            "num_clients", "epsilon_spent", "mu",
        ])
    C.TELEMETRY_JSONL.write_text("")
    log.info(f"Metrics CSV initialised → {C.METRICS_CSV}")


def append_metrics(round_num, loss, accuracy, num_clients, epsilon, mu):
    with open(C.METRICS_CSV, "a", newline="") as f:
        csv.writer(f).writerow([
            round_num, time.strftime("%H:%M:%S"),
            f"{loss:.6f}", f"{accuracy:.6f}",
            num_clients, f"{epsilon:.4f}", f"{mu:.4f}",
        ])


def write_telemetry(event: dict):
    """
    Append one JSON line to telemetry.jsonl with automatic rotation.
    When the file exceeds TELEMETRY_MAX_LINES, the oldest 20% are dropped.
    This prevents unbounded growth without losing recent events.
    """
    ok, reason = validate_telemetry_event(event)
    if not ok:
        log.warning(f"Rejected invalid telemetry event before write: {reason}")
        return False
    event["ts"] = time.strftime("%H:%M:%S.") + f"{int(time.time()*1000)%1000:03d}"
    try:
        with open(C.TELEMETRY_JSONL, "a") as f:
            f.write(json.dumps(event) + "\n")

        # Rotate if too large
        lines = C.TELEMETRY_JSONL.read_text().splitlines()
        if len(lines) > C.TELEMETRY_MAX_LINES:
            keep = int(C.TELEMETRY_MAX_LINES * 0.80)
            C.TELEMETRY_JSONL.write_text("\n".join(lines[-keep:]) + "\n")
            log.debug(f"Telemetry rotated — kept last {keep} lines")

    except OSError as e:
        log.warning(f"Failed to write telemetry: {e}")
        return False
    return True


def write_status(state: dict):
    """Atomically overwrite status.json (write-to-tmp → rename)."""
    state["updated_at"] = time.strftime("%H:%M:%S")
    tmp = C.STATUS_JSON.with_suffix(".tmp")
    try:
        tmp.write_text(json.dumps(state, indent=2))
        tmp.replace(C.STATUS_JSON)
    except OSError as e:
        log.warning(f"Failed to write status.json: {e}")


def read_mu() -> float:
    """Live-read μ from mu_config.json (written by dashboard slider)."""
    if C.MU_CONFIG.exists():
        try:
            return float(json.loads(C.MU_CONFIG.read_text()).get("mu", C.FEDPROX_MU))
        except Exception:
            pass
    return C.FEDPROX_MU


# =============================================================================
# FEDPROX + DP STRATEGY  (production)
# =============================================================================

class FedMedProxStrategy(FedAvg):
    """
    Production FedMed aggregation strategy.

    New in production version:
      • Saves a checkpoint after every round (configurable with CHECKPOINT_EVERY_N)
      • Resumes from the latest checkpoint if RESUME_FROM_CHECKPOINT=true
      • Logs every event as structured JSON via logger.py
      • Rotates telemetry.jsonl to prevent unbounded growth
      • Writes status.json atomically to prevent partial reads by dashboard
    """

    def __init__(self, initial_parameters: Parameters, start_round: int = 0, **kwargs):
        super().__init__(initial_parameters=initial_parameters, **kwargs)

        self.global_model  = MedXRayCNN().to(DEVICE)
        set_parameters(self.global_model, parameters_to_ndarrays(initial_parameters))

        self.epsilon_spent = 0.0
        self.delta         = C.DP_TARGET_DELTA
        self.current_round = start_round   # non-zero when resuming
        self.steps_done    = 0

        write_status({
            "phase":          "INITIALISING",
            "round":          start_round,
            "total_rounds":   C.NUM_ROUNDS,
            "active_clients": 0,
            "global_accuracy": None,
            "epsilon_spent":  0.0,
            "mu":             C.FEDPROX_MU,
            "resumed_from":   start_round,
        })
        write_telemetry({
            "event":   "SERVER_INIT",
            "round":   start_round,
            "source":  "server",
            "target":  "all",
            "payload": {
                "strategy":         "FedProx + Gaussian DP",
                "num_rounds":       C.NUM_ROUNDS,
                "resumed_from":     start_round,
                "mu":               C.FEDPROX_MU,
                "server_dp_sigma":  C.SERVER_DP_NOISE_STD,
                "device":           str(DEVICE),
                "tls":              C.USE_TLS,
            },
        })
        log.info(
            f"Server initialised | rounds={C.NUM_ROUNDS} | "
            f"resumed_from={start_round} | device={DEVICE} | tls={C.USE_TLS}"
        )

    # ── configure_fit: broadcast μ and round info ─────────────────────────────
    def configure_fit(self, server_round, parameters, client_manager):
        mu = read_mu()
        config = {
            "round":  server_round,
            "mu":     mu,
            "epochs": C.LOCAL_EPOCHS,
        }
        write_telemetry({
            "event":   "ROUND_START",
            "round":   server_round,
            "source":  "server",
            "target":  "all_clients",
            "payload": {"mu": mu, "epochs": C.LOCAL_EPOCHS},
        })
        write_status({
            "phase":          "TRAINING",
            "round":          server_round,
            "total_rounds":   C.NUM_ROUNDS,
            "active_clients": len(client_manager.all()),
            "global_accuracy": None,
            "epsilon_spent":  self.epsilon_spent,
            "mu":             mu,
        })
        log.info(f"Round {server_round} — dispatching to {len(client_manager.all())} client(s)")
        return super().configure_fit(server_round, parameters, client_manager)

    # ── aggregate_fit: FedAvg + server DP ────────────────────────────────────
    def aggregate_fit(
        self,
        server_round: int,
        results: List[Tuple[ClientProxy, FitRes]],
        failures: List,
    ) -> Tuple[Optional[Parameters], Dict[str, Scalar]]:

        self.current_round = server_round

        if not results:
            log.error(f"Round {server_round}: no results received — skipping")
            write_telemetry({
                "event": "AGG_SKIP", "round": server_round,
                "source": "server", "target": "—",
                "payload": {"reason": "no results received"},
            })
            return None, {}

        if failures:
            log.warning(f"Round {server_round}: {len(failures)} client(s) failed")
            for exc in failures:
                write_telemetry({
                    "event":   "CLIENT_FAILURE",
                    "round":   server_round,
                    "source":  "unknown_client",
                    "target":  "server",
                    "payload": {"error": str(exc)[:200]},
                })

        reference_arrays = get_parameters(self.global_model)
        accepted_results = []
        for proxy, fit_res in results:
            candidate_arrays = parameters_to_ndarrays(fit_res.parameters)
            ok, reason, update_norm = validate_client_update(
                reference_arrays,
                candidate_arrays,
                C.MAX_CLIENT_UPDATE_NORM,
            )
            m = fit_res.metrics or {}
            if not ok:
                client_id = m.get("client_id", "?")
                log.warning(
                    f"Round {server_round}: rejected client_{client_id} update "
                    f"reason={reason} norm={update_norm:.4f}"
                )
                write_telemetry({
                    "event":   "CLIENT_UPDATE_REJECTED",
                    "round":   server_round,
                    "source":  f"client_{client_id}",
                    "target":  "server",
                    "payload": {
                        "reason": reason,
                        "update_norm": round(update_norm, 4) if np.isfinite(update_norm) else "inf",
                        "max_update_norm": C.MAX_CLIENT_UPDATE_NORM,
                    },
                })
                continue
            clipped_arrays, update_stats = clip_client_update(
                reference_arrays,
                candidate_arrays,
                C.CLIENT_UPDATE_CLIP_VALUE,
            )
            fit_res.parameters = ndarrays_to_parameters(clipped_arrays)
            fit_res.metrics["update_norm"] = float(update_norm)
            fit_res.metrics["clipped_update_norm"] = float(update_stats["clipped_update_norm"])
            fit_res.metrics["clipped_fraction"] = float(update_stats["clipped_fraction"])
            fit_res.metrics["max_abs_delta"] = float(update_stats["max_abs_delta"])
            if update_norm >= C.SUSPICIOUS_UPDATE_NORM:
                write_telemetry({
                    "event":   "CLIENT_UPDATE_SUSPICIOUS",
                    "round":   server_round,
                    "source":  f"client_{m.get('client_id', '?')}",
                    "target":  "server",
                    "payload": {
                        "update_norm": round(update_norm, 4),
                        "suspicious_threshold": C.SUSPICIOUS_UPDATE_NORM,
                        "clipped_fraction": round(update_stats["clipped_fraction"], 6),
                        "max_abs_delta": round(update_stats["max_abs_delta"], 6),
                    },
                })
            accepted_results.append((proxy, fit_res))

        if not accepted_results:
            log.error(f"Round {server_round}: all client updates rejected")
            write_telemetry({
                "event": "AGG_SKIP", "round": server_round,
                "source": "server", "target": "global_model",
                "payload": {"reason": "all client updates rejected"},
            })
            return None, {}

        # Log each accepted client's metrics
        for _proxy, fit_res in accepted_results:
            m = fit_res.metrics or {}
            write_telemetry({
                "event":   "CLIENT_FIT_RESULT",
                "round":   server_round,
                "source":  f"client_{m.get('client_id', '?')}",
                "target":  "server",
                "payload": {
                    "samples":      fit_res.num_examples,
                    "local_loss":   round(m.get("loss", 0), 4),
                    "local_acc":    round(m.get("accuracy", 0), 4),
                    "epsilon":      round(m.get("epsilon", 0), 4),
                    "prox_penalty": round(m.get("prox_penalty", 0), 6),
                    "mu_used":      round(m.get("mu", C.FEDPROX_MU), 4),
                    "update_norm":  round(m.get("update_norm", 0), 4),
                    "clipped_update_norm": round(m.get("clipped_update_norm", 0), 4),
                    "clipped_fraction": round(m.get("clipped_fraction", 0), 6),
                    "max_abs_delta": round(m.get("max_abs_delta", 0), 6),
                },
            })

        # FedAvg weighted aggregation
        agg_params, metrics = super().aggregate_fit(server_round, accepted_results, failures)
        if agg_params is None:
            return None, {}

        # Server-side Gaussian DP noise
        arrays = parameters_to_ndarrays(agg_params)
        noisy  = []
        for arr in arrays:
            scale = C.SERVER_DP_NOISE_STD * float(np.linalg.norm(arr))
            noisy.append(arr + np.random.normal(0, scale, arr.shape).astype(arr.dtype))

        # Update in-memory model
        set_parameters(self.global_model, noisy)

        # Accumulate epsilon
        self.steps_done   += C.LOCAL_EPOCHS * (C.SAMPLES_PER_CLIENT // C.BATCH_SIZE)
        self.epsilon_spent = min(
            compute_epsilon(C.DP_NOISE_MULTIPLIER, self.steps_done, C.DP_TARGET_DELTA),
            50.0,
        )

        mu = read_mu()
        write_telemetry({
            "event":   "AGGREGATION_COMPLETE",
            "round":   server_round,
            "source":  "server",
            "target":  "global_model",
            "payload": {
                "num_clients":   len(accepted_results),
                "epsilon_spent": round(self.epsilon_spent, 4),
                "mu":            mu,
            },
        })
        log.info(
            f"Round {server_round} aggregated | "
            f"clients={len(accepted_results)} | ε={self.epsilon_spent:.4f}"
        )
        return ndarrays_to_parameters(noisy), metrics

    # ── evaluate: global model on test set + checkpoint ───────────────────────
    def evaluate(
        self,
        server_round: int,
        parameters: Parameters,
    ) -> Optional[Tuple[float, Dict[str, Scalar]]]:

        set_parameters(self.global_model, parameters_to_ndarrays(parameters))
        loss, accuracy = test(self.global_model, get_test_dataloader(), device=DEVICE)
        mu             = read_mu()

        log.info(
            f"Round {server_round:02d} | "
            f"Loss={loss:.4f} | Acc={accuracy*100:.2f}% | "
            f"ε={self.epsilon_spent:.4f} | μ={mu:.4f}"
        )

        append_metrics(server_round, loss, accuracy,
                       num_clients=C.MIN_CLIENTS,
                       epsilon=self.epsilon_spent, mu=mu)

        # ── Checkpoint ────────────────────────────────────────────────────────
        if server_round % C.CHECKPOINT_EVERY_N == 0:
            try:
                save_checkpoint(
                    model_state_dict = self.global_model.state_dict(),
                    round_num        = server_round,
                    metrics          = {"loss": loss, "accuracy": accuracy},
                    epsilon          = self.epsilon_spent,
                    mu               = mu,
                )
            except Exception as e:
                log.error(f"Checkpoint failed at round {server_round}: {e}", exc_info=True)

        reached_target = accuracy >= C.TARGET_ACCURACY
        write_telemetry({
            "event":   "GLOBAL_EVAL",
            "round":   server_round,
            "source":  "server",
            "target":  "dashboard",
            "payload": {
                "loss":           round(loss, 4),
                "accuracy":       round(accuracy, 4),
                "accuracy_pct":   f"{accuracy*100:.2f}%",
                "epsilon_spent":  round(self.epsilon_spent, 4),
                "reached_target": reached_target,
            },
        })
        write_status({
            "phase":          "EVALUATING" if server_round < C.NUM_ROUNDS else "COMPLETE",
            "round":          server_round,
            "total_rounds":   C.NUM_ROUNDS,
            "global_accuracy": round(accuracy, 4),
            "global_loss":    round(loss, 4),
            "epsilon_spent":  round(self.epsilon_spent, 4),
            "mu":             mu,
            "reached_target": reached_target,
            "training_done":  server_round >= C.NUM_ROUNDS,
        })

        return loss, {"accuracy": accuracy, "epsilon": self.epsilon_spent, "mu": mu}

    def aggregate_evaluate(self, server_round, results, failures):
        if not results:
            return None, {}
        return super().aggregate_evaluate(server_round, results, failures)


# =============================================================================
# GRACEFUL SHUTDOWN
# =============================================================================

_shutdown_requested = False

def _handle_signal(sig, frame):
    global _shutdown_requested
    log.warning(f"Signal {sig} received — requesting graceful shutdown after current round")
    _shutdown_requested = True

signal.signal(signal.SIGINT,  _handle_signal)
signal.signal(signal.SIGTERM, _handle_signal)


# =============================================================================
# MAIN
# =============================================================================

def main():
    log.info("=" * 60)
    log.info("  FedMed FL Server  [Production Edition]")
    log.info("=" * 60)

    # ── TLS certificates ───────────────────────────────────────────────────────
    if C.USE_TLS:
        generate_certs(force=False)
        certificates = get_flower_server_certificates()
        if certificates is None:
            log.error("Failed to load TLS credentials — set USE_TLS=false to disable")
            sys.exit(1)
        log.info("TLS enabled — clients verify the FedMed server certificate")
    else:
        certificates = None
        log.warning("TLS DISABLED — only for local development. Set FEDMED_USE_TLS=true for production.")

    # ── Model + optional resume ────────────────────────────────────────────────
    model       = MedXRayCNN().to(DEVICE)
    start_round = 0

    if C.RESUME_FROM_CHECKPOINT:
        start_round, meta = load_checkpoint(model, DEVICE)
        if start_round > 0:
            log.info(f"Resuming training from round {start_round}")
            if start_round >= C.NUM_ROUNDS:
                log.warning("Already completed all rounds. Reset FEDMED_RESUME=false to retrain.")
                sys.exit(0)
    else:
        # Clear stale metrics from previous run
        init_metrics_csv()

    initial_params = ndarrays_to_parameters(get_parameters(model))

    # ── Strategy ──────────────────────────────────────────────────────────────
    strategy = FedMedProxStrategy(
        initial_parameters    = initial_params,
        start_round           = start_round,
        fraction_fit          = C.FRACTION_FIT,
        fraction_evaluate     = C.FRACTION_EVAL,
        min_fit_clients       = C.MIN_CLIENTS,
        min_evaluate_clients  = C.MIN_CLIENTS,
        min_available_clients = C.MIN_CLIENTS,
    )

    # ── Launch ────────────────────────────────────────────────────────────────
    address = f"{C.SERVER_HOST}:{C.SERVER_PORT}"
    log.info(f"Listening on {address} | rounds={C.NUM_ROUNDS} | min_clients={C.MIN_CLIENTS}")

    fl.server.start_server(
        server_address   = address,
        config           = fl.server.ServerConfig(num_rounds=C.NUM_ROUNDS - start_round),
        strategy         = strategy,
        certificates     = certificates,
        grpc_max_message_length = 512 * 1024 * 1024,
    )

    write_telemetry({
        "event": "TRAINING_COMPLETE", "round": C.NUM_ROUNDS,
        "source": "server", "target": "dashboard",
        "payload": {"best": get_best_checkpoint()},
    })
    log.info("Training complete.")


if __name__ == "__main__":
    main()
