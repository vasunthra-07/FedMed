# ChestMNIST Calibration Analysis

This analysis was requested after the completed ChestMNIST benchmark. No new model, architecture, or training run was performed.

## Objective

The scientific hypothesis is that threshold `0.5` is suppressing F1 by producing too few positive predictions, while ROC-AUC remains moderate because it evaluates ranking rather than fixed-threshold decisions.

Requested analyses:

- Persist logits and probabilities during evaluation
- Generate probability histograms
- Compute micro and macro F1
- Compute per-class ROC-AUC
- Search thresholds from `0.05` to `0.95`
- Find the threshold maximizing F1
- Generate calibration curves
- Generate precision-recall curves
- Generate threshold-vs-F1 curves

## Artifact Audit

The completed benchmark artifacts contain aggregate metrics and validation curves:

- `results/chestmnist_large_scale_results.csv`
- `results/chestmnist_large_scale_summary.json`
- `results/chestmnist_large_scale_curves.csv`

The completed benchmark artifacts do not contain:

- Per-example logits
- Per-example probabilities
- Per-example binary predictions
- Per-class confusion counts
- Final benchmark model checkpoints

Future benchmark and experiment runs can now opt in to prediction persistence with `--save-predictions`.

Checkpoint audit:

- `checkpoints/` contains no checkpoint files.
- Workspace search found no usable project model checkpoints: no benchmark `.pt`, `.pth`, `.ckpt`, or `.safetensors` files.
- `logs/checkpoint.jsonl` contains historical checkpoint-save log messages, but the referenced checkpoint files are not present on disk.

Because no persisted predictions or usable benchmark checkpoints are available, prediction-level calibration metrics cannot be measured without re-running inference from a trained checkpoint or retraining. Retraining was explicitly disallowed.

## Available Measured Evidence

The benchmark used sigmoid probabilities internally:

```text
probabilities = sigmoid(logits)
predictions = probabilities >= 0.5
```

The reported F1 is micro F1 at threshold `0.5`.

Mean measured test metrics:

| Method | Micro F1 @ 0.5 | ROC-AUC | Loss |
|---|---:|---:|---:|
| Centralized | 0.0400 +/- 0.0095 | 0.6334 +/- 0.0048 | 0.1998 +/- 0.0015 |
| FedAvg | 0.0002 +/- 0.0002 | 0.5950 +/- 0.0040 | 0.2150 +/- 0.0004 |
| FedProx | 0.0002 +/- 0.0002 | 0.5947 +/- 0.0040 | 0.2156 +/- 0.0004 |
| FedProx + DP | 0.0005 +/- 0.0007 | 0.5876 +/- 0.0040 | 0.2178 +/- 0.0025 |

Measured test-set label imbalance:

| Quantity | Value |
|---|---:|
| Test samples | 22,433 |
| Label columns | 14 |
| Total binary label decisions | 314,062 |
| Positive labels | 16,510 |
| Overall positive rate | 0.0526 |
| Mean labels per sample | 0.7360 |
| All-zero-label samples | 0.5317 |

## Requested Calibration Outputs

| Output | Status | Reason |
|---|---|---|
| Saved logits | Unavailable | No existing checkpoint or persisted logits to evaluate. |
| Saved probabilities | Unavailable | No existing checkpoint or persisted probabilities to evaluate. |
| Probability histograms | Unavailable | Requires per-example probabilities. |
| Micro F1 across thresholds `0.05-0.95` | Unavailable | Requires per-example probabilities and labels. |
| Macro F1 across thresholds `0.05-0.95` | Unavailable | Requires per-class TP/FP/FN from predictions. |
| Threshold maximizing F1 | Unavailable | Requires threshold sweep over probabilities. |
| Per-class ROC-AUC | Unavailable | Requires per-example probabilities by class. |
| Calibration curves | Unavailable | Requires predicted probabilities and labels. |
| Precision-recall curves | Unavailable | Requires predicted probabilities and labels. |
| Threshold-vs-F1 curves | Unavailable | Requires predicted probabilities and labels. |

## Future Prediction Artifacts

Future runs with prediction persistence enabled will write compressed `.npz` files under:

```text
results/predictions/
```

Each artifact contains:

- `y_true`: `(n, 14)`
- `logits`: `(n, 14)`
- `probabilities`: `(n, 14)`
- `predictions`: `(n, 14)` at threshold `0.5`
- `sample_ids`: `(n,)`
- `metadata_json`: method, seed, dataset split, checkpoint id, threshold, format version

Exact command for the lightweight ChestMNIST benchmark with prediction persistence:

```powershell
.\.venv311\Scripts\python.exe scripts\run_chestmnist_benchmark.py --save-predictions
```

Exact command for the synthetic experiment runner with prediction persistence:

```powershell
.\.venv311\Scripts\python.exe scripts\run_experiments.py --save-predictions
```

The completed large-scale benchmark must not be treated as calibrated because it did not persist prediction-level artifacts.

## Interpretation

The hypothesis that threshold `0.5` is too strict is strongly plausible, but cannot be fully proven from the persisted benchmark artifacts alone.

Measured support:

- FL methods have ROC-AUC around `0.59`, indicating non-random ranking signal.
- FL methods have near-zero micro F1 at threshold `0.5`, indicating almost no positive predictions cross the cutoff.
- Exact-match accuracy near `0.5317` aligns with the all-zero-label test sample fraction, consistent with mostly all-negative predictions.
- The test-set positive label rate is only `5.26%`, so class imbalance makes a fixed `0.5` threshold especially fragile.

What can be claimed:

- The aggregate metrics are consistent with an overly strict fixed threshold and severe class imbalance.
- ROC-AUC suggests the models rank positives above negatives better than random.
- The thresholded decision rule at `0.5` performs poorly for F1/recall.

What cannot be claimed from existing artifacts:

- The best F1 threshold.
- Whether temperature scaling improves calibration.
- Per-class calibration quality.
- Per-class ROC-AUC.
- Whether lower thresholds recover clinically meaningful recall.

## Required Evidence For The Next Calibration Pass

To complete the requested analysis without retraining, a future benchmark run or inference-only pass must persist, for each baseline and seed:

- `y_true`: shape `(n_samples, 14)`
- `logits`: shape `(n_samples, 14)`
- `probabilities`: shape `(n_samples, 14)`
- Metadata: dataset split, seed, baseline, checkpoint identifier, threshold policy

With those artifacts, the threshold search, histograms, calibration curves, precision-recall curves, per-class ROC-AUC, micro F1, and macro F1 can be measured directly.
