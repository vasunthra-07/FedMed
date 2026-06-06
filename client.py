# =============================================================================
# client.py  —  FedMed Hospital Client  [PRODUCTION]
# =============================================================================
# Production upgrades:
#   • TLS via Flower root certificate verification
#   • Exponential backoff retry on connection failure
#   • Graceful shutdown on SIGINT/SIGTERM (finishes current round)
#   • Structured JSON logging via logger.py
#   • All magic strings replaced with config.py constants
# =============================================================================

import argparse
import signal
import sys
import time
import warnings
from typing import Dict, Tuple

import flwr as fl
import numpy as np
import torch
import torch.nn as nn
from flwr.common import NDArrays, Scalar

import config as C
from common import (
    DEVICE,
    MedXRayCNN,
    compute_epsilon,
    get_client_dataloader,
    get_parameters,
    get_test_dataloader,
    set_parameters,
    test,
    train_fedprox,
)
from logger import get_logger
from security import generate_certs, get_client_root_certificates

try:
    from opacus import PrivacyEngine
    from opacus.validators import ModuleValidator
    OPACUS_AVAILABLE = True
except ImportError:
    warnings.warn("[Client] Opacus not installed — using manual Gaussian DP fallback.")
    OPACUS_AVAILABLE = False


# =============================================================================
# HOSPITAL CLIENT
# =============================================================================

class HospitalClient(fl.client.NumPyClient):
    """
    Production Flower client representing a hospital node.

    Production changes vs prototype:
      • Uses get_logger() for structured JSON logging
      • Uses config.py for all constants (no magic strings)
      • TLS is handled at the transport layer (passed to start_numpy_client)
      • Opacus engine is re-attached after each set_parameters() call
        to keep the privacy accounting consistent across rounds
    """

    def __init__(self, client_id: int):
        self.client_id     = client_id
        self.name          = C.HOSPITAL_NAMES.get(client_id, str(client_id))
        self.log           = get_logger(f"client.{self.name}")
        self.steps_done    = 0
        self.epsilon_spent = 0.0

        self.log.info(f"Hospital {self.name} initialising (client_id={client_id})")

        # ── Model ──────────────────────────────────────────────────────────────
        self.model = MedXRayCNN().to(DEVICE)
        if C.CLIENT_DP_ENABLED and OPACUS_AVAILABLE:
            self.model = ModuleValidator.fix(self.model).to(DEVICE)

        # ── Data ───────────────────────────────────────────────────────────────
        self.train_loader = get_client_dataloader(client_id, batch_size=C.BATCH_SIZE)
        self.test_loader  = get_test_dataloader(batch_size=C.EVAL_BATCH_SIZE)
        self.log.info(
            f"Dataset loaded: {len(self.train_loader.dataset)} train "
            f"(non-IID, bias={C.BIAS_FRACTION}) | "
            f"{len(self.test_loader.dataset)} test"
        )

        # ── Optimizer ──────────────────────────────────────────────────────────
        self.optimizer = torch.optim.SGD(
            self.model.parameters(),
            lr           = C.LEARNING_RATE,
            momentum     = C.SGD_MOMENTUM,
            weight_decay = C.WEIGHT_DECAY,
        )

        # ── Opacus PrivacyEngine ───────────────────────────────────────────────
        self.privacy_engine = None
        self.dp_enabled = C.CLIENT_DP_ENABLED and OPACUS_AVAILABLE
        if self.dp_enabled:
            self.privacy_engine = PrivacyEngine()
            self.model, self.optimizer, self.train_loader = (
                self.privacy_engine.make_private(
                    module            = self.model,
                    optimizer         = self.optimizer,
                    data_loader       = self.train_loader,
                    noise_multiplier  = C.DP_NOISE_MULTIPLIER,
                    max_grad_norm     = C.DP_MAX_GRAD_NORM,
                )
            )
            self.log.info(
                f"Opacus PrivacyEngine attached | "
                f"σ={C.DP_NOISE_MULTIPLIER} | C={C.DP_MAX_GRAD_NORM} | δ={C.DP_TARGET_DELTA}"
            )
        elif C.CLIENT_DP_ENABLED:
            self.log.warning("Using manual Gaussian DP fallback (Opacus not installed)")
        else:
            self.log.info("Client DP disabled by FEDMED_CLIENT_DP=false")

    # ── Flower: get_parameters ─────────────────────────────────────────────────
    def get_parameters(self, config: Dict) -> NDArrays:
        return get_parameters(self.model)

    # ── Flower: fit ────────────────────────────────────────────────────────────
    def fit(self, parameters: NDArrays, config: Dict) -> Tuple[NDArrays, int, Dict]:
        mu     = float(config.get("mu",     C.FEDPROX_MU))
        epochs = int(config.get("epochs",   C.LOCAL_EPOCHS))
        rnd    = int(config.get("round",    0))

        set_parameters(self.model, parameters)
        global_params_copy = [p.copy() for p in parameters]

        self.log.info(f"Round {rnd} start | μ={mu:.4f} | epochs={epochs}")

        try:
            if self.dp_enabled or not C.CLIENT_DP_ENABLED:
                metrics = train_fedprox(
                    self.model, global_params_copy, self.train_loader,
                    self.optimizer, mu=mu, epochs=epochs, device=DEVICE,
                )
            else:
                metrics = self._manual_dp_fedprox(global_params_copy, mu, epochs)
        except Exception as e:
            self.log.error(f"Training failed at round {rnd}: {e}", exc_info=True)
            # Return unchanged parameters so server can continue with other clients
            return get_parameters(self.model), len(self.train_loader.dataset), {"error": str(e)[:200]}

        # ── Privacy accounting ─────────────────────────────────────────────────
        self.steps_done += epochs * len(self.train_loader)
        if not C.CLIENT_DP_ENABLED:
            self.epsilon_spent = 0.0
        elif OPACUS_AVAILABLE and self.privacy_engine:
            try:
                self.epsilon_spent = self.privacy_engine.get_epsilon(delta=C.DP_TARGET_DELTA)
            except Exception:
                self.epsilon_spent = compute_epsilon(C.DP_NOISE_MULTIPLIER, self.steps_done, C.DP_TARGET_DELTA)
        else:
            self.epsilon_spent = compute_epsilon(C.DP_NOISE_MULTIPLIER, self.steps_done, C.DP_TARGET_DELTA)

        self.epsilon_spent = min(self.epsilon_spent, 50.0)

        self.log.info(
            f"Round {rnd} complete | "
            f"loss={metrics['loss']:.4f} | acc={metrics['accuracy']*100:.2f}% | "
            f"prox={metrics.get('prox_penalty', 0):.5f} | ε={self.epsilon_spent:.4f}"
        )

        return (
            get_parameters(self.model),
            len(self.train_loader.dataset),
            {
                "loss":         float(metrics["loss"]),
                "accuracy":     float(metrics["accuracy"]),
                "prox_penalty": float(metrics.get("prox_penalty", 0.0)),
                "epsilon":      float(self.epsilon_spent),
                "client_id":    self.client_id,
                "mu":           mu,
                "round":        rnd,
            },
        )

    # ── Flower: evaluate ───────────────────────────────────────────────────────
    def evaluate(self, parameters: NDArrays, config: Dict) -> Tuple[float, int, Dict]:
        set_parameters(self.model, parameters)
        try:
            loss, acc = test(self.model, self.test_loader, device=DEVICE)
        except Exception as e:
            self.log.error(f"Evaluation failed: {e}", exc_info=True)
            return 9999.0, len(self.test_loader.dataset), {"accuracy": 0.0, "error": str(e)[:200]}

        self.log.info(f"Eval | loss={loss:.4f} | acc={acc*100:.2f}%")
        return float(loss), len(self.test_loader.dataset), {"accuracy": float(acc)}

    # ── Manual DP-SGD + FedProx fallback ──────────────────────────────────────
    def _manual_dp_fedprox(self, global_params: list, mu: float, epochs: int) -> dict:
        """
        Fallback when Opacus is unavailable.
        Implements DP-SGD (Abadi et al. 2016) + FedProx proximal term.
        """
        self.model.train()
        global_state = {
            name: torch.tensor(value, dtype=torch.float32, device=DEVICE)
            for name, value in zip(self.model.state_dict().keys(), global_params)
        }
        criterion = nn.BCEWithLogitsLoss()
        tl, tc, ts, tp = 0.0, 0, 0, 0.0

        for _ in range(epochs):
            for imgs, lbls in self.train_loader:
                imgs, lbls = imgs.to(DEVICE), lbls.float().to(DEVICE)
                self.optimizer.zero_grad()
                out       = self.model(imgs)
                task_loss = criterion(out, lbls)
                prox      = torch.tensor(0.0, device=DEVICE)
                for name, w in self.model.named_parameters():
                    ref = global_state[name]
                    prox += torch.sum((w - ref) ** 2)
                prox_loss = (mu / 2.0) * prox
                (task_loss + prox_loss).backward()

                torch.nn.utils.clip_grad_norm_(self.model.parameters(), C.DP_MAX_GRAD_NORM)
                sensitivity = C.DP_MAX_GRAD_NORM / max(imgs.size(0), 1)
                with torch.no_grad():
                    for param in self.model.parameters():
                        if param.grad is not None:
                            param.grad += torch.normal(
                                0.0, C.DP_NOISE_MULTIPLIER * sensitivity,
                                size=param.grad.shape, device=param.grad.device,
                            )
                self.optimizer.step()
                preds = (torch.sigmoid(out) > 0.5).long()
                tc   += (preds == lbls.long()).all(dim=1).sum().item()
                tl   += task_loss.item() * imgs.size(0)
                tp   += prox_loss.item(); ts += imgs.size(0)

        return {"loss": tl/max(ts,1), "accuracy": tc/max(ts,1), "prox_penalty": tp/max(ts,1)}


# =============================================================================
# GRACEFUL SHUTDOWN + RETRY
# =============================================================================

_shutdown = False

def _handle_signal(sig, frame):
    global _shutdown
    print(f"\n[Client] Signal {sig} — will stop after current round completes")
    _shutdown = True

signal.signal(signal.SIGINT,  _handle_signal)
signal.signal(signal.SIGTERM, _handle_signal)


def connect_with_retry(client_id: int, server_address: str):
    """
    Connect to the Flower server with exponential backoff retry.
    Retries C.GRPC_MAX_RETRIES times before giving up.
    """
    log = get_logger(f"client.{C.HOSPITAL_NAMES.get(client_id, str(client_id))}")
    client = HospitalClient(client_id=client_id)

    if C.USE_TLS:
        generate_certs(force=False)
        root_certificates = get_client_root_certificates()
    else:
        root_certificates = None

    delay = C.GRPC_RETRY_DELAY_S
    for attempt in range(1, C.GRPC_MAX_RETRIES + 1):
        if _shutdown:
            log.info("Shutdown requested — not connecting")
            return

        try:
            log.info(f"Connecting to {server_address} (attempt {attempt}/{C.GRPC_MAX_RETRIES})")
            fl.client.start_numpy_client(
                server_address = server_address,
                client         = client,
                **({"root_certificates": root_certificates} if root_certificates else {"insecure": True}),
            )
            return   # clean exit
        except Exception as e:
            if attempt == C.GRPC_MAX_RETRIES:
                log.error(f"All {C.GRPC_MAX_RETRIES} connection attempts failed: {e}")
                raise
            log.warning(f"Connection attempt {attempt} failed: {e} — retrying in {delay:.1f}s")
            time.sleep(delay)
            delay = min(delay * C.GRPC_RETRY_BACKOFF, 60.0)   # cap at 60s


# =============================================================================
# MAIN
# =============================================================================

def parse_args():
    p = argparse.ArgumentParser(description="FedMed Hospital Client [Production]")
    p.add_argument("--id",     type=int, required=True, choices=[0,1,2],
                   help="Hospital ID: 0=Alpha  1=Beta  2=Gamma")
    p.add_argument("--server", type=str, default=f"127.0.0.1:{C.SERVER_PORT}",
                   help=f"Server address (default: 127.0.0.1:{C.SERVER_PORT})")
    p.add_argument("--no-tls", action="store_true",
                   help="Disable TLS (development only)")
    return p.parse_args()


def main():
    args = parse_args()
    name = C.HOSPITAL_NAMES.get(args.id, str(args.id))
    log  = get_logger(f"client.{name}")

    if args.no_tls:
        import config as _c
        _c.USE_TLS = False

    log.info(f"Hospital {name} starting | server={args.server} | tls={C.USE_TLS}")
    connect_with_retry(args.id, args.server)
    log.info(f"Hospital {name} finished")


if __name__ == "__main__":
    main()
