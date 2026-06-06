# FedMed Experiment Results

Generated from `C:\Users\Hail\Downloads\medX\results\experiment_results.csv` and `C:\Users\Hail\Downloads\medX\results\summary.json`.

## Setup

- Baselines: centralized, fedavg, fedprox, fedprox_dp
- Seeds: 42, 123, 2026
- Dataset mode: deterministic synthetic benchmark data by default.
- Task: multi-label chest X-ray style classification over 14 labels.
- This report is research evidence for software behavior, not clinical validation.

## Baselines

- Centralized: one model trained over the union of simulated client datasets.
- FedAvg: local client training followed by weighted parameter averaging.
- FedProx: FedAvg-style training with a proximal regularizer.
- FedProx + DP: FedProx with configured DP noise and reported accountant epsilon.

## Mean/Std Metrics

| Baseline | Accuracy | Precision | Recall | F1 | ROC-AUC | Loss | Epsilon | Runtime (s) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| centralized | 0.0000 +/- 0.0000 | 0.1581 +/- 0.0548 | 0.6045 +/- 0.1050 | 0.2492 +/- 0.0783 | 0.4369 +/- 0.0698 | 0.6920 +/- 0.0037 | Unavailable | 0.6132 +/- 0.0526 |
| fedavg | 0.0000 +/- 0.0000 | 0.1581 +/- 0.0548 | 0.6045 +/- 0.1050 | 0.2492 +/- 0.0783 | 0.4573 +/- 0.0448 | 0.6927 +/- 0.0015 | Unavailable | 0.5098 +/- 0.0129 |
| fedprox | 0.0000 +/- 0.0000 | 0.1581 +/- 0.0548 | 0.6045 +/- 0.1050 | 0.2492 +/- 0.0783 | 0.4757 +/- 0.0376 | 0.6927 +/- 0.0015 | Unavailable | 0.5708 +/- 0.0077 |
| fedprox_dp | 0.0000 +/- 0.0000 | 0.1466 +/- 0.0488 | 0.6267 +/- 0.1275 | 0.2369 +/- 0.0733 | 0.5016 +/- 0.0711 | 0.6927 +/- 0.0014 | 6.8921 +/- 0.0000 | 1.0409 +/- 0.0847 |

## Per-Seed Metrics

| Baseline | Seed | Accuracy | Precision | Recall | F1 | ROC-AUC | Loss | Epsilon | Runtime (s) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| centralized | 42 | 0.0000 | 0.0859 | 0.4583 | 0.1447 | 0.3441 | 0.6938 | Unavailable | 0.5467 |
| fedavg | 42 | 0.0000 | 0.0859 | 0.4583 | 0.1447 | 0.4499 | 0.6934 | Unavailable | 0.5274 |
| fedprox | 42 | 0.0000 | 0.0859 | 0.4583 | 0.1447 | 0.4381 | 0.6934 | Unavailable | 0.5662 |
| fedprox_dp | 42 | 0.0000 | 0.0859 | 0.4583 | 0.1447 | 0.4559 | 0.6930 | 6.8921 | 1.1218 |
| centralized | 123 | 0.0000 | 0.1696 | 0.6552 | 0.2695 | 0.5125 | 0.6953 | Unavailable | 0.6754 |
| fedavg | 123 | 0.0000 | 0.1696 | 0.6552 | 0.2695 | 0.5155 | 0.6940 | Unavailable | 0.4968 |
| fedprox | 123 | 0.0000 | 0.1696 | 0.6552 | 0.2695 | 0.5270 | 0.6940 | Unavailable | 0.5817 |
| fedprox_dp | 123 | 0.0000 | 0.1484 | 0.6552 | 0.2420 | 0.6020 | 0.6943 | 6.8921 | 1.0771 |
| centralized | 2026 | 0.0000 | 0.2188 | 0.7000 | 0.3333 | 0.4541 | 0.6869 | Unavailable | 0.6174 |
| fedavg | 2026 | 0.0000 | 0.2188 | 0.7000 | 0.3333 | 0.4065 | 0.6907 | Unavailable | 0.5053 |
| fedprox | 2026 | 0.0000 | 0.2188 | 0.7000 | 0.3333 | 0.4621 | 0.6907 | Unavailable | 0.5645 |
| fedprox_dp | 2026 | 0.0000 | 0.2054 | 0.7667 | 0.3239 | 0.4469 | 0.6909 | 6.8921 | 0.9238 |

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
