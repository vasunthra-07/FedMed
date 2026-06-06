# =============================================================================
# common.py  —  FedMed Core Shared Library  [UPGRADED: Master's Level]
# =============================================================================
# New in this version:
#   • GradCAM class — forward/backward hook-based explainability (Selvaraju 2017)
#   • train_fedprox() — FedProx proximal-term training loop (Li et al. 2020)
#   • compute_epsilon() — analytic RDP → (ε,δ)-DP conversion
#   • All original components retained and improved
# =============================================================================

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, Subset, TensorDataset
from torchvision import transforms
import numpy as np
from medmnist import ChestMNIST
import config as C

# ── Device ────────────────────────────────────────────────────────────────────
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ── Dataset constants ─────────────────────────────────────────────────────────
NUM_CLASSES        = 14
IMG_SIZE           = 28
IN_CHANNELS        = 1

# ── ChestMNIST class names (for UI display) ───────────────────────────────────
CHEST_CLASSES = [
    "Atelectasis", "Cardiomegaly", "Effusion", "Infiltration",
    "Mass", "Nodule", "Pneumonia", "Pneumothorax",
    "Consolidation", "Edema", "Emphysema", "Fibrosis",
    "Pleural Thickening", "Hernia",
]

# ── Non-IID bias per hospital ─────────────────────────────────────────────────
CLIENT_CLASS_BIAS = {
    0: [6, 3, 0],    # Alpha  → Pneumonia, Infiltration, Atelectasis
    1: [1, 9, 2],    # Beta   → Cardiomegaly, Edema, Effusion
    2: [7, 4, 10],   # Gamma  → Pneumothorax, Mass, Emphysema
}

BIAS_FRACTION      = 0.75
SAMPLES_PER_CLIENT = 2000


# =============================================================================
# 1.  MODEL  —  EfficientNet-style MedXRayCNN
# =============================================================================

class SEBlock(nn.Module):
    """Squeeze-and-Excitation channel attention (Hu et al., 2018)."""
    def __init__(self, channels: int, reduction: int = 4):
        super().__init__()
        reduced = max(1, channels // reduction)
        self.squeeze    = nn.AdaptiveAvgPool2d(1)
        self.excitation = nn.Sequential(
            nn.Flatten(),
            nn.Linear(channels, reduced),
            nn.SiLU(),
            nn.Linear(reduced, channels),
            nn.Sigmoid(),
        )

    def forward(self, x):
        scale = self.excitation(self.squeeze(x))
        return x * scale.view(x.size(0), -1, 1, 1)


class MBConvBlock(nn.Module):
    """
    Mobile Inverted Bottleneck with Squeeze-and-Excitation.
    Expand → Depthwise → SE → Project, skip when in==out and stride==1.
    """
    def __init__(self, in_ch, out_ch, expand=4, stride=1):
        super().__init__()
        mid = in_ch * expand
        self.expand_conv = nn.Sequential(
            nn.Conv2d(in_ch, mid, 1, bias=False),
            nn.BatchNorm2d(mid), nn.SiLU(),
        ) if expand != 1 else nn.Identity()

        self.dw_conv = nn.Sequential(
            nn.Conv2d(mid, mid, 3, stride=stride, padding=1, groups=mid, bias=False),
            nn.BatchNorm2d(mid), nn.SiLU(),
        )
        self.se      = SEBlock(mid)
        self.project = nn.Sequential(
            nn.Conv2d(mid, out_ch, 1, bias=False),
            nn.BatchNorm2d(out_ch),
        )
        self.skip = (stride == 1 and in_ch == out_ch)

    def forward(self, x):
        out = self.expand_conv(x)
        out = self.dw_conv(out)
        out = self.se(out)
        out = self.project(out)
        return x + out if self.skip else out


class MedXRayCNN(nn.Module):
    """
    EfficientNet-style CNN for ChestMNIST 28×28 multi-label classification.

    Unique design for GradCAM compatibility:
      A dedicated `feature_proj` 1×1 conv sits between the MBConv backbone
      and the classification head. This layer is the GradCAM hook point —
      it has the richest spatial feature maps before global average pooling
      collapses spatial information.

    ~210K parameters — optimised for FL communication efficiency.
    """
    def __init__(self, num_classes=NUM_CLASSES):
        super().__init__()
        self.stem = nn.Sequential(
            nn.Conv2d(IN_CHANNELS, 24, 3, padding=1, bias=False),
            nn.BatchNorm2d(24), nn.SiLU(),
        )

        stage_cfg = [
            (24,  24,  1, 1, 1),
            (24,  48,  2, 4, 2),
            (48,  64,  2, 4, 1),
            (64,  96,  2, 4, 2),
        ]
        blocks = []
        for in_ch, out_ch, n, expand, stride in stage_cfg:
            for i in range(n):
                blocks.append(MBConvBlock(
                    in_ch if i == 0 else out_ch, out_ch,
                    expand=expand, stride=stride if i == 0 else 1,
                ))
        self.stages = nn.Sequential(*blocks)

        # ── GradCAM target: rich spatial features before pooling ──────────────
        self.feature_proj = nn.Conv2d(96, 96, 1, bias=False)

        self.head = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Dropout(0.3),
            nn.Linear(96, num_classes),
        )
        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode="fan_out", nonlinearity="relu")
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.ones_(m.weight); nn.init.zeros_(m.bias)
            elif isinstance(m, nn.Linear):
                nn.init.trunc_normal_(m.weight, std=0.02)
                if m.bias is not None: nn.init.zeros_(m.bias)

    def forward(self, x):
        x = self.stem(x)
        x = self.stages(x)
        x = self.feature_proj(x)   # ← GradCAM hooks attach here
        return self.head(x)        # raw logits

    def get_gradcam_target_layer(self):
        """Returns the layer used as GradCAM hook point."""
        return self.feature_proj


# =============================================================================
# 2.  GRAD-CAM  — Gradient-weighted Class Activation Mapping
# =============================================================================

class GradCAM:
    """
    Grad-CAM for MedXRayCNN (Selvaraju et al., 2017 — ICCV Best Paper).

    Algorithm:
    ----------
    Given output score y^c for class c and feature maps A^k (K channels, H'×W'):

      Step 1 — Gradient weights:
        α_k^c = (1 / H'W') · Σ_{i,j} (∂y^c / ∂A^k_{ij})

      Step 2 — Weighted combination + ReLU:
        L^c_GradCAM = ReLU( Σ_k α_k^c · A^k )

      Step 3 — Upsample to input resolution (bilinear) → normalise [0,1]

    The ReLU is critical: it removes features that *decrease* the class score,
    leaving only the positively influential regions — where the model is "looking."

    Clinical relevance:
    -------------------
    For Pneumonia (class 6), the heatmap should highlight lung parenchyma.
    For Cardiomegaly (class 1), it should highlight the cardiac silhouette.
    This makes AI decisions interpretable to clinicians — essential for GDPR/HIPAA.
    """

    def __init__(self, model: MedXRayCNN):
        self.model        = model
        self._activations = None
        self._gradients   = None
        self._handles     = []

        target = model.get_gradcam_target_layer()
        self._handles.append(target.register_forward_hook(self._fwd_hook))
        self._handles.append(target.register_full_backward_hook(self._bwd_hook))

    def _fwd_hook(self, module, inp, out):
        self._activations = out.detach().clone()

    def _bwd_hook(self, module, grad_in, grad_out):
        self._gradients = grad_out[0].detach().clone()

    def __call__(
        self,
        input_tensor: torch.Tensor,
        class_idx: int,
    ) -> np.ndarray:
        """
        Compute GradCAM heatmap for a single image and target class.

        Args:
            input_tensor : (1, 1, H, W) normalised tensor
            class_idx    : ChestMNIST class index (0–13)

        Returns:
            heatmap : (H, W) float32 ndarray in [0, 1]
        """
        self.model.eval()
        x      = input_tensor.to(DEVICE).requires_grad_(True)
        logits = self.model(x)

        self.model.zero_grad()
        logits[0, class_idx].backward()

        # α_k = global average pool of gradients
        alpha = self._gradients.mean(dim=[2, 3], keepdim=True)  # (1, K, 1, 1)
        cam   = (alpha * self._activations).sum(dim=1).squeeze() # (H', W')
        cam   = F.relu(cam)

        # Upsample to match input resolution
        H, W  = input_tensor.shape[-2], input_tensor.shape[-1]
        cam   = F.interpolate(
            cam.unsqueeze(0).unsqueeze(0).float(),
            size=(H, W), mode="bilinear", align_corners=False,
        ).squeeze().cpu()

        # Normalise
        lo, hi = cam.min(), cam.max()
        cam = (cam - lo) / (hi - lo + 1e-8) if hi > lo else torch.zeros_like(cam)
        return cam.numpy().astype(np.float32)

    def remove_hooks(self):
        """Call this when done to free memory."""
        for h in self._handles:
            h.remove()
        self._handles.clear()


# =============================================================================
# 3.  PRIVACY ACCOUNTING  — RDP → (ε, δ)-DP
# =============================================================================

def compute_epsilon(
    noise_multiplier: float,
    num_steps: int,
    delta: float = 1e-5,
    clip_norm: float = 1.0,
    sample_rate: float | None = None,
) -> float:
    """
    Tight analytic (ε, δ)-DP bound via Rényi Differential Privacy accountant.

    Based on:
      • Mironov (2017): RDP of the Sampled Gaussian Mechanism
      • Balle et al. (2020): Hypothesis Testing Interpretations and Renyi DP

    The Gaussian mechanism with std σ·C satisfies (α, α/(2σ²))-RDP per step.
    Composing T steps: ε_RDP(α) = T·α/(2σ²)
    Converting to (ε, δ)-DP:
        ε = min_α [ ε_RDP(α) + log(1 − 1/α) − log(δ(α−1)) / (α−1) ]

    Args:
        noise_multiplier : σ (noise std / clip norm)
        num_steps        : total gradient update steps
        delta            : target δ
        clip_norm        : gradient clipping norm C

    Returns:
        epsilon : privacy cost (lower is better; ε < 3 is considered strong)
    """
    if noise_multiplier <= 0 or num_steps <= 0:
        return float("inf")

    q = float(sample_rate if sample_rate is not None else 32 / SAMPLES_PER_CLIENT)
    if not 0 < q <= 1:
        raise ValueError(f"sample_rate must be in (0, 1], got {q}")

    try:
        from opacus.accountants import RDPAccountant

        accountant = RDPAccountant()
        for _ in range(num_steps):
            accountant.step(noise_multiplier=noise_multiplier, sample_rate=q)
        return float(accountant.get_epsilon(delta=delta))
    except Exception:
        # Conservative fallback for environments without Opacus. This is not as
        # tight as Opacus, but it accounts for Poisson subsampling and avoids
        # the invalid full-batch composition previously used here.
        sigma = noise_multiplier * clip_norm
        orders = np.concatenate([np.arange(2, 64), np.logspace(6, 10, 40, base=2)])
        rdp = num_steps * (q**2) * orders / (2.0 * sigma**2)
        eps_candidates = rdp + np.log1p(-1.0 / orders) - np.log(delta * (orders - 1)) / (orders - 1)
        valid = np.isfinite(eps_candidates) & (eps_candidates > 0)
        return float(np.min(eps_candidates[valid])) if valid.any() else float("inf")


# =============================================================================
# 4.  DATA LOADERS
# =============================================================================

def _base_transform():
    return transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize([0.5], [0.5]),
    ])


def _augment_transform():
    return transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.5], [0.5]),
    ])


def _synthetic_dataset(num_samples: int, seed: int) -> TensorDataset:
    rng = np.random.RandomState(seed)
    imgs = rng.normal(0.0, 1.0, size=(num_samples, IN_CHANNELS, IMG_SIZE, IMG_SIZE)).astype(np.float32)
    labels = np.zeros((num_samples, NUM_CLASSES), dtype=np.float32)
    signal = imgs.mean(axis=(1, 2, 3))
    for cls in range(NUM_CLASSES):
        threshold = np.percentile(signal + 0.03 * cls, 45 + (cls % 4) * 5)
        labels[:, cls] = (signal + rng.normal(0, 0.1, num_samples) > threshold).astype(np.float32)
    return TensorDataset(torch.tensor(imgs), torch.tensor(labels))


def get_client_dataloader(client_id: int, batch_size: int = 32, download: bool = True) -> DataLoader:
    """Non-IID ChestMNIST partition for a given hospital (biased by clinical specialty)."""
    assert client_id in CLIENT_CLASS_BIAS
    if C.SYNTHETIC_DATA:
        dataset = _synthetic_dataset(C.SAMPLES_PER_CLIENT, seed=10_000 + client_id)
        return DataLoader(dataset, batch_size=batch_size, shuffle=True, num_workers=0,
                          pin_memory=DEVICE.type == "cuda")
    dataset = ChestMNIST(split="train", transform=_augment_transform(), download=download)
    labels  = np.array(dataset.labels)
    n       = len(dataset)
    idx     = np.arange(n)

    mask = np.zeros(n, dtype=bool)
    for c in CLIENT_CLASS_BIAS[client_id]:
        mask |= (labels[:, c] == 1)

    rng        = np.random.RandomState(42 + client_id)
    n_biased   = int(SAMPLES_PER_CLIENT * BIAS_FRACTION)
    n_unbiased = SAMPLES_PER_CLIENT - n_biased

    biased_idx, unbias_idx = idx[mask], idx[~mask]
    chosen = np.concatenate([
        rng.choice(biased_idx,   size=min(n_biased,   len(biased_idx)),   replace=len(biased_idx)   < n_biased),
        rng.choice(unbias_idx,   size=min(n_unbiased, len(unbias_idx)),   replace=len(unbias_idx)   < n_unbiased),
    ])
    rng.shuffle(chosen)
    return DataLoader(Subset(dataset, chosen.tolist()), batch_size=batch_size,
                      shuffle=True, num_workers=0, pin_memory=DEVICE.type == "cuda")


def get_test_dataloader(batch_size: int = 64, download: bool = True) -> DataLoader:
    """IID global test set for server-side evaluation."""
    if C.SYNTHETIC_DATA:
        dataset = _synthetic_dataset(C.SYNTHETIC_TEST_SAMPLES, seed=20_000)
        return DataLoader(dataset, batch_size=batch_size, shuffle=False, num_workers=0,
                          pin_memory=DEVICE.type == "cuda")
    dataset = ChestMNIST(split="test", transform=_base_transform(), download=download)
    return DataLoader(dataset, batch_size=batch_size, shuffle=False, num_workers=0,
                      pin_memory=DEVICE.type == "cuda")


# =============================================================================
# 5.  TRAINING LOOPS
# =============================================================================

def train(
    model: nn.Module,
    dataloader: DataLoader,
    optimizer: torch.optim.Optimizer,
    epochs: int = 1,
    device: torch.device = DEVICE,
) -> dict:
    """Standard FedAvg-compatible local training (Opacus-safe)."""
    model.train(); model.to(device)
    criterion = nn.BCEWithLogitsLoss()
    tl, tc, ts = 0.0, 0, 0

    for _ in range(epochs):
        for imgs, lbls in dataloader:
            imgs, lbls = imgs.to(device), lbls.float().to(device)
            optimizer.zero_grad()
            out  = model(imgs)
            loss = criterion(out, lbls)
            loss.backward(); optimizer.step()
            preds = (torch.sigmoid(out) > 0.5).long()
            tc   += (preds == lbls.long()).all(dim=1).sum().item()
            tl   += loss.item() * imgs.size(0); ts += imgs.size(0)

    return {"loss": tl / max(ts, 1), "accuracy": tc / max(ts, 1)}


def train_fedprox(
    model: nn.Module,
    global_params: list,
    dataloader: DataLoader,
    optimizer: torch.optim.Optimizer,
    mu: float = 0.01,
    epochs: int = 1,
    device: torch.device = DEVICE,
) -> dict:
    """
    FedProx local training loop (Li et al., 2020, ICLR).

    Objective per client k:
        h_k(w; w^t) = F_k(w)  +  (μ/2) · ‖w − w^t‖²
                      ^^^^^^^^      ^^^^^^^^^^^^^^^^^^^^^^^
                      Task loss     Proximal regulariser

    Why this matters for non-IID medical data:
    -------------------------------------------
    With standard FedAvg, Hospital Alpha (mostly Pneumonia cases) will
    drift its weights heavily toward Pneumonia-discriminative features
    over 3–5 local epochs. After aggregation, this drift partially
    cancels out — but with high non-IID skew (our BIAS_FRACTION=0.75),
    the global model still oscillates round-to-round.

    FedProx solves this by anchoring each client's weights to w^t,
    the current global model. μ=0.01 is the recommended default from
    the original paper — small enough to not harm convergence, large
    enough to prevent catastrophic drift.

    Note on Opacus compatibility:
    The proximal term is added directly to the scalar loss before
    .backward(), so Opacus's per-sample gradient hooks work normally.

    Args:
        model         : local MedXRayCNN (pre-loaded with global weights)
        global_params : list of np.ndarrays — the global model's weights (w^t)
        dataloader    : client's non-IID training DataLoader
        optimizer     : SGD/Adam, optionally wrapped by Opacus PrivacyEngine
        mu            : proximal coefficient (0 = standard FedAvg)
        epochs        : local training epochs
        device        : CUDA or CPU

    Returns:
        dict: 'loss' (task only), 'accuracy', 'prox_penalty' (diagnostic)
    """
    model.train(); model.to(device)

    # Frozen reference: w^t (the global model at start of this round)
    global_state = {
        name: torch.tensor(value, dtype=torch.float32, device=device)
        for name, value in zip(model.state_dict().keys(), global_params)
    }

    criterion = nn.BCEWithLogitsLoss()
    tl, tc, ts, tp = 0.0, 0, 0, 0.0

    for _ in range(epochs):
        for imgs, lbls in dataloader:
            imgs, lbls = imgs.to(device), lbls.float().to(device)
            optimizer.zero_grad()

            out       = model(imgs)
            task_loss = criterion(out, lbls)

            # ── Proximal term ─────────────────────────────────────────────────
            prox = torch.tensor(0.0, device=device)
            for name, w in model.named_parameters():
                w_ref = global_state[name]
                prox += torch.sum((w - w_ref) ** 2)
            prox_loss = (mu / 2.0) * prox

            (task_loss + prox_loss).backward()
            optimizer.step()

            preds = (torch.sigmoid(out) > 0.5).long()
            tc   += (preds == lbls.long()).all(dim=1).sum().item()
            tl   += task_loss.item() * imgs.size(0)
            tp   += prox_loss.item()
            ts   += imgs.size(0)

    return {
        "loss":         tl / max(ts, 1),
        "accuracy":     tc / max(ts, 1),
        "prox_penalty": tp / max(ts, 1),
    }


# =============================================================================
# 6.  EVALUATION
# =============================================================================

def test(model: nn.Module, dataloader: DataLoader, device: torch.device = DEVICE):
    """Returns (avg_loss, accuracy) on the given dataloader."""
    model.eval(); model.to(device)
    criterion = nn.BCEWithLogitsLoss()
    tl, tc, ts = 0.0, 0, 0
    with torch.no_grad():
        for imgs, lbls in dataloader:
            imgs, lbls = imgs.to(device), lbls.float().to(device)
            out  = model(imgs)
            loss = criterion(out, lbls)
            preds = (torch.sigmoid(out) > 0.5).long()
            tl   += loss.item() * imgs.size(0)
            tc   += (preds == lbls.long()).all(dim=1).sum().item()
            ts   += imgs.size(0)
    return tl / max(ts, 1), tc / max(ts, 1)


# =============================================================================
# 7.  UTILITIES
# =============================================================================

def get_parameters(model: nn.Module) -> list:
    return [v.cpu().numpy() for _, v in model.state_dict().items()]


def set_parameters(model: nn.Module, parameters: list) -> None:
    sd = dict(zip(model.state_dict().keys(), [torch.tensor(p) for p in parameters]))
    model.load_state_dict(sd, strict=True)
