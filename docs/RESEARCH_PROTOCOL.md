# FedMed Research Protocol

## Scope

This protocol defines how to evaluate FedMed as a privacy-preserving federated learning prototype for ChestMNIST-style multi-label chest X-ray classification. It is not a clinical validation protocol and must not be presented as evidence of hospital deployment readiness.

## Experiment Setup

- Dataset: ChestMNIST from MedMNIST, using the official train/validation/test splits where available.
- Task: multi-label classification over 14 thoracic findings.
- Image shape: 1 x 28 x 28 grayscale inputs after the project preprocessing pipeline.
- Clients: three simulated hospitals with fixed label-skew partitions.
- Hardware: record CPU/GPU model, RAM, CUDA version, PyTorch version, Flower version, Opacus version.
- Seeds: run every experiment with at least five seeds: 0, 1, 2, 3, 4.
- Reporting: report mean, standard deviation, and 95% confidence intervals across seeds.

## Dataset Assumptions

- The current partitioning simulates institutional skew; it is not evidence of real hospital distribution shift.
- ChestMNIST is low-resolution and cannot support clinical claims.
- No protected health information is used by default in the public benchmark setup.
- External validation data is required before any healthcare claim.

## Baselines

1. Centralized
   - Train one model on the union of all simulated client training data.
   - This is the upper-bound engineering baseline, not a deployable privacy-preserving setup.

2. FedAvg
   - Use Flower FedAvg without the FedProx proximal term.
   - Report convergence, communication rounds, and final metrics.

3. FedProx
   - Enable the proximal term with documented `mu` values.
   - Compare stability under non-IID skew against FedAvg.

4. FedProx + Differential Privacy
   - Enable Opacus DP-SGD on clients.
   - Report epsilon, delta, clipping norm, noise multiplier, sample rate, and accountant type.
   - Treat privacy and utility as a tradeoff; do not claim production privacy from a single epsilon number.

## Metrics

Report the following on a held-out test set:

- Exact-match accuracy
- Per-class precision
- Macro precision
- Per-class recall
- Macro recall
- Per-class F1
- Macro F1
- Per-class ROC-AUC
- Macro ROC-AUC
- Loss
- Rounds to convergence
- Client update rejection count
- Client failure count

## Ablation Studies

- FedAvg vs FedProx at `mu` values: 0.001, 0.01, 0.05, 0.1.
- DP noise multiplier values: 0.8, 1.2, 1.6, 2.0.
- Clipping norm values: 0.5, 1.0, 2.0.
- Non-IID skew values: 0.25, 0.50, 0.75.
- Number of clients: 3 simulated clients initially, then 10 and 30 if infrastructure supports it.
- Client dropout rates: 0%, 10%, 30%.
- Aggregation hardening enabled vs disabled.

## Multiple-Seed Plan

Each experiment must run with fixed seeds across:

- Python random
- NumPy
- PyTorch CPU
- PyTorch CUDA, when available
- Data partitioning

A result is reportable only when all configured seeds complete or failures are explicitly documented.

## Statistical Significance

- Compare paired runs by seed when evaluating FedAvg vs FedProx.
- Use confidence intervals for all headline metrics.
- Avoid claiming superiority from one run.
- Include failed runs in the analysis table.

## Reproducibility Checklist

- Commit hash or release tag
- Dependency lock file or pinned requirements
- Exact environment variables
- Dataset version
- Hardware description
- Seed list
- Number of rounds
- Client count
- Partition parameters
- DP parameters
- Checkpoint path and metadata

## Limitations

- Current benchmark data is not clinical-grade resolution.
- Simulated hospitals do not prove real-world generalization.
- Differential privacy accounting is only valid for the configured training mechanism and accountant.
- Grad-CAM is a model-debugging aid, not a clinical explanation.
- No HIPAA, GDPR, FDA, CE, or ethics-board approval is implied.
