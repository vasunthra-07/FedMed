from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import config as C


def fmt(value):
    if value in (None, ""):
        return "Unavailable"
    if isinstance(value, float):
        return f"{value:.4f}"
    return str(value)


def load_rows(path: Path) -> list[dict]:
    with path.open(newline="") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        for key in ["accuracy", "precision", "recall", "f1", "roc_auc", "loss", "epsilon", "runtime_s"]:
            if row.get(key) in (None, ""):
                row[key] = None
            else:
                row[key] = float(row[key])
        row["seed"] = int(row["seed"])
    return rows


def metric_table(summary: dict) -> str:
    lines = [
        "| Baseline | Accuracy | Precision | Recall | F1 | ROC-AUC | Loss | Epsilon | Runtime (s) |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for baseline, data in summary["summary"].items():
        cells = []
        for metric in ["accuracy", "precision", "recall", "f1", "roc_auc", "loss", "epsilon", "runtime_s"]:
            entry = data.get(metric, {})
            mean, std = entry.get("mean"), entry.get("std")
            cells.append("Unavailable" if mean is None else f"{mean:.4f} +/- {std:.4f}")
        lines.append(f"| {baseline} | " + " | ".join(cells) + " |")
    return "\n".join(lines)


def per_seed_table(rows: list[dict]) -> str:
    lines = [
        "| Baseline | Seed | Accuracy | Precision | Recall | F1 | ROC-AUC | Loss | Epsilon | Runtime (s) |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for row in rows:
        lines.append(
            f"| {row['baseline']} | {row['seed']} | {fmt(row['accuracy'])} | "
            f"{fmt(row['precision'])} | {fmt(row['recall'])} | {fmt(row['f1'])} | "
            f"{fmt(row['roc_auc'])} | {fmt(row['loss'])} | {fmt(row['epsilon'])} | "
            f"{fmt(row['runtime_s'])} |"
        )
    return "\n".join(lines)


def generate(results_csv: Path, summary_json: Path, output_path: Path) -> None:
    rows = load_rows(results_csv)
    summary = json.loads(summary_json.read_text())
    output_path.parent.mkdir(parents=True, exist_ok=True)

    text = f"""# FedMed Experiment Results

Generated from `{results_csv}` and `{summary_json}`.

## Setup

- Baselines: {", ".join(summary.get("baselines", []))}
- Seeds: {", ".join(str(seed) for seed in summary.get("seeds", []))}
- Dataset mode: deterministic synthetic benchmark data by default.
- Task: multi-label chest X-ray style classification over 14 labels.
- This report is research evidence for software behavior, not clinical validation.

## Baselines

- Centralized: one model trained over the union of simulated client datasets.
- FedAvg: local client training followed by weighted parameter averaging.
- FedProx: FedAvg-style training with a proximal regularizer.
- FedProx + DP: FedProx with configured DP noise and reported accountant epsilon.

## Mean/Std Metrics

{metric_table(summary)}

## Per-Seed Metrics

{per_seed_table(rows)}

## DP Privacy/Utility Tradeoff

The `fedprox_dp` row reports epsilon when it is computable. Utility should be compared against `fedprox` using accuracy, F1, ROC-AUC, and loss. A lower epsilon generally indicates stronger privacy, but this report does not prove deployment-grade privacy.

## FedAvg vs FedProx Comparison

Compare `fedavg` and `fedprox` across the same seeds. FedProx is expected to help under non-IID client drift, but superiority should only be claimed if repeated runs show consistent improvement with confidence intervals.

## Limitations

- Synthetic benchmark mode is used for fast reproducible evidence unless explicitly replaced with real dataset execution.
- ChestMNIST-scale evaluation is not clinical validation.
- ROC-AUC is marked unavailable if a class lacks positive or negative labels.
- DP epsilon applies only to the configured run and accountant assumptions.
- No HIPAA compliance, GDPR compliance, production readiness, or clinical diagnostic claim is made.

## What Can Be Claimed

- The experiment runner executed the listed baselines for the listed seeds.
- The report includes reproducible mean/std metrics from generated CSV/JSON artifacts.
- DP runs include an epsilon value when the accountant can compute it.

## What Cannot Be Claimed

- Clinical validation.
- Hospital deployment readiness.
- HIPAA or GDPR compliance.
- FDA/CE readiness.
- Radiologist trust.
"""
    output_path.write_text(text)


def parse_args():
    parser = argparse.ArgumentParser(description="Generate FedMed experiment report.")
    parser.add_argument("--results-csv", type=Path, default=C.RESULTS_DIR / "experiment_results.csv")
    parser.add_argument("--summary-json", type=Path, default=C.RESULTS_DIR / "summary.json")
    parser.add_argument("--output", type=Path, default=C.BASE_DIR / "docs" / "EXPERIMENT_RESULTS.md")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    generate(args.results_csv, args.summary_json, args.output)
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
