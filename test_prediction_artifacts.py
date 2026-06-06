import json

import numpy as np

from prediction_artifacts import save_prediction_artifact


def test_prediction_artifact_shapes(tmp_path):
    n = 5
    y_true = np.zeros((n, 14), dtype=np.int64)
    logits = np.linspace(-1.0, 1.0, n * 14, dtype=np.float32).reshape(n, 14)

    path = save_prediction_artifact(
        tmp_path,
        y_true,
        logits,
        method="fedavg",
        seed=42,
        split="test",
        sample_ids=np.arange(100, 100 + n),
        checkpoint_id="round-010",
    )

    assert path.exists()
    with np.load(path) as data:
        assert data["y_true"].shape == (n, 14)
        assert data["logits"].shape == (n, 14)
        assert data["probabilities"].shape == (n, 14)
        assert data["predictions"].shape == (n, 14)
        assert data["sample_ids"].shape == (n,)
        metadata = json.loads(str(data["metadata_json"]))
        assert metadata["method"] == "fedavg"
        assert metadata["seed"] == 42
        assert metadata["dataset_split"] == "test"
        assert metadata["checkpoint_id"] == "round-010"
