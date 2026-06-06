# FedMed

FedMed is a research prototype for federated learning on medical-imaging-style data. It includes Flower-based federated training, FedAvg/FedProx flows, Opacus-backed privacy accounting helpers, checkpointing, telemetry, basic RBAC, and experiment/report tooling.

FedMed is not production ready, not HIPAA compliant, not GDPR compliant, and not clinically validated.

## Run Tests

```bash
python -m pytest -q
```

The test suite includes unit tests, strategy-level integration tests, poisoned-update rejection tests, telemetry schema validation, checkpoint recovery tests, and a lightweight subprocess Flower smoke test using synthetic data.

## Run Experiments

Run the default synthetic benchmark over three seeds:

```bash
python scripts/run_experiments.py
```

Useful flags:

```bash
python scripts/run_experiments.py \
  --baselines centralized fedavg fedprox fedprox_dp \
  --seeds 42 123 2026 \
  --num-clients 3 \
  --num-rounds 1 \
  --local-epochs 1 \
  --mu 0.01 \
  --dp-noise 1.2
```

Outputs:

- `results/experiment_results.csv`
- `results/summary.json`

Metrics include accuracy, precision, recall, F1, ROC-AUC when computable, loss, epsilon for DP runs, runtime, and seed.

## Generate Research Report

```bash
python scripts/generate_research_report.py
```

Output:

- `docs/EXPERIMENT_RESULTS.md`

The report summarizes setup, baselines, per-seed metrics, mean/std results, DP privacy/utility tradeoff, FedAvg vs FedProx comparison, limitations, and allowed/forbidden claims.

## Run Federated Training

Development mode with synthetic data:

```bash
set FEDMED_USE_TLS=false
set FEDMED_SYNTHETIC_DATA=true
set FEDMED_NUM_ROUNDS=1
set FEDMED_MIN_CLIENTS=3
set FEDMED_SAMPLES_PER_CLIENT=12
python server.py
```

In separate terminals:

```bash
python client.py --id=0 --server=127.0.0.1:8080
python client.py --id=1 --server=127.0.0.1:8080
python client.py --id=2 --server=127.0.0.1:8080
```

## Run Dashboard

Set required secrets before starting Streamlit:

```bash
set FEDMED_JWT_SECRET=<at-least-32-random-characters>
set FEDMED_DASH_PASS_HASH=<bcrypt-password-hash>
streamlit run app.py
```

The dashboard includes a read-only Evidence section that can show latest experiment summaries, optional test status artifacts, and checkpoint metadata used for Grad-CAM.

## Allowed Claims

- FedMed implements and tests a Flower-based federated learning prototype.
- FedMed includes FedAvg, FedProx, and FedProx + DP experiment paths.
- FedMed records experiment metrics and generates research reports.
- FedMed validates telemetry schema and rejects malformed telemetry records.
- FedMed rejects NaN, Inf, shape-mismatched, and extreme-norm client updates.
- FedMed applies coordinate clipping to accepted client updates.
- FedMed has basic dashboard RBAC helpers for admin, researcher, and viewer roles.

## Forbidden Claims

- Do not claim production readiness.
- Do not claim HIPAA compliance.
- Do not claim GDPR compliance.
- Do not claim clinical validation.
- Do not claim FDA or CE readiness.
- Do not claim radiologist trust.
- Do not claim the model is safe for diagnosis or patient care.
- Do not claim Byzantine robustness beyond the tested anomaly rejection and clipping behavior.
