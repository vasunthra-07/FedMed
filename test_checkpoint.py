# =============================================================================
# tests/test_checkpoint.py  —  Unit tests for checkpoint.py
# =============================================================================

import sys
import json
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
import torch

from common import MedXRayCNN, get_parameters, set_parameters
from checkpoint import (
    save_checkpoint,
    load_checkpoint,
    list_checkpoints,
    prune_checkpoints,
    get_best_checkpoint,
)
import config as C


@pytest.fixture(autouse=True)
def clean_checkpoints(tmp_path, monkeypatch):
    """Redirect CHECKPOINTS_DIR to a temp dir for each test."""
    monkeypatch.setattr(C, "CHECKPOINTS_DIR", tmp_path)
    monkeypatch.setattr("checkpoint.CHECKPOINTS_DIR", tmp_path)
    yield
    # cleanup is automatic (tmp_path is per-test)


@pytest.fixture
def fresh_model():
    m = MedXRayCNN()
    m.eval()
    return m


# =============================================================================
# SAVE
# =============================================================================

class TestSaveCheckpoint:

    def test_saves_pt_and_meta(self, fresh_model, tmp_path):
        path = save_checkpoint(
            model_state_dict = fresh_model.state_dict(),
            round_num        = 1,
            metrics          = {"loss": 0.8, "accuracy": 0.65},
            epsilon          = 3.2,
            mu               = 0.01,
        )
        assert path.exists(), ".pt file not created"
        meta_path = path.with_name(path.name.replace(".pt", ".meta.json"))
        assert meta_path.exists(), ".meta.json file not created"

    def test_meta_content_correct(self, fresh_model, tmp_path):
        save_checkpoint(fresh_model.state_dict(), 3,
                        {"loss": 0.5, "accuracy": 0.80}, 2.1, 0.05)
        metas = list(tmp_path.glob("*.meta.json"))
        assert len(metas) == 1
        meta = json.loads(metas[0].read_text())
        assert meta["round"]    == 3
        assert meta["accuracy"] == pytest.approx(0.80, abs=1e-4)
        assert meta["mu"]       == pytest.approx(0.05, abs=1e-4)

    def test_atomic_write_no_tmp_files_left(self, fresh_model, tmp_path):
        save_checkpoint(fresh_model.state_dict(), 1,
                        {"loss": 1.0, "accuracy": 0.5}, 4.0, 0.01)
        tmp_files = list(tmp_path.glob("*.tmp"))
        assert len(tmp_files) == 0, f"Temp files left behind: {tmp_files}"

    def test_multiple_saves_create_multiple_files(self, fresh_model, tmp_path):
        for r in range(1, 4):
            time.sleep(0.01)   # ensure distinct timestamps
            save_checkpoint(fresh_model.state_dict(), r,
                            {"loss": 1.0 - r*0.1, "accuracy": 0.5 + r*0.1}, 1.0, 0.01)
        pt_files = list(tmp_path.glob("*.pt"))
        assert len(pt_files) == 3


# =============================================================================
# LOAD
# =============================================================================

class TestLoadCheckpoint:

    def test_load_restores_weights(self, tmp_path):
        model_a = MedXRayCNN()
        model_b = MedXRayCNN()

        # Perturb model_a
        with torch.no_grad():
            for p in model_a.parameters():
                p.add_(torch.randn_like(p) * 0.5)

        save_checkpoint(model_a.state_dict(), 1,
                        {"loss": 0.5, "accuracy": 0.7}, 1.0, 0.01)

        rnd, meta = load_checkpoint(model_b, torch.device("cpu"))
        assert rnd == 1

        for pa, pb in zip(model_a.parameters(), model_b.parameters()):
            assert torch.allclose(pa, pb), "Weights not restored correctly"

    def test_load_returns_zero_when_no_checkpoint(self, tmp_path):
        model = MedXRayCNN()
        rnd, meta = load_checkpoint(model, torch.device("cpu"))
        assert rnd == 0
        assert meta == {}

    def test_load_latest_by_default(self, fresh_model, tmp_path):
        for r in [1, 2, 3]:
            time.sleep(0.01)
            save_checkpoint(fresh_model.state_dict(), r,
                            {"loss": 1.0, "accuracy": r * 0.2}, float(r), 0.01)
        model = MedXRayCNN()
        rnd, meta = load_checkpoint(model, torch.device("cpu"))
        assert rnd == 3, f"Expected latest round 3, got {rnd}"

    def test_load_specific_round(self, fresh_model, tmp_path):
        for r in [1, 2, 3]:
            time.sleep(0.01)
            save_checkpoint(fresh_model.state_dict(), r,
                            {"loss": 1.0, "accuracy": r * 0.2}, float(r), 0.01)
        model = MedXRayCNN()
        rnd, _ = load_checkpoint(model, torch.device("cpu"), specific_round=2)
        assert rnd == 2


# =============================================================================
# LIST / PRUNE
# =============================================================================

class TestListAndPrune:

    def test_list_checkpoints_newest_first(self, fresh_model, tmp_path):
        for r in [1, 2, 3]:
            time.sleep(0.01)
            save_checkpoint(fresh_model.state_dict(), r,
                            {"loss": 1.0, "accuracy": 0.5}, 1.0, 0.01)
        checkpoints = list_checkpoints()
        rounds = [c["round"] for c in checkpoints]
        assert rounds == sorted(rounds, reverse=True), "Checkpoints not sorted newest-first"

    def test_prune_keeps_n_most_recent(self, fresh_model, tmp_path):
        for r in range(1, 6):
            time.sleep(0.01)
            save_checkpoint(fresh_model.state_dict(), r,
                            {"loss": 1.0, "accuracy": r * 0.1}, 1.0, 0.01)

        prune_checkpoints(keep=3)
        remaining = list_checkpoints()
        assert len(remaining) == 3
        rounds = [c["round"] for c in remaining]
        assert max(rounds) == 5   # newest kept
        assert min(rounds) == 3   # oldest kept

    def test_prune_removes_both_pt_and_meta(self, fresh_model, tmp_path):
        for r in range(1, 4):
            time.sleep(0.01)
            save_checkpoint(fresh_model.state_dict(), r,
                            {"loss": 1.0, "accuracy": 0.5}, 1.0, 0.01)
        prune_checkpoints(keep=1)
        pt_files   = list(tmp_path.glob("*.pt"))
        meta_files = list(tmp_path.glob("*.meta.json"))
        assert len(pt_files)   == 1
        assert len(meta_files) == 1

    def test_prune_noop_when_fewer_than_keep(self, fresh_model, tmp_path):
        save_checkpoint(fresh_model.state_dict(), 1,
                        {"loss": 1.0, "accuracy": 0.5}, 1.0, 0.01)
        deleted = prune_checkpoints(keep=5)
        assert deleted == 0


# =============================================================================
# BEST CHECKPOINT
# =============================================================================

class TestBestCheckpoint:

    def test_returns_highest_accuracy(self, fresh_model, tmp_path):
        accuracies = [0.5, 0.85, 0.70]
        for r, acc in enumerate(accuracies, 1):
            time.sleep(0.01)
            save_checkpoint(fresh_model.state_dict(), r,
                            {"loss": 1.0, "accuracy": acc}, 1.0, 0.01)
        best = get_best_checkpoint()
        assert best is not None
        assert best["accuracy"] == pytest.approx(0.85, abs=1e-4)

    def test_returns_none_when_empty(self, tmp_path):
        best = get_best_checkpoint()
        assert best is None
