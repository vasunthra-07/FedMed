# FedMed Healthcare Readiness Gap Analysis

## Positioning

FedMed is an advanced prototype for federated learning research. It is not HIPAA compliant, not GDPR compliant, not clinically validated, and not approved for patient care.

## HIPAA Gap Analysis

Current status:
- The default benchmark path uses public ChestMNIST data rather than hospital PHI.
- The project includes basic logging, dashboard authentication, TLS support, and upload validation.

Missing controls:
- Business Associate Agreement process.
- Formal PHI inventory and data-flow mapping.
- Access control policy tied to real identities.
- Audit logging for every PHI access.
- Retention and deletion policy.
- Breach detection and notification process.
- Encryption-at-rest policy and key management.
- Risk analysis and risk management documentation.

Required work:
- Deploy identity provider integration.
- Add immutable audit trails.
- Add secrets manager and managed key storage.
- Document administrative, physical, and technical safeguards.
- Run a third-party HIPAA security assessment.

Risk level: High.

## GDPR Gap Analysis

Current status:
- The architecture reduces central raw-data movement in the intended FL setup.
- JWT expiration and role-aware access helpers exist.

Missing controls:
- Lawful basis documentation.
- Data Protection Impact Assessment.
- Data subject rights workflow.
- Purpose limitation controls.
- Data minimization evidence.
- Cross-border transfer assessment.
- Processor/subprocessor register.
- Right-to-erasure handling across checkpoints, logs, and telemetry.

Required work:
- Create DPIA and records of processing.
- Add deletion and retention controls for all persisted artifacts.
- Add privacy notices and consent/legal-basis mapping.
- Review logs/checkpoints for personal-data leakage.

Risk level: High.

## Clinical Validation Gap

Current status:
- The model can be trained and evaluated on a benchmark dataset.
- Grad-CAM can be generated from a saved checkpoint.

Missing controls:
- External validation on clinically representative datasets.
- Radiologist review study.
- Calibration analysis.
- Bias and subgroup performance analysis.
- Failure-mode analysis.
- Clinical workflow integration testing.
- Prospective or retrospective clinical study protocol.

Required work:
- Define intended use.
- Validate on real-world data under institutional review.
- Measure sensitivity/specificity per pathology.
- Document model limitations and contraindications.

Risk level: Critical.

## Audit Trail Gap

Current status:
- The project writes structured logs and telemetry JSONL.
- P1 telemetry schema validation rejects malformed events.

Missing controls:
- Tamper-evident storage.
- User identity correlation for every administrative action.
- Centralized log retention.
- Access-review workflow.
- Alerting on suspicious activity.

Required work:
- Use append-only managed logging.
- Add audit event IDs and actor IDs.
- Add retention and export policies.
- Add alert rules for auth failures, rejected updates, and config changes.

Risk level: High.

## Patient Safety Risk

Current status:
- The project is not positioned as a clinical decision system.
- The dashboard now avoids random-weight Grad-CAM explanations by requiring a checkpoint.

Missing controls:
- Intended-use statement.
- Human factors evaluation.
- Clinical safety case.
- Monitoring for model drift.
- Incident response for incorrect predictions.
- Guardrails against using prototype outputs for diagnosis.

Required work:
- Add explicit non-diagnostic labeling in deployment materials.
- Validate model performance under clinical review.
- Establish model governance and rollback procedures.

Risk level: Critical.

## What This Project Can Claim

- It implements a tested prototype of Flower-based federated learning components.
- It includes FedProx training logic with regression tests.
- It includes Opacus-backed DP accounting helpers.
- It includes checkpoint-backed Grad-CAM generation.
- It includes basic RBAC permission helpers.
- It includes telemetry schema validation and update rejection tests.

## What This Project Cannot Claim

- HIPAA compliance.
- GDPR compliance.
- Clinical validation.
- Radiologist trust.
- Production readiness.
- FDA/CE readiness.
- Robustness against all adversarial clients.
- Patient-care suitability.
