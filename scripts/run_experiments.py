from __future__ import annotations

import argparse
import csv
import json
import random
import sys
import time
from copy import deepcopy
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import ConcatDataset, DataLoader

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import config as C
from common import (
    DEVICE,
    MedXRayCNN,
    _synthetic_dataset,
    compute_epsilon,
    get_parameters,
    set_parameters,
    train,
    train_fedprox,
)
from prediction_artifacts import save_prediction_artifact


BASELINES = ("centralized", "fedavg", "fedprox", "fedprox_dp")
METRIC_FIELDS = ["accuracy", "precision", "recall", "f1", "roc_auc", "loss", "epsilon", "runtime_s"]


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def make_client_loaders(num_clients: int, samples_per_client: int, batch_size: int, seed: int) -> list[DataLoader]:
    loaders = []
    for client_id in range(num_clients):
        ds = _synthetic_dataset(samples_per_client, seed=seed + 1000 + client_id)
        loaders.append(DataLoader(ds, batch_size=batch_size, shuffle=True, num_workers=0))
    return loaders


def make_test_loader(samples: int, batch_size: int, seed: int) -> DataLoader:
    return DataLoader(_synthetic_dataset(samples, seed=seed + 9000), batch_size=batch_size, shuffle=False)


def roc_auc_binary(y_true: np.ndarray, y_score: np.ndarray) -> float | None:
    pos = y_score[y_true == 1]
    neg = y_score[y_true == 0]
    if len(pos) == 0 or len(neg) == 0:
        return None
    wins = 0.0
    for score in pos:
        wins += float(np.sum(score > neg))
        wins += 0.5 * float(np.sum(score == neg))
    return wins / (len(pos) * len(neg))


def evaluate_model(
    model: MedXRayCNN,
    loader: DataLoader,
    *,
    method: str | None = None,
    seed: int | None = None,
    split: str = "test",
    checkpoint_id: str | None = None,
    save_predictions: bool = False,
    output_dir: Path = C.RESULTS_DIR,
) -> dict:
    criterion = torch.nn.BCEWithLogitsLoss()
    model.eval().to(DEVICE)
    losses, probs, labels, logits_list = [], [], [], []
    with torch.no_grad():
        for imgs, lbls in loader:
            imgs = imgs.to(DEVICE)
            lbls = lbls.float().to(DEVICE)
            logits = model(imgs)
            loss = criterion(logits, lbls)
            losses.append(loss.item() * imgs.size(0))
            logits_list.append(logits.cpu().numpy())
            probs.append(torch.sigmoid(logits).cpu().numpy())
            labels.append(lbls.cpu().numpy())

    y_logits = np.concatenate(logits_list, axis=0)
    y_prob = np.concatenate(probs, axis=0)
    y_true = np.concatenate(labels, axis=0).astype(int)
    y_pred = (y_prob >= 0.5).astype(int)
    if save_predictions:
        if method is None or seed is None:
            raise ValueError("method and seed are required when save_predictions=True")
        save_prediction_artifact(
            output_dir,
            y_true,
            y_logits,
            method=method,
            seed=seed,
            split=split,
            checkpoint_id=checkpoint_id,
        )

    tp = np.logical_and(y_pred == 1, y_true == 1).sum()
    fp = np.logical_and(y_pred == 1, y_true == 0).sum()
    fn = np.logical_and(y_pred == 0, y_true == 1).sum()
    precision = tp / max(tp + fp, 1)
    recall = tp / max(tp + fn, 1)
    f1 = 2 * precision * recall / max(precision + recall, 1e-12)
    aucs = [roc_auc_binary(y_true[:, i], y_prob[:, i]) for i in range(y_true.shape[1])]
    aucs = [auc for auc in aucs if auc is not None]

    return {
        "accuracy": float((y_pred == y_true).all(axis=1).mean()),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "roc_auc": float(np.mean(aucs)) if aucs else None,
        "loss": float(sum(losses) / max(len(y_true), 1)),
    }


def aggregate_params(param_sets: list[list[np.ndarray]], weights: list[int]) -> list[np.ndarray]:
    total = float(sum(weights))
    aggregated = []
    for tensors in zip(*param_sets):
        out = sum((w / total) * t for w, t in zip(weights, tensors))
        aggregated.append(out.astype(tensors[0].dtype))
    return aggregated


def add_dp_noise(params: list[np.ndarray], noise_multiplier: float, clip_norm: float, seed: int) -> list[np.ndarray]:
    rng = np.random.RandomState(seed)
    noisy = []
    for arr in params:
        if np.issubdtype(arr.dtype, np.floating):
            noisy.append((arr + rng.normal(0, noise_multiplier * clip_norm * 1e-3, arr.shape)).astype(arr.dtype))
        else:
            noisy.append(arr)
    return noisy


def run_centralized(args, seed: int, test_loader: DataLoader, baseline: str) -> dict:
    loaders = make_client_loaders(args.num_clients, args.samples_per_client, args.batch_size, seed)
    train_loader = DataLoader(
        ConcatDataset([loader.dataset for loader in loaders]),
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=0,
    )
    model = MedXRayCNN().to(DEVICE)
    opt = torch.optim.SGD(model.parameters(), lr=args.lr, momentum=0.0)
    train(model, train_loader, opt, epochs=args.local_epochs, device=DEVICE)
    return evaluate_model(
        model,
        test_loader,
        method=baseline,
        seed=seed,
        split="test",
        save_predictions=args.save_predictions,
        output_dir=args.output_dir,
    ) | {"epsilon": None}


def run_federated(args, seed: int, test_loader: DataLoader, baseline: str, fedprox: bool, dp: bool) -> dict:
    loaders = make_client_loaders(args.num_clients, args.samples_per_client, args.batch_size, seed)
    global_model = MedXRayCNN().to(DEVICE)
    steps = 0

    for rnd in range(args.num_rounds):
        global_params = get_parameters(global_model)
        local_params, weights = [], []
        for client_id, loader in enumerate(loaders):
            local = deepcopy(global_model).to(DEVICE)
            opt = torch.optim.SGD(local.parameters(), lr=args.lr, momentum=0.0)
            if fedprox:
                train_fedprox(local, global_params, loader, opt, mu=args.mu, epochs=args.local_epochs, device=DEVICE)
            else:
                train(local, loader, opt, epochs=args.local_epochs, device=DEVICE)
            local_params.append(get_parameters(local))
            weights.append(len(loader.dataset))
            steps += args.local_epochs * len(loader)
        aggregated = aggregate_params(local_params, weights)
        if dp:
            aggregated = add_dp_noise(aggregated, args.dp_noise, C.DP_MAX_GRAD_NORM, seed + rnd)
        set_parameters(global_model, aggregated)

    metrics = evaluate_model(
        global_model,
        test_loader,
        method=baseline,
        seed=seed,
        split="test",
        save_predictions=args.save_predictions,
        output_dir=args.output_dir,
    )
    epsilon = None
    if dp:
        sample_rate = args.batch_size / max(args.samples_per_client, 1)
        epsilon = compute_epsilon(args.dp_noise, steps, C.DP_TARGET_DELTA, sample_rate=sample_rate)
    return metrics | {"epsilon": epsilon}


def run_one(args, baseline: str, seed: int) -> dict:
    set_seed(seed)
    test_loader = make_test_loader(args.test_samples, args.batch_size, seed)
    start = time.perf_counter()
    if baseline == "centralized":
        metrics = run_centralized(args, seed, test_loader, baseline)
    elif baseline == "fedavg":
        metrics = run_federated(args, seed, test_loader, baseline, fedprox=False, dp=False)
    elif baseline == "fedprox":
        metrics = run_federated(args, seed, test_loader, baseline, fedprox=True, dp=False)
    elif baseline == "fedprox_dp":
        metrics = run_federated(args, seed, test_loader, baseline, fedprox=True, dp=True)
    else:
        raise ValueError(f"Unknown baseline: {baseline}")

    metrics["runtime_s"] = time.perf_counter() - start
    return {
        "baseline": baseline,
        "seed": seed,
        "num_clients": args.num_clients,
        "num_rounds": args.num_rounds,
        "local_epochs": args.local_epochs,
        "mu": args.mu if "fedprox" in baseline else None,
        "dp_noise": args.dp_noise if baseline == "fedprox_dp" else None,
        **metrics,
    }


def summarize(rows: list[dict]) -> dict:
    summary = {}
    for baseline in sorted({row["baseline"] for row in rows}):
        subset = [row for row in rows if row["baseline"] == baseline]
        summary[baseline] = {"runs": len(subset)}
        for metric in METRIC_FIELDS:
            values = [row.get(metric) for row in subset if row.get(metric) not in (None, "")]
            if not values:
                summary[baseline][metric] = {"mean": None, "std": None}
                continue
            arr = np.array(values, dtype=float)
            summary[baseline][metric] = {
                "mean": float(arr.mean()),
                "std": float(arr.std(ddof=0)),
            }
    return summary


def write_outputs(rows: list[dict], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = output_dir / "experiment_results.csv"
    fieldnames = [
        "baseline", "seed", "num_clients", "num_rounds", "local_epochs", "mu", "dp_noise",
        "accuracy", "precision", "recall", "f1", "roc_auc", "loss", "epsilon", "runtime_s",
    ]
    with csv_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k) for k in fieldnames})

    summary = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "baselines": list(BASELINES),
        "seeds": sorted({row["seed"] for row in rows}),
        "summary": summarize(rows),
        "limitations": [
            "Default runner uses deterministic synthetic data for fast evidence generation.",
            "Results are not clinical validation.",
            "DP run reports accountant epsilon for configured synthetic training steps.",
        ],
    }
    (output_dir / "summary.json").write_text(json.dumps(summary, indent=2))


def parse_args():
    parser = argparse.ArgumentParser(description="Run FedMed research experiments.")
    parser.add_argument("--baselines", nargs="+", default=list(BASELINES), choices=BASELINES)
    parser.add_argument("--seeds", nargs="+", type=int, default=[42, 123, 2026])
    parser.add_argument("--num-clients", type=int, default=3)
    parser.add_argument("--num-rounds", type=int, default=1)
    parser.add_argument("--local-epochs", type=int, default=1)
    parser.add_argument("--mu", type=float, default=0.01)
    parser.add_argument("--dp-noise", type=float, default=1.2)
    parser.add_argument("--samples-per-client", type=int, default=24)
    parser.add_argument("--test-samples", type=int, default=48)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=0.01)
    parser.add_argument("--output-dir", type=Path, default=C.RESULTS_DIR)
    parser.add_argument("--save-predictions", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = []
    for seed in args.seeds:
        for baseline in args.baselines:
            row = run_one(args, baseline, seed)
            rows.append(row)
            print(
                f"{baseline} seed={seed} "
                f"acc={row['accuracy']:.4f} f1={row['f1']:.4f} "
                f"auc={row['roc_auc'] if row['roc_auc'] is not None else 'unavailable'}"
            )
    write_outputs(rows, args.output_dir)
    print(f"Wrote {args.output_dir / 'experiment_results.csv'}")
    print(f"Wrote {args.output_dir / 'summary.json'}")


if __name__ == "__main__":
    main()
