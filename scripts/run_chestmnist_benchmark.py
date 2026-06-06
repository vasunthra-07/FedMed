from __future__ import annotations

import csv
import json
import argparse
import random
import sys
import time
import traceback
from copy import deepcopy
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
from medmnist import ChestMNIST
from torch.utils.data import ConcatDataset, DataLoader, Subset
from torchvision import transforms

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import config as C
from common import (
    CHEST_CLASSES,
    CLIENT_CLASS_BIAS,
    DEVICE,
    MedXRayCNN,
    compute_epsilon,
    get_parameters,
    set_parameters,
    train,
    train_fedprox,
)
from prediction_artifacts import save_prediction_artifact


SEEDS = [42, 123, 2026]
BASELINES = ["centralized", "fedavg", "fedprox", "fedprox_dp"]
NUM_CLIENTS = 3
NUM_ROUNDS = 1
LOCAL_EPOCHS = 1
BATCH_SIZE = 64
SAMPLES_PER_CLIENT = 512
MU = 0.01
DP_NOISE = 1.2
DP_CLIP_NORM = 1.0
TEST_LIMIT = 4096
SAVE_PREDICTIONS = False
PREDICTION_OUTPUT_DIR = ROOT / "results"


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def transform():
    return transforms.Compose([
        transforms.Resize((28, 28)),
        transforms.ToTensor(),
        transforms.Normalize([0.5], [0.5]),
    ])


def load_split(split: str):
    return ChestMNIST(split=split, transform=transform(), download=True)


def split_stats() -> dict:
    out = {}
    for split in ["train", "val", "test"]:
        ds = load_split(split)
        labels = np.asarray(ds.labels)
        out[split] = {
            "num_samples": int(len(ds)),
            "label_shape": list(labels.shape),
            "positive_counts": [int(v) for v in labels.sum(axis=0)],
            "positive_rates": [float(v) for v in labels.mean(axis=0)],
        }
    return out


def make_client_indices(labels: np.ndarray, client_id: int, seed: int) -> np.ndarray:
    idx = np.arange(len(labels))
    mask = np.zeros(len(labels), dtype=bool)
    for cls in CLIENT_CLASS_BIAS[client_id]:
        mask |= labels[:, cls] == 1

    rng = np.random.RandomState(seed + client_id)
    biased = idx[mask]
    unbiased = idx[~mask]
    n_biased = int(SAMPLES_PER_CLIENT * C.BIAS_FRACTION)
    n_unbiased = SAMPLES_PER_CLIENT - n_biased
    chosen = np.concatenate([
        rng.choice(biased, size=n_biased, replace=len(biased) < n_biased),
        rng.choice(unbiased, size=n_unbiased, replace=len(unbiased) < n_unbiased),
    ])
    rng.shuffle(chosen)
    return chosen


def client_loaders(seed: int) -> list[DataLoader]:
    train_ds = load_split("train")
    labels = np.asarray(train_ds.labels)
    loaders = []
    for client_id in range(NUM_CLIENTS):
        indices = make_client_indices(labels, client_id, seed)
        loaders.append(DataLoader(
            Subset(train_ds, indices.tolist()),
            batch_size=BATCH_SIZE,
            shuffle=True,
            num_workers=0,
        ))
    return loaders


def test_loader(seed: int) -> DataLoader:
    ds = load_split("test")
    if TEST_LIMIT and TEST_LIMIT < len(ds):
        rng = np.random.RandomState(seed + 50_000)
        indices = rng.choice(np.arange(len(ds)), size=TEST_LIMIT, replace=False)
        ds = Subset(ds, indices.tolist())
    return DataLoader(ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)


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


def evaluate(
    model: MedXRayCNN,
    loader: DataLoader,
    *,
    method: str | None = None,
    seed: int | None = None,
    split: str = "test",
    checkpoint_id: str | None = None,
    save_predictions: bool = False,
    output_dir: Path = ROOT / "results",
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
    aucs = [roc_auc_binary(y_true[:, cls], y_prob[:, cls]) for cls in range(y_true.shape[1])]
    aucs = [auc for auc in aucs if auc is not None]
    return {
        "accuracy": float((y_pred == y_true).all(axis=1).mean()),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "roc_auc": float(np.mean(aucs)) if aucs else None,
        "loss": float(sum(losses) / max(len(y_true), 1)),
    }


def aggregate(param_sets: list[list[np.ndarray]], weights: list[int]) -> list[np.ndarray]:
    total = float(sum(weights))
    out = []
    for tensors in zip(*param_sets):
        agg = sum((w / total) * t for w, t in zip(weights, tensors))
        out.append(agg.astype(tensors[0].dtype))
    return out


def train_manual_dp_fedprox(model, global_params, loader, optimizer, mu: float, seed: int):
    rng = torch.Generator(device=DEVICE)
    rng.manual_seed(seed)
    model.train().to(DEVICE)
    global_state = {
        name: torch.tensor(value, dtype=torch.float32, device=DEVICE)
        for name, value in zip(model.state_dict().keys(), global_params)
    }
    criterion = torch.nn.BCEWithLogitsLoss()
    for imgs, lbls in loader:
        imgs, lbls = imgs.to(DEVICE), lbls.float().to(DEVICE)
        optimizer.zero_grad()
        logits = model(imgs)
        task_loss = criterion(logits, lbls)
        prox = torch.tensor(0.0, device=DEVICE)
        for name, param in model.named_parameters():
            prox += torch.sum((param - global_state[name]) ** 2)
        loss = task_loss + (mu / 2.0) * prox
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), DP_CLIP_NORM)
        with torch.no_grad():
            for param in model.parameters():
                if param.grad is not None:
                    noise = torch.normal(
                        mean=0.0,
                        std=DP_NOISE * DP_CLIP_NORM / max(imgs.size(0), 1),
                        size=param.grad.shape,
                        generator=rng,
                        device=param.grad.device,
                    )
                    param.grad.add_(noise)
        optimizer.step()


def run_centralized(seed: int, test_dl: DataLoader, baseline: str) -> dict:
    loaders = client_loaders(seed)
    train_dl = DataLoader(
        ConcatDataset([loader.dataset for loader in loaders]),
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=0,
    )
    model = MedXRayCNN().to(DEVICE)
    opt = torch.optim.SGD(model.parameters(), lr=C.LEARNING_RATE, momentum=0.0)
    train(model, train_dl, opt, epochs=LOCAL_EPOCHS, device=DEVICE)
    return evaluate(
        model,
        test_dl,
        method=baseline,
        seed=seed,
        split="test",
        save_predictions=SAVE_PREDICTIONS,
        output_dir=PREDICTION_OUTPUT_DIR,
    ) | {"epsilon": None}


def run_federated(seed: int, test_dl: DataLoader, baseline: str, fedprox: bool, dp: bool) -> dict:
    loaders = client_loaders(seed)
    global_model = MedXRayCNN().to(DEVICE)
    steps = 0
    for rnd in range(NUM_ROUNDS):
        global_params = get_parameters(global_model)
        local_params, weights = [], []
        for client_id, loader in enumerate(loaders):
            local_model = deepcopy(global_model).to(DEVICE)
            opt = torch.optim.SGD(local_model.parameters(), lr=C.LEARNING_RATE, momentum=0.0)
            if dp:
                train_manual_dp_fedprox(local_model, global_params, loader, opt, MU, seed + rnd + client_id)
            elif fedprox:
                train_fedprox(local_model, global_params, loader, opt, mu=MU, epochs=LOCAL_EPOCHS, device=DEVICE)
            else:
                train(local_model, loader, opt, epochs=LOCAL_EPOCHS, device=DEVICE)
            local_params.append(get_parameters(local_model))
            weights.append(len(loader.dataset))
            steps += LOCAL_EPOCHS * len(loader)
        set_parameters(global_model, aggregate(local_params, weights))
    epsilon = None
    if dp:
        sample_rate = BATCH_SIZE / SAMPLES_PER_CLIENT
        epsilon = compute_epsilon(DP_NOISE, steps, C.DP_TARGET_DELTA, sample_rate=sample_rate)
    return evaluate(
        global_model,
        test_dl,
        method=baseline,
        seed=seed,
        split="test",
        save_predictions=SAVE_PREDICTIONS,
        output_dir=PREDICTION_OUTPUT_DIR,
    ) | {"epsilon": epsilon}


def run_one(baseline: str, seed: int) -> dict:
    set_seed(seed)
    test_dl = test_loader(seed)
    started = time.perf_counter()
    if baseline == "centralized":
        metrics = run_centralized(seed, test_dl, baseline)
    elif baseline == "fedavg":
        metrics = run_federated(seed, test_dl, baseline, fedprox=False, dp=False)
    elif baseline == "fedprox":
        metrics = run_federated(seed, test_dl, baseline, fedprox=True, dp=False)
    elif baseline == "fedprox_dp":
        metrics = run_federated(seed, test_dl, baseline, fedprox=True, dp=True)
    else:
        raise ValueError(baseline)
    metrics["runtime_s"] = time.perf_counter() - started
    return metrics


def summarize(rows: list[dict]) -> dict:
    metrics = ["accuracy", "precision", "recall", "f1", "roc_auc", "loss", "runtime_s", "epsilon"]
    out = {}
    for baseline in BASELINES:
        subset = [row for row in rows if row["baseline"] == baseline and row["status"] == "ok"]
        out[baseline] = {"runs": len(subset)}
        for metric in metrics:
            values = [row.get(metric) for row in subset if row.get(metric) not in (None, "")]
            if not values:
                out[baseline][metric] = {"mean": None, "std": None}
            else:
                arr = np.array(values, dtype=float)
                out[baseline][metric] = {"mean": float(arr.mean()), "std": float(arr.std(ddof=0))}
    return out


def write_report(summary: dict, rows: list[dict], output_path: Path):
    chart_path = output_path.parent / "chestmnist_f1_roc_auc.png"
    baselines = list(summary["summary"].keys())
    f1 = [summary["summary"][b]["f1"]["mean"] or 0 for b in baselines]
    auc = [summary["summary"][b]["roc_auc"]["mean"] or 0 for b in baselines]
    x = np.arange(len(baselines))
    plt.figure(figsize=(8, 4))
    plt.bar(x - 0.18, f1, 0.36, label="F1")
    plt.bar(x + 0.18, auc, 0.36, label="ROC-AUC")
    plt.xticks(x, baselines, rotation=20)
    plt.ylim(0, 1)
    plt.legend()
    plt.tight_layout()
    plt.savefig(chart_path)
    plt.close()

    def cell(baseline, metric):
        item = summary["summary"][baseline][metric]
        if item["mean"] is None:
            return "Unavailable"
        return f"{item['mean']:.4f} +/- {item['std']:.4f}"

    table = [
        "| Baseline | Accuracy | Precision | Recall | F1 | ROC-AUC | Loss | Runtime (s) | Epsilon |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for baseline in baselines:
        table.append(
            f"| {baseline} | {cell(baseline, 'accuracy')} | {cell(baseline, 'precision')} | "
            f"{cell(baseline, 'recall')} | {cell(baseline, 'f1')} | {cell(baseline, 'roc_auc')} | "
            f"{cell(baseline, 'loss')} | {cell(baseline, 'runtime_s')} | {cell(baseline, 'epsilon')} |"
        )

    failures = [row for row in rows if row["status"] != "ok"]
    failure_text = "None." if not failures else "\n".join(
        f"- {row['baseline']} seed={row['seed']}: {row['error']}" for row in failures
    )
    output_path.write_text(
        "# ChestMNIST Benchmark Report\n\n"
        "This report contains measured ChestMNIST validation benchmark results. It is not clinical validation.\n\n"
        "## Setup\n\n"
        f"- Seeds: {SEEDS}\n"
        f"- Baselines: {BASELINES}\n"
        f"- Rounds: {NUM_ROUNDS}\n"
        f"- Local epochs: {LOCAL_EPOCHS}\n"
        f"- Batch size: {BATCH_SIZE}\n"
        f"- Clients: {NUM_CLIENTS}\n"
        f"- Samples per client: {SAMPLES_PER_CLIENT}\n"
        f"- Test evaluation limit: {TEST_LIMIT} sampled test images\n\n"
        "## Split Verification\n\n"
        "```json\n"
        + json.dumps(summary["splits"], indent=2)
        + "\n```\n\n"
        "## Mean Metrics\n\n"
        + "\n".join(table)
        + "\n\n"
        "## Charts\n\n"
        f"![ChestMNIST F1 and ROC-AUC](./{chart_path.name})\n\n"
        "## Observations\n\n"
        "- All reported values are measured from the benchmark run artifacts.\n"
        "- Exact-match multi-label accuracy is expected to be harsh for ChestMNIST.\n"
        "- ROC-AUC is reported when each class has positive and negative examples in the evaluated sample.\n"
        "- DP epsilon is reported only for the FedProx + DP baseline.\n\n"
        "## Failed Experiments\n\n"
        f"{failure_text}\n\n"
        "## Limitations\n\n"
        "- This run uses a bounded client/test sample count to keep validation practical on local CPU.\n"
        "- Results are benchmark evidence, not clinical evidence.\n"
        "- No HIPAA, GDPR, production readiness, or diagnostic-safety claim is made.\n"
    )


def parse_args():
    parser = argparse.ArgumentParser(description="Run the ChestMNIST benchmark.")
    parser.add_argument("--save-predictions", action="store_true")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "results")
    return parser.parse_args()


def main():
    global SAVE_PREDICTIONS, PREDICTION_OUTPUT_DIR
    args = parse_args()
    SAVE_PREDICTIONS = args.save_predictions
    PREDICTION_OUTPUT_DIR = args.output_dir
    results_dir = ROOT / "results"
    docs_dir = ROOT / "docs"
    results_dir.mkdir(exist_ok=True)
    docs_dir.mkdir(exist_ok=True)
    rows = []
    splits = split_stats()
    for seed in SEEDS:
        for baseline in BASELINES:
            row = {
                "baseline": baseline,
                "seed": seed,
                "rounds": NUM_ROUNDS,
                "local_epochs": LOCAL_EPOCHS,
                "batch_size": BATCH_SIZE,
                "samples_per_client": SAMPLES_PER_CLIENT,
                "status": "ok",
                "error": "",
            }
            try:
                metrics = run_one(baseline, seed)
                row.update(metrics)
                print(f"{baseline} seed={seed} f1={row['f1']:.4f} auc={row['roc_auc']}")
            except Exception as exc:
                row["status"] = "failed"
                row["error"] = str(exc)
                row["traceback"] = traceback.format_exc()
                print(f"FAILED {baseline} seed={seed}: {exc}")
            rows.append(row)

    csv_path = results_dir / "chestmnist_results.csv"
    fields = [
        "baseline", "seed", "status", "error", "rounds", "local_epochs", "batch_size",
        "samples_per_client", "accuracy", "precision", "recall", "f1", "roc_auc",
        "loss", "runtime_s", "epsilon",
    ]
    with csv_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field) for field in fields})

    summary = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "device": str(DEVICE),
        "seeds": SEEDS,
        "baselines": BASELINES,
        "config": {
            "rounds": NUM_ROUNDS,
            "local_epochs": LOCAL_EPOCHS,
            "batch_size": BATCH_SIZE,
            "num_clients": NUM_CLIENTS,
            "samples_per_client": SAMPLES_PER_CLIENT,
            "test_limit": TEST_LIMIT,
            "mu": MU,
            "dp_noise": DP_NOISE,
        },
        "splits": splits,
        "summary": summarize(rows),
        "failures": [row for row in rows if row["status"] != "ok"],
    }
    summary_path = results_dir / "chestmnist_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2))
    write_report(summary, rows, docs_dir / "CHESTMNIST_BENCHMARK_REPORT.md")
    print(f"Wrote {csv_path}")
    print(f"Wrote {summary_path}")
    print(f"Wrote {docs_dir / 'CHESTMNIST_BENCHMARK_REPORT.md'}")


if __name__ == "__main__":
    main()
