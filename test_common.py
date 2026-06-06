# =============================================================================
# tests/test_common.py  —  Unit tests for common.py
# =============================================================================
# Run with:  pytest tests/ -v
# =============================================================================

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import pytest
import torch

from common import (
    CHEST_CLASSES,
    CLIENT_CLASS_BIAS,
    DEVICE,
    GradCAM,
    MedXRayCNN,
    SEBlock,
    MBConvBlock,
    compute_epsilon,
    get_parameters,
    set_parameters,
    test,
    train,
    train_fedprox,
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture(scope="module")
def model():
    """Fresh MedXRayCNN on CPU for all tests."""
    m = MedXRayCNN(num_classes=14)
    m.eval()
    return m


@pytest.fixture(scope="module")
def dummy_batch():
    """Minimal (2, 1, 28, 28) batch simulating ChestMNIST inputs."""
    imgs   = torch.randn(2, 1, 28, 28)
    labels = torch.randint(0, 2, (2, 14)).float()
    return imgs, labels


@pytest.fixture(scope="module")
def dummy_loader(dummy_batch):
    """Single-batch DataLoader for training loop tests."""
    from torch.utils.data import DataLoader, TensorDataset
    imgs, labels = dummy_batch
    return DataLoader(TensorDataset(imgs, labels), batch_size=2)


# =============================================================================
# MODEL ARCHITECTURE
# =============================================================================

class TestMedXRayCNN:

    def test_output_shape(self, model, dummy_batch):
        imgs, _ = dummy_batch
        with torch.no_grad():
            out = model(imgs)
        assert out.shape == (2, 14), f"Expected (2,14), got {out.shape}"

    def test_output_is_logits_not_probs(self, model, dummy_batch):
        """Outputs should be raw logits — values outside [0,1] expected."""
        imgs, _ = dummy_batch
        with torch.no_grad():
            out = model(imgs)
        # At least some logits should be outside [0,1]
        outside = ((out < 0) | (out > 1)).any().item()
        assert outside, "Model appears to be outputting probabilities, not logits"

    def test_parameter_count(self, model):
        n_params = sum(p.numel() for p in model.parameters())
        # Should be <500K for FL communication efficiency
        assert n_params < 500_000, f"Model too large: {n_params:,} parameters"
        assert n_params > 50_000,  f"Model suspiciously small: {n_params:,} parameters"

    def test_gradcam_target_layer_exists(self, model):
        layer = model.get_gradcam_target_layer()
        assert layer is not None
        assert isinstance(layer, torch.nn.Conv2d)

    def test_forward_no_nan(self, model, dummy_batch):
        imgs, _ = dummy_batch
        with torch.no_grad():
            out = model(imgs)
        assert not torch.isnan(out).any(), "NaN in model output"
        assert not torch.isinf(out).any(), "Inf in model output"

    def test_different_inputs_different_outputs(self, model):
        x1 = torch.zeros(1, 1, 28, 28)
        x2 = torch.ones(1, 1, 28, 28)
        with torch.no_grad():
            o1 = model(x1)
            o2 = model(x2)
        assert not torch.allclose(o1, o2), "Model produces identical output for different inputs"

    def test_weight_initialisation(self, model):
        """Kaiming init should not leave all weights at zero."""
        for name, param in model.named_parameters():
            if ("weight" in name and param.numel() > 1
                    and not any(norm in name.lower() for norm in ("bn", "batchnorm", ".1.weight"))):
                assert param.std().item() > 0, f"Layer {name} has zero-variance weights"


class TestSEBlock:

    def test_output_shape_unchanged(self):
        se  = SEBlock(channels=32)
        x   = torch.randn(2, 32, 7, 7)
        out = se(x)
        assert out.shape == x.shape

    def test_channel_scaling_in_range(self):
        """SE output should be gated version of input — values bounded."""
        se = SEBlock(channels=16)
        x  = torch.ones(1, 16, 4, 4)
        with torch.no_grad():
            out = se(x)
        assert out.min().item() >= 0, "SE output has negative values (sigmoid should prevent this)"


class TestMBConvBlock:

    def test_skip_connection_when_shapes_match(self):
        block = MBConvBlock(in_ch=32, out_ch=32, expand=1, stride=1)
        assert block.skip is True

    def test_no_skip_when_channels_differ(self):
        block = MBConvBlock(in_ch=32, out_ch=64, expand=4, stride=1)
        assert block.skip is False

    def test_output_shape_with_stride(self):
        block = MBConvBlock(in_ch=32, out_ch=64, expand=4, stride=2)
        x   = torch.randn(2, 32, 14, 14)
        out = block(x)
        assert out.shape == (2, 64, 7, 7)


# =============================================================================
# GET / SET PARAMETERS
# =============================================================================

class TestParameterSerialization:

    def test_roundtrip(self, model):
        """set_parameters(get_parameters(m)) should be a no-op."""
        params = get_parameters(model)
        assert isinstance(params, list)
        assert all(isinstance(p, np.ndarray) for p in params)

        model2 = MedXRayCNN()
        set_parameters(model2, params)

        for p1, p2 in zip(model.parameters(), model2.parameters()):
            assert torch.allclose(p1, p2), "Parameters not identical after roundtrip"

    def test_set_parameters_mutates_model(self, model):
        """After set_parameters with zeros, model output should change."""
        zeros = [np.zeros_like(p) for p in get_parameters(model)]
        model_copy = MedXRayCNN()
        set_parameters(model_copy, zeros)
        x = torch.randn(1, 1, 28, 28)
        with torch.no_grad():
            out = model_copy(x)
        # All-zero weights → output should be all zeros
        assert torch.allclose(out, torch.zeros_like(out), atol=1e-5)


# =============================================================================
# TRAINING LOOPS
# =============================================================================

class TestTrainingLoops:

    def test_train_reduces_loss(self, dummy_loader):
        """A single training epoch should produce a finite loss."""
        model = MedXRayCNN()
        opt   = torch.optim.SGD(model.parameters(), lr=0.01)
        result = train(model, dummy_loader, opt, epochs=1)

        assert "loss" in result
        assert "accuracy" in result
        assert np.isfinite(result["loss"]),     "Training loss is NaN or Inf"
        assert 0.0 <= result["accuracy"] <= 1.0, f"Accuracy out of range: {result['accuracy']}"

    def test_train_modifies_weights(self, dummy_loader):
        """Weights should change after one training step."""
        model  = MedXRayCNN()
        before = [p.clone().detach() for p in model.parameters()]
        opt    = torch.optim.SGD(model.parameters(), lr=0.1)
        train(model, dummy_loader, opt, epochs=1)
        after  = list(model.parameters())

        changed = any(not torch.allclose(b, a) for b, a in zip(before, after))
        assert changed, "No weights changed after training step"

    def test_fedprox_returns_prox_penalty(self, dummy_loader):
        model        = MedXRayCNN()
        global_params = get_parameters(model)
        opt          = torch.optim.SGD(model.parameters(), lr=0.01)

        # Perturb model weights so prox penalty is non-zero
        with torch.no_grad():
            for p in model.parameters():
                p.add_(torch.randn_like(p) * 0.1)

        result = train_fedprox(model, global_params, dummy_loader, opt, mu=0.1, epochs=1)

        assert "prox_penalty" in result
        assert result["prox_penalty"] >= 0, "Proximal penalty cannot be negative"

    def test_fedprox_mu_zero_equals_fedavg(self, dummy_loader):
        """FedProx with μ=0 should behave identically to standard training."""
        torch.manual_seed(0)
        model_a = MedXRayCNN(); torch.manual_seed(0); model_b = MedXRayCNN()
        params  = get_parameters(model_a)
        opt_a   = torch.optim.SGD(model_a.parameters(), lr=0.01)
        opt_b   = torch.optim.SGD(model_b.parameters(), lr=0.01)

        torch.manual_seed(123)
        res_a = train(model_a, dummy_loader, opt_a, epochs=1)
        torch.manual_seed(123)
        res_b = train_fedprox(model_b, params, dummy_loader, opt_b, mu=0.0, epochs=1)

        assert abs(res_a["loss"] - res_b["loss"]) < 0.01, \
            f"FedProx μ=0 diverges from FedAvg: {res_a['loss']:.4f} vs {res_b['loss']:.4f}"

    def test_fedprox_higher_mu_stays_closer_to_global(self, dummy_loader):
        """Higher μ should produce weights closer to the global model."""
        global_model  = MedXRayCNN()
        global_params = get_parameters(global_model)

        def _dist(model):
            d = 0.0
            for p, g in zip(model.parameters(), global_model.parameters()):
                d += (p - g).norm().item() ** 2
            return d ** 0.5

        torch.manual_seed(42)
        model_low = MedXRayCNN()
        set_parameters(model_low, [p + np.random.randn(*p.shape)*0.2 for p in global_params])
        opt_low = torch.optim.SGD(model_low.parameters(), lr=0.01)
        train_fedprox(model_low, global_params, dummy_loader, opt_low, mu=0.001, epochs=2)

        torch.manual_seed(42)
        model_high = MedXRayCNN()
        set_parameters(model_high, [p + np.random.randn(*p.shape)*0.2 for p in global_params])
        opt_high = torch.optim.SGD(model_high.parameters(), lr=0.01)
        train_fedprox(model_high, global_params, dummy_loader, opt_high, mu=1.0, epochs=2)

        assert _dist(model_high) <= _dist(model_low), \
            "Higher μ should keep weights closer to global model"


class TestEvalLoop:

    def test_test_returns_finite_metrics(self, model, dummy_loader):
        loss, acc = test(model, dummy_loader)
        assert np.isfinite(loss), f"Test loss is not finite: {loss}"
        assert 0.0 <= acc <= 1.0, f"Accuracy out of range: {acc}"

    def test_test_does_not_modify_weights(self, model, dummy_loader):
        before = [p.clone() for p in model.parameters()]
        test(model, dummy_loader)
        after  = list(model.parameters())
        for b, a in zip(before, after):
            assert torch.allclose(b, a), "test() modified model weights"


# =============================================================================
# GRAD-CAM
# =============================================================================

class TestGradCAM:

    def test_heatmap_shape_matches_input(self):
        model   = MedXRayCNN()
        gradcam = GradCAM(model)
        x       = torch.randn(1, 1, 28, 28)
        heatmap = gradcam(x, class_idx=6)
        assert heatmap.shape == (28, 28), f"Expected (28,28), got {heatmap.shape}"
        gradcam.remove_hooks()

    def test_heatmap_in_unit_range(self):
        model   = MedXRayCNN()
        gradcam = GradCAM(model)
        x       = torch.randn(1, 1, 28, 28)
        heatmap = gradcam(x, class_idx=0)
        assert heatmap.min() >= -1e-6,  f"Heatmap min below 0: {heatmap.min()}"
        assert heatmap.max() <= 1+1e-6, f"Heatmap max above 1: {heatmap.max()}"
        gradcam.remove_hooks()

    def test_heatmap_not_constant(self):
        """A valid GradCAM heatmap should have spatial variation."""
        model   = MedXRayCNN()
        gradcam = GradCAM(model)
        x       = torch.randn(1, 1, 28, 28)
        heatmap = gradcam(x, class_idx=6)
        assert heatmap.std() > 0, "Heatmap is constant — GradCAM not working"
        gradcam.remove_hooks()

    def test_different_classes_different_heatmaps(self):
        model   = MedXRayCNN()
        gradcam = GradCAM(model)
        x       = torch.randn(1, 1, 28, 28)
        h0 = gradcam(x, class_idx=0)
        h6 = gradcam(x, class_idx=6)
        assert not np.allclose(h0, h6), "Different classes produced identical heatmaps"
        gradcam.remove_hooks()

    def test_hooks_removed_cleanly(self):
        model   = MedXRayCNN()
        gradcam = GradCAM(model)
        gradcam.remove_hooks()
        assert len(gradcam._handles) == 0, "Hooks not removed"


# =============================================================================
# PRIVACY ACCOUNTING
# =============================================================================

class TestEpsilonAccounting:

    def test_more_noise_less_epsilon(self):
        """Higher σ → more privacy → lower ε."""
        eps_low  = compute_epsilon(noise_multiplier=0.5, num_steps=100)
        eps_high = compute_epsilon(noise_multiplier=2.0, num_steps=100)
        assert eps_high < eps_low, \
            f"Higher noise should give lower epsilon: {eps_high:.4f} vs {eps_low:.4f}"

    def test_more_steps_more_epsilon(self):
        """More gradient steps → more privacy budget consumed → higher ε."""
        eps_few  = compute_epsilon(noise_multiplier=1.2, num_steps=10)
        eps_many = compute_epsilon(noise_multiplier=1.2, num_steps=1000)
        assert eps_many > eps_few, \
            f"More steps should give higher epsilon: {eps_many:.4f} vs {eps_few:.4f}"

    def test_zero_steps_returns_inf(self):
        eps = compute_epsilon(noise_multiplier=1.2, num_steps=0)
        assert eps == float("inf")

    def test_zero_noise_returns_inf(self):
        eps = compute_epsilon(noise_multiplier=0.0, num_steps=100)
        assert eps == float("inf")

    def test_reasonable_epsilon_for_standard_params(self):
        """σ=1.2, 10 rounds × 3 epochs × 62 batches should give ε in a sane range."""
        num_steps = 10 * 3 * (2000 // 32)
        eps = compute_epsilon(noise_multiplier=1.2, num_steps=num_steps)
        assert 0.1 < eps < 20, f"Epsilon {eps:.2f} is outside expected range for standard FL params"

    def test_epsilon_is_finite_for_large_noise(self):
        eps = compute_epsilon(noise_multiplier=10.0, num_steps=1000)
        assert np.isfinite(eps), "Should get finite epsilon even for large noise"


# =============================================================================
# DATA CONSTANTS
# =============================================================================

class TestConstants:

    def test_chest_classes_count(self):
        assert len(CHEST_CLASSES) == 14

    def test_client_class_bias_coverage(self):
        assert set(CLIENT_CLASS_BIAS.keys()) == {0, 1, 2}
        for client_id, classes in CLIENT_CLASS_BIAS.items():
            assert len(classes) == 3, f"Client {client_id} should have 3 biased classes"
            assert all(0 <= c < 14 for c in classes), f"Class index out of range for client {client_id}"

    def test_no_overlapping_bias_classes(self):
        """Each hospital should specialise in different classes."""
        all_classes = [c for classes in CLIENT_CLASS_BIAS.values() for c in classes]
        assert len(all_classes) == len(set(all_classes)), \
            "Hospitals share biased classes — non-IID simulation is not distinct"
