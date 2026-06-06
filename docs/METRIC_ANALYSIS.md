# ChestMNIST Metric Analysis

This analysis uses the completed large-scale ChestMNIST benchmark artifacts only. No retraining was performed.

## Data Availability

The benchmark persisted aggregate metrics, validation curves, and summary JSON. It did not persist final per-example logits, probabilities, binary predictions, or benchmark model checkpoints.

Available measured artifacts:

- `results/chestmnist_large_scale_results.csv`
- `results/chestmnist_large_scale_summary.json`
- `results/chestmnist_large_scale_curves.csv`

Unavailable from existing artifacts:

- Probability histograms
- F1 at thresholds other than the benchmark threshold
- Per-class ROC-AUC values
- Macro F1

These are not reported as measured values because reconstructing them requires per-example predictions or saved model checkpoints.

## Metric Audit

The benchmark evaluation uses multi-label binary classification logic:

- Loss: `BCEWithLogitsLoss`, applied to raw logits.
- Probability conversion: `torch.sigmoid(logits)`.
- Thresholding: `y_pred = (y_prob >= 0.5).astype(int)`.
- Precision: micro-counted over all classes using global TP / (TP + FP).
- Recall: micro-counted over all classes using global TP / (TP + FN).
- F1: micro F1 from the above micro precision and recall.
- Exact-match accuracy: sample is correct only if all 14 labels match exactly.
- ROC-AUC: one-vs-rest binary AUC per class, then averaged across classes.

No metric implementation bug was found in the audited benchmark logic. The low F1 is consistent with thresholded predictions at 0.5 producing almost no positive labels, while ROC-AUC remains moderate because it measures ranking quality independent of a fixed threshold.

## Test Label Imbalance

Measured ChestMNIST test split:

| Quantity | Value |
|---|---:|
| Test samples | 22,433 |
| Label columns | 14 |
| Total label decisions | 314,062 |
| Positive labels | 16,510 |
| Overall positive rate | 0.0526 |
| Mean labels per sample | 0.7360 |
| All-zero-label samples | 0.5317 |

The exact-match accuracy for FedAvg/FedProx/FedProx+DP is close to `0.5317`, the measured all-zero-label fraction. This indicates these models often predict all labels as negative at threshold 0.5.

## Threshold vs F1

Only threshold `0.5` was measured in the completed benchmark. Other thresholds require saved probabilities.

| Threshold | Centralized F1 | FedAvg F1 | FedProx F1 | FedProx + DP F1 |
|---:|---:|---:|---:|---:|
| 0.1 | Unavailable | Unavailable | Unavailable | Unavailable |
| 0.2 | Unavailable | Unavailable | Unavailable | Unavailable |
| 0.3 | Unavailable | Unavailable | Unavailable | Unavailable |
| 0.4 | Unavailable | Unavailable | Unavailable | Unavailable |
| 0.5 | 0.0400 +/- 0.0095 | 0.0002 +/- 0.0002 | 0.0002 +/- 0.0002 | 0.0005 +/- 0.0007 |
| 0.6 | Unavailable | Unavailable | Unavailable | Unavailable |

## Micro and Macro F1

The benchmark's reported F1 is micro F1 at threshold 0.5.

| Method | Micro F1 at 0.5 |
|---|---:|
| Centralized | 0.0400 +/- 0.0095 |
| FedAvg | 0.0002 +/- 0.0002 |
| FedProx | 0.0002 +/- 0.0002 |
| FedProx + DP | 0.0005 +/- 0.0007 |

Macro F1 is unavailable because per-class TP/FP/FN counts were not persisted.

## ROC-AUC

The benchmark reports averaged one-vs-rest ROC-AUC across the 14 ChestMNIST labels.

| Method | Mean ROC-AUC |
|---|---:|
| Centralized | 0.6334 +/- 0.0048 |
| FedAvg | 0.5950 +/- 0.0040 |
| FedProx | 0.5947 +/- 0.0040 |
| FedProx + DP | 0.5876 +/- 0.0040 |

Per-class ROC-AUC is unavailable because the benchmark did not persist per-class AUCs or per-example probabilities.

## Interpretation

The results point to threshold behavior and class imbalance as the main reasons F1 is near zero while ROC-AUC is moderate.

Evidence:

- ROC-AUC around `0.59-0.63` means the models have some ranking signal.
- Micro recall is near zero for FL methods at threshold 0.5, meaning very few true positive labels cross the 0.5 cutoff.
- The test set positive label rate is only `5.26%`.
- The all-zero-label sample fraction is `53.17%`, matching the FL exact-match accuracy level.
- FedAvg/FedProx/FedProx+DP exact-match accuracy near `0.5317` is consistent with mostly all-negative predictions, not strong disease detection.

Conclusion:

- Metrics are not obviously implemented incorrectly.
- Threshold `0.5` is likely too strict for these trained models.
- Class imbalance is strongly influencing thresholded metrics.
- The FL models show weak calibrated decision performance at threshold 0.5, even though ROC-AUC shows non-random ranking.
- The centralized model performs better, but its recall and F1 remain low, so it is also not producing strong thresholded detections.

## Missing Prediction Artifacts

The requested probability histograms, threshold sweep, per-class ROC-AUC, and macro F1 cannot be completed from the existing benchmark outputs. To measure them without retraining in future runs, the benchmark must persist final test-set probabilities and labels for each baseline/seed.
