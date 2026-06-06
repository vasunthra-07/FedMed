# FedMed Development Diary

This diary records implementation, validation, progress, setbacks, and decisions across the FedMed work. It is intentionally factual: no production, HIPAA/GDPR compliance, or clinical-validation claims are made.

## 2026-06-05 to 2026-06-06

### P0 Stabilization

- Fixed working federated-learning basics without rewriting the project.
- Addressed FedProx parameter handling and DP epsilon accounting.
- Improved checkpoint-backed Grad-CAM wiring.
- Hardened runtime secret validation and TLS wiring.
- Added Docker/runtime path cleanup.
- Verified the P0 test suite after changes.

Setbacks:

- Several fixes had to preserve existing behavior instead of rewriting earlier code.
- Runtime security claims had to be narrowed to code-level checks only.

### P1 Evidence and Hardening

- Added integration tests for end-to-end FL, multi-client behavior, checkpoint recovery, telemetry validation, RBAC, and aggregation rejection.
- Added research protocol and healthcare readiness gap-analysis documentation.
- Added update validation for NaN/Inf/extreme client updates.
- Confirmed tests passed after P1.

Setbacks:

- Healthcare-readiness language needed careful constraint: the project cannot claim HIPAA/GDPR compliance or clinical validation.

### P2 Research Evidence

- Added experiment-runner and report-generation support for baseline comparisons.
- Added multiple-seed support, ablation knobs, and lightweight Flower smoke testing.
- Added dashboard evidence mode without cosmetic UI work.
- Generated synthetic evidence artifacts and report.

Setbacks:

- Synthetic evidence was useful for pipeline validation but insufficient for ChestMNIST benchmark claims.

### ChestMNIST Validation Benchmark

- Verified ChestMNIST download from local MedMNIST cache.
- Verified train/validation/test splits and label distributions.
- Ran initial smaller ChestMNIST benchmark across centralized, FedAvg, FedProx, and FedProx + DP.
- Generated `results/chestmnist_results.csv`, `results/chestmnist_summary.json`, and `docs/CHESTMNIST_BENCHMARK_REPORT.md`.

Measured issue:

- Exact-match accuracy and F1 were low, while ROC-AUC showed moderate ranking signal.

### Large-Scale ChestMNIST Benchmark

- Ran the requested larger benchmark with:
  - Seeds: `42`, `123`, `2026`
  - Clients: `3`
  - Rounds: `10`
  - Local epochs: `2`
  - Batch size: `64`
  - Samples per client: `5000`
  - Full validation split
  - Full test split
- Generated:
  - `results/chestmnist_large_scale_results.csv`
  - `results/chestmnist_large_scale_summary.json`
  - `results/chestmnist_large_scale_curves.csv`
  - `docs/CHESTMNIST_RESEARCH_RESULTS.md`
  - training, ROC-AUC, and privacy-utility charts

Setbacks:

- The benchmark ran on CPU and took many hours.
- A foreground probe and background wrapper behavior interrupted early partial runs.
- A resume-safe temporary validation runner was used so completed rows were preserved.
- The temporary runner was removed after completion to avoid leaving implementation clutter.

Measured outcome:

- All `12 / 12` large-scale runs completed.
- No benchmark failures were recorded.
- F1 remained near zero for FL methods at threshold `0.5`.
- ROC-AUC remained around `0.59-0.63`.

### Metric and Calibration Analysis

- Audited evaluation logic:
  - `BCEWithLogitsLoss` on raw logits
  - `sigmoid(logits)` for probabilities
  - fixed threshold `0.5`
  - micro precision/recall/F1
  - exact-match multi-label accuracy
  - averaged one-vs-rest ROC-AUC
- Computed test-label imbalance facts:
  - Positive label rate: `5.26%`
  - All-zero-label test samples: `53.17%`
- Created `docs/METRIC_ANALYSIS.md`.
- Created `docs/CALIBRATION_ANALYSIS.md`.

Setbacks:

- The completed benchmark did not persist per-example logits, probabilities, predictions, or usable final checkpoints.
- Probability histograms, threshold search, calibration curves, precision-recall curves, macro F1, and per-class ROC-AUC could not be measured from existing artifacts.
- Diagnostic placeholder plots were generated only to indicate unavailability; no missing values were fabricated.

### Prediction Artifact Persistence

- Added `prediction_artifacts.py` to write compressed `.npz` prediction artifacts.
- Added optional `--save-predictions` support to:
  - `scripts/run_chestmnist_benchmark.py`
  - `scripts/run_experiments.py`
- Future runs can persist:
  - `y_true`
  - `logits`
  - `probabilities`
  - binary predictions at threshold `0.5`
  - `sample_ids`
  - method
  - seed
  - dataset split
  - checkpoint id when available
- Prediction artifacts write to `results/predictions/`.
- Added `test_prediction_artifacts.py` to verify `(n, 14)` shapes.
- Updated `docs/CALIBRATION_ANALYSIS.md` with future commands and evidence requirements.

Setbacks:

- This does not recover missing predictions from completed benchmark runs.
- This does not complete calibration analysis by itself.
- A future benchmark or inference-only pass with `--save-predictions` is required before threshold search and calibration curves can be measured.

## Future Notes

- Record every benchmark run with command, seed list, scale, output artifacts, failures, and caveats.
- Preserve prediction-level artifacts for every scientific run.
- Do not claim calibration, clinical validity, compliance, or production readiness without measured evidence and explicit validation.
