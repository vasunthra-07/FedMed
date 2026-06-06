# =============================================================================
# app.py  —  FedMed Mission Control Dashboard  [PRODUCTION]
# =============================================================================
# Production upgrades:
#   • JWT-based login gate (username + bcrypt password)
#   • All uploaded files validated (size, extension, magic bytes)
#   • All config from config.py (no magic strings)
#   • Structured error handling — user-facing messages, no raw tracebacks
#   • Telemetry auto-rotates (handled server-side, displayed safely here)
#   • st.cache_data TTLs aligned with DASHBOARD_REFRESH_S
#   • num_workers respected for DataLoader (set in config.py)
# =============================================================================

import json
import math
import time
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.cm as cm
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
# Ensure page config is the very first Streamlit call in the script
st.set_page_config(
    page_title="FedMed · Mission Control",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded",
)
import torch
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms

import config as C
from checkpoint import get_best_checkpoint, load_checkpoint
from common import CHEST_CLASSES, DEVICE, GradCAM, MedXRayCNN, set_parameters
from logger import get_logger
from security import create_jwt, get_jwt_claims, has_permission, verify_jwt, verify_password, validate_image_upload

log = get_logger("dashboard")

# ── Lottie (optional) ─────────────────────────────────────────────────────────
try:
    from streamlit_lottie import st_lottie
    import requests

    @st.cache_data(ttl=3600)
    def _load_lottie(url):
        try:
            r = requests.get(url, timeout=5)
            return r.json() if r.status_code == 200 else None
        except Exception:
            return None

    LOTTIE_HEART   = _load_lottie("https://assets9.lottiefiles.com/packages/lf20_pk5qpyur.json")
    LOTTIE_SYNC    = _load_lottie("https://assets5.lottiefiles.com/packages/lf20_khrr7khn.json")
    LOTTIE_SUCCESS = _load_lottie("https://assets5.lottiefiles.com/packages/lf20_ya4ycrti.json")
    LOTTIE_AVAILABLE = True
except ImportError:
    LOTTIE_AVAILABLE = False
    LOTTIE_HEART = LOTTIE_SYNC = LOTTIE_SUCCESS = None


# =============================================================================
# PAGE CONFIG (moved above imports)
# =============================================================================

# Colour tokens
CYAN   = "#00f2ff"
GREEN  = "#39ff8a"
AMBER  = "#ffb800"
RED    = "#ff3060"
VIOLET = "#b86fff"
BG     = "#080c10"
CARD   = "#0f1923"
BORDER = "rgba(0,242,255,0.18)"

st.markdown(f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Orbitron:wght@500;700;900&display=swap');

#MainMenu,header,footer,[data-testid="stToolbar"],[data-testid="stDecoration"],[data-testid="stStatusWidget"]{{display:none!important}}

html,body,[data-testid="stAppViewContainer"],[data-testid="stMain"],.main .block-container{{
  background:{BG}!important;color:#b0cfe8!important;
  font-family:'JetBrains Mono',monospace!important;padding-top:0!important;
}}
[data-testid="stSidebar"]{{background:#0d1117!important;border-right:1px solid {BORDER};}}

[data-testid="stAppViewContainer"]::before{{
  content:'';position:fixed;inset:0;pointer-events:none;z-index:9998;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,242,255,0.016) 2px,rgba(0,242,255,0.016) 4px);
}}

.logo{{font-family:'Orbitron',sans-serif;font-size:22px;font-weight:900;color:{CYAN};
  text-shadow:0 0 24px {CYAN};letter-spacing:.12em;}}
.logo b{{color:{GREEN};text-shadow:0 0 24px {GREEN};}}
.live-chip{{background:rgba(57,255,138,.1);border:1px solid {GREEN};border-radius:20px;
  padding:3px 12px;font-size:10px;color:{GREEN};letter-spacing:.14em;}}

.glass-card{{background:linear-gradient(135deg,rgba(15,25,35,.92),rgba(10,16,22,.85));
  border:1px solid {BORDER};border-radius:10px;padding:14px 16px;
  backdrop-filter:blur(12px);box-shadow:0 0 0 1px rgba(0,242,255,.06),
  inset 0 1px 0 rgba(255,255,255,.04),0 4px 24px rgba(0,0,0,.4);position:relative;overflow:hidden;}}
.glass-card::before{{content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,{CYAN},transparent);opacity:.55;}}

.card-lbl{{font-size:9px;letter-spacing:.18em;color:rgba(160,200,230,.5);text-transform:uppercase;margin-bottom:6px;}}
.card-val{{font-family:'Orbitron',sans-serif;font-size:28px;font-weight:700;line-height:1;}}
.card-sub{{font-size:9px;color:rgba(160,200,230,.38);margin-top:5px;}}
.c-cyan{{color:{CYAN};text-shadow:0 0 16px rgba(0,242,255,.6);}}
.c-green{{color:{GREEN};text-shadow:0 0 16px rgba(57,255,138,.6);}}
.c-amber{{color:{AMBER};text-shadow:0 0 16px rgba(255,184,0,.5);}}
.c-violet{{color:{VIOLET};text-shadow:0 0 16px rgba(184,111,255,.5);}}

.sec-title{{font-size:9px;letter-spacing:.22em;color:{CYAN};text-transform:uppercase;
  font-weight:600;border-bottom:1px solid rgba(0,242,255,.12);padding-bottom:6px;margin-bottom:10px;}}

.panel{{background:rgba(13,20,30,.75);border:1px solid {BORDER};border-radius:8px;padding:12px 14px;backdrop-filter:blur(8px);}}

.terminal{{background:#020509;border:1px solid rgba(0,242,255,.2);border-radius:6px;
  padding:10px 12px;font-family:'JetBrains Mono',monospace;font-size:10px;
  max-height:260px;overflow-y:auto;line-height:1.65;}}
.term-ts{{color:rgba(0,242,255,.45);}} .term-evt{{color:{GREEN};font-weight:600;}}
.term-src{{color:{AMBER};}} .term-warn{{color:{RED};}} .term-data{{color:rgba(160,200,230,.6);}} .term-done{{color:{VIOLET};}}
.terminal::-webkit-scrollbar{{width:4px;}}
.terminal::-webkit-scrollbar-thumb{{background:rgba(0,242,255,.2);border-radius:2px;}}

.jitter-warn{{background:rgba(255,48,96,.08);border:1px solid {RED};border-radius:6px;
  padding:8px 14px;font-size:10px;color:#ff8099;margin-bottom:10px;}}

.success-banner{{background:linear-gradient(135deg,rgba(57,255,138,.12),rgba(0,242,255,.08));
  border:1px solid {GREEN};border-radius:8px;padding:14px 20px;text-align:center;margin-bottom:14px;}}

.stButton>button{{background:rgba(0,242,255,.06)!important;border:1px solid rgba(0,242,255,.35)!important;
  color:{CYAN}!important;font-family:'JetBrains Mono',monospace!important;
  font-size:10px!important;letter-spacing:.06em!important;border-radius:5px!important;}}
.stButton>button:hover{{background:rgba(0,242,255,.14)!important;}}

.login-card{{background:rgba(13,20,30,.95);border:1px solid {BORDER};border-radius:12px;
  padding:32px 40px;max-width:380px;margin:80px auto 0;backdrop-filter:blur(16px);}}

.dp-table{{width:100%;font-size:10px;border-collapse:collapse;}}
.dp-table td{{padding:4px 6px;}}
.dp-table td:first-child{{color:rgba(160,200,230,.5);}}
.dp-table td:last-child{{color:{CYAN};font-weight:600;text-align:right;}}

.pred-bar-wrap{{margin-bottom:7px;}}
.pred-label-row{{display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px;}}
.pred-bar-bg{{background:rgba(0,242,255,.07);border-radius:2px;height:4px;}}
.pred-bar-fill{{height:4px;border-radius:2px;}}
</style>
""", unsafe_allow_html=True)


# =============================================================================
# SESSION STATE
# =============================================================================

def _init():
    defs = {
        "jwt":               None,
        "username":          None,
        "role":              None,
        "hospitals_online":  [True, True, True],
        "hospital_training": [False, False, False],
        "auto_refresh":      False,
        "refresh_interval":  C.DASHBOARD_REFRESH_S,
        "noise_multiplier":  C.DP_NOISE_MULTIPLIER,
        "mu":                C.FEDPROX_MU,
        "jitter_enabled":    False,
        "jitter_target":     2,
    }
    for k, v in defs.items():
        if k not in st.session_state:
            st.session_state[k] = v

_init()


# =============================================================================
# AUTH GATE
# =============================================================================

def login_page():
    st.markdown(
        f'<div class="login-card">'
        f'<div class="logo" style="margin-bottom:8px;">FED<b>MED</b></div>'
        f'<div style="font-size:10px;color:rgba(160,200,230,.45);letter-spacing:.1em;margin-bottom:24px;">'
        f'MISSION CONTROL — SECURE LOGIN</div>',
        unsafe_allow_html=True,
    )

    username = st.text_input("Username", placeholder="admin", key="login_user")
    password = st.text_input("Password", type="password", placeholder="••••••••", key="login_pass")

    if st.button("Login →", use_container_width=True):
        if not username or not password:
            st.error("Please enter both username and password.")
            return

        if username == C.DASHBOARD_USERNAME and verify_password(password, C.DASHBOARD_PASSWORD_HASH):
            token = create_jwt(username, role="admin")
            st.session_state.jwt      = token
            st.session_state.username = username
            st.session_state.role     = "admin"
            log.info(f"Dashboard login: user='{username}'")
            st.rerun()
        else:
            log.warning(f"Failed login attempt for user='{username}'")
            time.sleep(1)   # rate-limit brute force
            st.error("Invalid credentials.")

    st.markdown('</div>', unsafe_allow_html=True)


def check_auth() -> bool:
    """Returns True if user has a valid JWT session."""
    token = st.session_state.get("jwt")
    if not token:
        return False
    user = verify_jwt(token)
    claims = get_jwt_claims(token) if user else None
    if not user or not claims:
        st.session_state.jwt      = None
        st.session_state.username = None
        st.session_state.role     = None
        return False
    st.session_state.username = user
    st.session_state.role = claims.get("role", "viewer")
    return True


# =============================================================================
# DATA LOADING
# =============================================================================

@st.cache_data(ttl=C.DASHBOARD_REFRESH_S)
def load_metrics() -> pd.DataFrame:
    if not C.METRICS_CSV.exists():
        return pd.DataFrame(columns=["round","timestamp","global_loss",
                                      "global_accuracy","num_clients","epsilon_spent","mu"])
    try:
        df = pd.read_csv(C.METRICS_CSV)
        for col in ["global_loss","global_accuracy","epsilon_spent","mu"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
        return df.dropna(subset=["global_loss"])
    except Exception as e:
        log.warning(f"Failed to read metrics CSV: {e}")
        return pd.DataFrame()


@st.cache_data(ttl=C.DASHBOARD_REFRESH_S)
def load_status() -> dict:
    if not C.STATUS_JSON.exists():
        return {}
    try:
        return json.loads(C.STATUS_JSON.read_text())
    except Exception as e:
        log.warning(f"Failed to read status.json: {e}")
        return {}


def load_telemetry(n: int = 60) -> list:
    if not C.TELEMETRY_JSONL.exists():
        return []
    try:
        lines = C.TELEMETRY_JSONL.read_text().strip().splitlines()
        return [json.loads(l) for l in lines[-n:] if l.strip()]
    except Exception as e:
        log.warning(f"Failed to read telemetry: {e}")
        return []


@st.cache_data(ttl=C.DASHBOARD_REFRESH_S)
def load_evidence() -> dict:
    evidence = {
        "experiment_summary": None,
        "test_status": None,
        "checkpoint": None,
    }
    summary_path = C.RESULTS_DIR / "summary.json"
    test_status_path = C.RESULTS_DIR / "test_status.json"
    try:
        if summary_path.exists():
            evidence["experiment_summary"] = json.loads(summary_path.read_text())
    except Exception as e:
        log.warning(f"Failed to read experiment summary: {e}")
    try:
        if test_status_path.exists():
            evidence["test_status"] = json.loads(test_status_path.read_text())
    except Exception as e:
        log.warning(f"Failed to read test status: {e}")
    try:
        evidence["checkpoint"] = get_best_checkpoint()
    except Exception as e:
        log.warning(f"Failed to read checkpoint evidence: {e}")
    return evidence


def write_mu_config(mu: float):
    try:
        tmp = C.MU_CONFIG.with_suffix(".tmp")
        tmp.write_text(json.dumps({"mu": mu}))
        tmp.rename(C.MU_CONFIG)
    except Exception as e:
        log.warning(f"Failed to write mu_config.json: {e}")


# =============================================================================
# PLOTLY HELPERS
# =============================================================================

_PL = dict(
    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="JetBrains Mono, monospace", color="#8ab4cc", size=10),
    margin=dict(l=36, r=12, t=28, b=28),
    xaxis=dict(gridcolor="rgba(0,242,255,0.07)"),
    yaxis=dict(gridcolor="rgba(0,242,255,0.07)"),
)


def _hex_rgba(h, a):
    h = h.lstrip("#")
    return f"rgba({int(h[0:2],16)},{int(h[2:4],16)},{int(h[4:6],16)},{a})"


def line_chart(x, y, color, title, y_range=None):
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=x, y=y, mode="lines+markers",
        line=dict(color=color, width=2.5, shape="spline"),
        marker=dict(size=7, color=color, line=dict(width=1.5, color=BG)),
        fill="tozeroy", fillcolor=_hex_rgba(color, 0.07),
    ))
    layout = {**_PL, "title": dict(text=title, font=dict(size=11, color=color))}
    if y_range:
        layout["yaxis"] = {**layout.get("yaxis", {}), "range": y_range}
    fig.update_layout(**layout)
    return fig


def privacy_gauge(epsilon: float, eps_max: float = 12.0):
    frac  = min(1.0, epsilon / eps_max)
    color = GREEN if frac < 0.40 else AMBER if frac < 0.75 else RED
    label = "PRIVATE" if frac < 0.40 else "MODERATE" if frac < 0.75 else "DEGRADED"
    fig   = go.Figure(go.Indicator(
        mode="gauge+number", value=round(epsilon, 2),
        title=dict(text="Privacy Budget  ε", font=dict(size=11, color="#8ab4cc")),
        number=dict(font=dict(size=26, color=color, family="Orbitron"), valueformat=".2f"),
        gauge=dict(
            axis=dict(range=[0, eps_max], tickfont=dict(size=8, family="JetBrains Mono")),
            bar=dict(color=color, thickness=0.2),
            bgcolor="rgba(0,0,0,0)", bordercolor=BORDER,
            steps=[
                dict(range=[0, eps_max*0.40], color=_hex_rgba(GREEN, 0.07)),
                dict(range=[eps_max*0.40, eps_max*0.75], color=_hex_rgba(AMBER, 0.07)),
                dict(range=[eps_max*0.75, eps_max], color=_hex_rgba(RED, 0.07)),
            ],
            threshold=dict(line=dict(color=color, width=3), thickness=0.78, value=epsilon),
        ),
    ))
    fig.add_annotation(text=label, x=0.5, y=0.2, showarrow=False,
                       font=dict(size=10, color=color, family="JetBrains Mono"))
    fig.update_layout(**{**_PL, "height": 210, "margin": dict(l=18, r=18, t=36, b=8)})
    return fig


def build_network(hospitals_online, hospitals_training, round_active=False):
    names   = ["Alpha", "Beta", "Gamma"]
    specs   = ["Pneumonia/Infiltration", "Cardiomegaly/Edema", "Pneumothorax/Mass"]
    angles  = [90, 210, 330]
    radius  = 1.65
    cx, cy  = 0.0, 0.0
    hx = [radius * math.cos(math.radians(a)) for a in angles]
    hy = [radius * math.sin(math.radians(a)) for a in angles]

    fig = go.Figure()
    for i in range(3):
        ec = RED if not hospitals_online[i] else AMBER if hospitals_training[i] else CYAN
        fig.add_trace(go.Scatter(
            x=[cx, hx[i]], y=[cy, hy[i]], mode="lines",
            line=dict(color=ec, width=2 if hospitals_online[i] else 1,
                      dash="solid" if hospitals_online[i] else "dot"),
            opacity=0.55 if hospitals_online[i] else 0.25,
            hoverinfo="skip", showlegend=False,
        ))
        if round_active and hospitals_online[i] and hospitals_training[i]:
            for frac in [0.3, 0.65]:
                fig.add_trace(go.Scatter(
                    x=[cx + frac*(hx[i]-cx)], y=[cy + frac*(hy[i]-cy)],
                    mode="markers",
                    marker=dict(size=8, color=AMBER, opacity=0.85),
                    hoverinfo="skip", showlegend=False,
                ))

        col = RED if not hospitals_online[i] else AMBER if hospitals_training[i] else CYAN
        status = "OFFLINE ⚠" if not hospitals_online[i] else "TRAINING ⚡" if hospitals_training[i] else "ONLINE ✓"
        fig.add_trace(go.Scatter(
            x=[hx[i]], y=[hy[i]], mode="markers+text",
            marker=dict(size=44, color=_hex_rgba(col, 0.14), symbol="circle" if hospitals_online[i] else "x",
                        line=dict(width=2.5, color=col)),
            text=[f"H·{names[i][0]}"],
            textfont=dict(size=9, color=col, family="JetBrains Mono"),
            textposition="middle center",
            hovertemplate=f"<b>🏥 Hospital {names[i]}</b><br>{specs[i]}<br>Status: {status}<extra></extra>",
            showlegend=False,
        ))

    active = sum(hospitals_online)
    fig.add_trace(go.Scatter(
        x=[cx], y=[cy], mode="markers+text",
        marker=dict(size=60, color=_hex_rgba(CYAN, 0.10), symbol="circle",
                    line=dict(width=2.5, color=CYAN)),
        text=["SRV"], textfont=dict(size=9, color=CYAN, family="JetBrains Mono"),
        textposition="middle center",
        hovertemplate=f"<b>FedMed Aggregator</b><br>Clients: {active}/3<br>FedProx+DP<extra></extra>",
        showlegend=False,
    ))
    fig.update_layout(**{
        **_PL, "height": 300,
        "xaxis": dict(visible=False, range=[-2.5, 2.5]),
        "yaxis": dict(visible=False, range=[-2.5, 2.5], scaleanchor="x"),
        "margin": dict(l=8, r=8, t=8, b=8),
    })
    return fig


# =============================================================================
# TERMINAL RENDERER
# =============================================================================

def render_terminal(events: list, jitter_on: bool, jitter_target: int) -> str:
    if not events:
        return ('<div class="terminal"><span class="term-ts">──</span> '
                '<span class="term-data">Waiting for telemetry… start server.py + client.py</span></div>')
    rows = []
    for ev in events:
        ts      = ev.get("ts", "--")
        event   = ev.get("event", "UNKNOWN")
        source  = ev.get("source", "?")
        payload = ev.get("payload", {})

        if event in ("SERVER_INIT", "ROUND_START"):      ecls = "term-evt"
        elif event == "CLIENT_FIT_RESULT":               ecls = "term-src"
        elif event in ("GLOBAL_EVAL", "TRAINING_COMPLETE"): ecls = "term-done"
        elif event == "CLIENT_FAILURE":                  ecls = "term-warn"
        else:                                            ecls = "term-data"

        pstr   = "  ".join(f"{k}={v}" for k, v in list(payload.items())[:4])
        jtag   = ""
        if jitter_on and event == "CLIENT_FIT_RESULT":
            try:
                if int(str(payload.get("client_id", -1))) == jitter_target:
                    jtag = f' <span class="term-warn">⚠ HIGH LATENCY → Hospital {C.HOSPITAL_NAMES[jitter_target]}</span>'
            except Exception:
                pass

        rows.append(
            f'<div><span class="term-ts">[{ts}]</span> '
            f'<span class="{ecls}">{event}</span> '
            f'<span class="term-data">src={source}  {pstr}</span>{jtag}</div>'
        )
    return f'<div class="terminal">{"".join(rows)}</div>'


# =============================================================================
# GRAD-CAM
# =============================================================================

@st.cache_resource
def get_gradcam_model():
    model   = MedXRayCNN().to(DEVICE)
    round_num, meta = load_checkpoint(model, DEVICE)
    if round_num <= 0:
        log.warning("GradCAM unavailable: no compatible trained checkpoint found")
        return None, None, {}
    model.eval()
    gradcam = GradCAM(model)
    return model, gradcam, meta


def _preprocess(pil_img: Image.Image) -> torch.Tensor:
    img = pil_img.convert("L").resize((28, 28))
    tfm = transforms.Compose([transforms.ToTensor(), transforms.Normalize([0.5], [0.5])])
    return tfm(img).unsqueeze(0)


def _overlay(pil_img: Image.Image, heatmap: np.ndarray, alpha: float = 0.5) -> np.ndarray:
    W, H   = pil_img.size
    hm_up  = np.array(Image.fromarray((heatmap*255).astype(np.uint8)).resize((W,H), Image.BILINEAR)) / 255.0
    jet    = cm.get_cmap("jet")(hm_up)[:, :, :3]
    jet_u8 = (jet * 255).astype(np.uint8)
    orig   = np.array(pil_img.convert("RGB"))
    return (alpha * jet_u8 + (1-alpha) * orig).astype(np.uint8)


# =============================================================================
# SIDEBAR
# =============================================================================

def sidebar():
    with st.sidebar:
        role = st.session_state.get("role", "viewer")
        can_write_settings = has_permission(role, "settings:write")
        st.markdown(
            f'<div class="logo" style="padding:10px 0 4px;">FED<b>MED</b></div>'
            f'<div style="font-size:9px;color:rgba(160,200,230,.35);letter-spacing:.14em;margin-bottom:4px;">'
            f'MISSION CONTROL v2.1 — PRODUCTION</div>'
            f'<div style="font-size:9px;color:rgba(160,200,230,.4);margin-bottom:14px;">'
            f'👤 {st.session_state.get("username","")}</div>',
            unsafe_allow_html=True,
        )

        if LOTTIE_AVAILABLE and LOTTIE_HEART:
            try: st_lottie(LOTTIE_HEART, height=60, key="hdr_lottie", speed=0.8)
            except Exception: pass

        if st.button("🚪  Logout", use_container_width=True):
            st.session_state.jwt = None
            st.session_state.username = None
            st.session_state.role = None
            st.rerun()

        st.divider()

        st.markdown('<div class="sec-title">How to Run</div>', unsafe_allow_html=True)
        st.code("python server.py\npython client.py --id=0\npython client.py --id=1\npython client.py --id=2", language="bash")

        st.markdown('<div class="sec-title">Dashboard</div>', unsafe_allow_html=True)
        st.session_state.auto_refresh    = st.toggle("Auto-refresh", st.session_state.auto_refresh)
        if st.session_state.auto_refresh:
            st.session_state.refresh_interval = st.slider("Interval (s)", 2, 30, st.session_state.refresh_interval)
        if st.button("⟳  Refresh Now", use_container_width=True):
            st.cache_data.clear(); st.rerun()

        st.divider()

        st.markdown('<div class="sec-title">FL Hyperparameters</div>', unsafe_allow_html=True)
        mu_new = st.slider("FedProx μ", 0.0, 0.5, st.session_state.mu, 0.001, disabled=not can_write_settings)
        if mu_new != st.session_state.mu:
            st.session_state.mu = mu_new
            write_mu_config(mu_new)

        st.session_state.noise_multiplier = st.slider(
            "DP Noise σ", 0.3, 4.0, st.session_state.noise_multiplier, 0.1,
            disabled=not can_write_settings,
        )

        st.divider()

        st.markdown('<div class="sec-title">Simulate Offline</div>', unsafe_allow_html=True)
        for i, name in C.HOSPITAL_NAMES.items():
            c1, c2 = st.columns([3,1])
            c1.markdown(f'<span style="font-size:10px;color:#8ab4cc;">🏥 {name}</span>', unsafe_allow_html=True)
            st.session_state.hospitals_online[i] = c2.toggle(
                " ", value=st.session_state.hospitals_online[i], key=f"tog_{i}",
                disabled=not can_write_settings,
            )

        offline = [i for i,on in enumerate(st.session_state.hospitals_online) if not on]
        for i in offline:
            st.markdown(
                f'<div style="background:rgba(255,48,96,.08);border:1px solid {RED};'
                f'border-radius:5px;padding:7px 10px;font-size:9px;color:#ff8099;margin-top:4px;">'
                f'⚠ Hospital {C.HOSPITAL_NAMES[i]} OFFLINE</div>',
                unsafe_allow_html=True,
            )

        st.divider()
        st.markdown('<div class="sec-title">Stress Tester</div>', unsafe_allow_html=True)
        jitter = st.toggle(
            "Simulate Network Jitter", st.session_state.jitter_enabled,
            disabled=not can_write_settings,
        )
        if jitter != st.session_state.jitter_enabled:
            st.session_state.jitter_enabled = jitter
            if jitter:
                st.toast(f"⚠ HIGH LATENCY on Hospital {C.HOSPITAL_NAMES[st.session_state.jitter_target]}!", icon="🔴")
        if st.session_state.jitter_enabled:
            st.session_state.jitter_target = st.selectbox("Affected Hospital", [0,1,2],
                format_func=lambda i: C.HOSPITAL_NAMES[i], index=st.session_state.jitter_target)


# =============================================================================
# MAIN DASHBOARD
# =============================================================================

def dashboard():
    df     = load_metrics()
    status = load_status()
    events = load_telemetry(60)
    role   = st.session_state.get("role", "viewer")

    has_data   = len(df) > 0
    last_round = int(df["round"].max())                  if has_data else 0
    last_acc   = float(df["global_accuracy"].iloc[-1])   if has_data else None
    last_loss  = float(df["global_loss"].iloc[-1])       if has_data else None
    last_eps   = float(df["epsilon_spent"].iloc[-1])     if has_data else 0.0
    last_mu    = float(df["mu"].iloc[-1])                if has_data and "mu" in df.columns else st.session_state.mu
    active     = sum(st.session_state.hospitals_online)
    phase      = status.get("phase", "IDLE")
    is_training = phase in ("TRAINING", "EVALUATING")

    if st.session_state.jitter_enabled:
        st.markdown(
            f'<div class="jitter-warn">⚠ NETWORK JITTER ACTIVE — '
            f'High latency on Hospital {C.HOSPITAL_NAMES[st.session_state.jitter_target]} '
            f'({np.random.randint(280,850)} ms simulated)</div>',
            unsafe_allow_html=True,
        )
        time.sleep(0.35)

    if last_acc is not None and last_acc >= C.TARGET_ACCURACY:
        st.markdown(
            f'<div class="success-banner"><span style="font-family:Orbitron,sans-serif;'
            f'font-size:15px;color:{GREEN};text-shadow:0 0 20px {GREEN};">'
            f'✓ TARGET ACCURACY REACHED — {last_acc*100:.2f}%</span><br>'
            f'<span style="font-size:10px;color:rgba(57,255,138,.7);">'
            f'after {last_round} rounds</span></div>',
            unsafe_allow_html=True,
        )

    st.markdown(
        f'<div style="display:flex;align-items:center;gap:16px;padding:10px 0 14px;'
        f'border-bottom:1px solid {BORDER};margin-bottom:14px;">'
        f'<div class="logo">FED<b>MED</b> · MISSION CONTROL</div>'
        f'<div class="live-chip">● {phase}</div>'
        f'<div style="margin-left:auto;font-size:9px;color:rgba(160,200,230,.4);">'
        f'ROUND {last_round:02d} / {C.NUM_ROUNDS}  ·  {time.strftime("%H:%M:%S")}</div></div>',
        unsafe_allow_html=True,
    )

    # ── KPI Row ────────────────────────────────────────────────────────────────
    cols = st.columns(5)
    kpis = [
        ("Active Nodes",   f"{active}<span style='font-size:14px;opacity:.4'>/3</span>", "c-cyan",   "hospitals online"),
        ("Global Accuracy", f"{last_acc*100:.2f}%" if last_acc else "—",                  "c-green",  "federated model"),
        ("Global Loss",    f"{last_loss:.4f}"     if last_loss else "—",                  "c-amber",  "BCE cross-entropy"),
        ("Privacy  ε",     f"{last_eps:.2f}",                                             "c-violet", "δ = 1e-5"),
        ("FedProx  μ",     f"{last_mu:.3f}",                                              "c-cyan",   "proximal coeff"),
    ]
    for col, (lbl, val, cls, sub) in zip(cols, kpis):
        with col:
            st.markdown(
                f'<div class="glass-card"><div class="card-lbl">{lbl}</div>'
                f'<div class="card-val {cls}">{val}</div>'
                f'<div class="card-sub">{sub}</div></div>',
                unsafe_allow_html=True,
            )

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Network + Privacy ──────────────────────────────────────────────────────
    net_col, priv_col = st.columns([3,1])
    with net_col:
        st.markdown('<div class="sec-title">Federated Network Topology</div>', unsafe_allow_html=True)
        h_training = [st.session_state.hospitals_online[i] and is_training for i in range(3)]
        st.plotly_chart(
            build_network(st.session_state.hospitals_online, h_training, is_training),
            use_container_width=True, config={"displayModeBar": False},
        )
        if is_training and LOTTIE_AVAILABLE and LOTTIE_SYNC:
            sc = st.columns([2,1,2])
            with sc[1]:
                try: st_lottie(LOTTIE_SYNC, height=50, key="sync_lottie", speed=1.2)
                except Exception: pass

    with priv_col:
        st.markdown('<div class="sec-title">Privacy Budget</div>', unsafe_allow_html=True)
        st.plotly_chart(privacy_gauge(last_eps), use_container_width=True, config={"displayModeBar": False})
        st.markdown(
            f'<div class="panel"><table class="dp-table">'
            f'<tr><td>Mechanism</td><td>Gaussian (Opacus)</td></tr>'
            f'<tr><td>σ</td><td>{st.session_state.noise_multiplier:.1f}</td></tr>'
            f'<tr><td>Clip norm C</td><td>{C.DP_MAX_GRAD_NORM}</td></tr>'
            f'<tr><td>δ</td><td>1×10⁻⁵</td></tr>'
            f'<tr><td>FedProx μ</td><td>{st.session_state.mu:.3f}</td></tr>'
            f'<tr><td>Rounds</td><td>{last_round}/{C.NUM_ROUNDS}</td></tr>'
            f'</table></div>', unsafe_allow_html=True,
        )

    # ── Charts ─────────────────────────────────────────────────────────────────
    st.markdown('<div class="sec-title">Real-Time Analytics</div>', unsafe_allow_html=True)
    ph = ('<div class="panel" style="height:200px;display:flex;align-items:center;'
          'justify-content:center;color:rgba(160,200,230,.3);font-size:10px;text-align:center;">'
          '⏳ Waiting for training data…</div>')
    ch1, ch2 = st.columns(2)
    with ch1:
        if has_data: st.plotly_chart(line_chart(df["round"], df["global_accuracy"]*100, GREEN, "Global Accuracy (%)", [0,100]), use_container_width=True, config={"displayModeBar":False})
        else: st.markdown(ph, unsafe_allow_html=True)
    with ch2:
        if has_data: st.plotly_chart(line_chart(df["round"], df["global_loss"], AMBER, "Global Loss (BCE)"), use_container_width=True, config={"displayModeBar":False})
        else: st.markdown(ph, unsafe_allow_html=True)

    if has_data:
        with st.expander("📋  Round Log", expanded=False):
            disp = df.copy()
            disp["global_accuracy"] = (disp["global_accuracy"]*100).round(2).astype(str)+"%"
            disp["global_loss"]     = disp["global_loss"].round(4)
            disp["epsilon_spent"]   = disp["epsilon_spent"].round(4)
            st.dataframe(disp, use_container_width=True, hide_index=True)

    st.divider()

    # ── Telemetry ──────────────────────────────────────────────────────────────
    with st.expander("⬛  System Telemetry — Live Packet Log", expanded=True):
        st.markdown(render_terminal(events, st.session_state.jitter_enabled, st.session_state.jitter_target), unsafe_allow_html=True)
        st.caption(f"{len(events)} events  ·  source: telemetry.jsonl")

    st.divider()

    with st.expander("Evidence", expanded=False):
        st.warning("Research prototype, not clinical diagnostic software.")
        evidence = load_evidence()
        summary = evidence.get("experiment_summary")
        if summary:
            st.caption(f"Experiment summary generated: {summary.get('generated_at', 'unknown')}")
            rows = []
            for baseline, data in summary.get("summary", {}).items():
                rows.append({
                    "baseline": baseline,
                    "accuracy_mean": data.get("accuracy", {}).get("mean"),
                    "f1_mean": data.get("f1", {}).get("mean"),
                    "roc_auc_mean": data.get("roc_auc", {}).get("mean"),
                    "epsilon_mean": data.get("epsilon", {}).get("mean"),
                })
            if rows:
                st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
        else:
            st.caption("No experiment summary found. Run scripts/run_experiments.py.")

        test_status = evidence.get("test_status")
        if test_status:
            st.json(test_status)
        else:
            st.caption("No test status artifact found.")

        checkpoint_meta = evidence.get("checkpoint")
        if checkpoint_meta:
            st.json({
                "gradcam_checkpoint_round": checkpoint_meta.get("round"),
                "accuracy": checkpoint_meta.get("accuracy"),
                "epsilon_spent": checkpoint_meta.get("epsilon_spent"),
                "pt_file": checkpoint_meta.get("pt_file"),
            })
        else:
            st.caption("No checkpoint available for Grad-CAM evidence.")

    st.divider()

    # ── Grad-CAM ───────────────────────────────────────────────────────────────
    if not has_permission(role, "model:analyze"):
        return

    st.markdown('<div class="sec-title">🔬 Grad-CAM X-Ray Explainability</div>', unsafe_allow_html=True)
    up_col, res_col = st.columns([1,2])

    with up_col:
        uploaded    = st.file_uploader("Upload Chest X-Ray", type=list(C.ALLOWED_IMAGE_TYPES))
        target_cls  = st.selectbox("Target Pathology", range(14), format_func=lambda i: f"{i}: {CHEST_CLASSES[i]}", index=6)
        alpha_blend = st.slider("Heatmap Opacity", 0.1, 0.9, 0.5, 0.05)
        show_all    = st.checkbox("Show all 14 scores", True)
        run_btn     = st.button("▶  Run Grad-CAM", use_container_width=True)

    with res_col:
        if uploaded and run_btn:
            # ── Production: validate file before processing ────────────────────
            raw_bytes = uploaded.read()
            valid, err = validate_image_upload(raw_bytes, uploaded.name)
            if not valid:
                st.error(f"Upload rejected: {err}")
                log.warning(f"Invalid upload: {err} | file={uploaded.name}")
            else:
                with st.spinner("Running inference + Grad-CAM…"):
                    try:
                        pil_img = Image.open(__import__("io").BytesIO(raw_bytes))
                        model, gradcam, ckpt_meta = get_gradcam_model()
                        if model is None or gradcam is None:
                            st.error("No trained checkpoint found. Run federated training before using Grad-CAM.")
                            return
                        tensor  = _preprocess(pil_img)
                        model.eval()
                        with torch.no_grad():
                            logits = model(tensor.to(DEVICE))
                            probs  = torch.sigmoid(logits).cpu().numpy()[0]
                        heatmap = gradcam(tensor, class_idx=target_cls)
                        blend   = _overlay(pil_img, heatmap, alpha=alpha_blend)

                        i1, i2 = st.columns(2)
                        with i1:
                            st.markdown('<p style="font-size:9px;color:rgba(160,200,230,.45);letter-spacing:.12em;">ORIGINAL</p>', unsafe_allow_html=True)
                            st.image(pil_img.convert("RGB"), use_container_width=True)
                        with i2:
                            st.markdown(f'<p style="font-size:9px;color:rgba(160,200,230,.45);letter-spacing:.12em;">GRAD-CAM · {CHEST_CLASSES[target_cls].upper()}</p>', unsafe_allow_html=True)
                            st.image(blend, use_container_width=True)

                        top_n = 14 if show_all else 5
                        order = np.argsort(probs)[::-1][:top_n]
                        bars  = []
                        for idx in order:
                            pct = probs[idx]*100
                            col = GREEN if pct>50 else CYAN if pct>20 else "rgba(160,200,230,.4)"
                            bars.append(
                                f'<div class="pred-bar-wrap">'
                                f'<div class="pred-label-row"><span style="color:{col}">{CHEST_CLASSES[idx]}</span>'
                                f'<span style="color:{col};font-weight:600">{pct:.1f}%</span></div>'
                                f'<div class="pred-bar-bg"><div class="pred-bar-fill" '
                                f'style="width:{pct:.0f}%;background:{col};box-shadow:0 0 6px {col};"></div></div></div>'
                            )
                        st.markdown("".join(bars), unsafe_allow_html=True)
                        log.info(
                            f"GradCAM inference: checkpoint_round={ckpt_meta.get('round')} | "
                            f"class={CHEST_CLASSES[target_cls]}, "
                            f"top_pred={CHEST_CLASSES[order[0]]} ({probs[order[0]]*100:.1f}%)"
                        )
                    except Exception as e:
                        st.error("Inference failed. Please try a different image.")
                        log.error(f"GradCAM inference error: {e}", exc_info=True)
        elif not uploaded:
            st.markdown(
                f'<div class="panel" style="height:270px;display:flex;align-items:center;justify-content:center;text-align:center;">'
                f'<div><div style="font-size:44px;margin-bottom:14px;">🩻</div>'
                f'<div style="font-size:10px;color:rgba(160,200,230,.4);">Upload an X-ray to run<br>Grad-CAM explainability</div></div></div>',
                unsafe_allow_html=True,
            )

    if st.session_state.auto_refresh:
        time.sleep(st.session_state.refresh_interval)
        st.cache_data.clear()
        st.rerun()


# =============================================================================
# ENTRY POINT
# =============================================================================

def main():
    try:
        C.validate_runtime_config(require_dashboard=True)
    except RuntimeError as e:
        st.error(str(e))
        st.stop()
    if not check_auth():
        login_page()
    else:
        sidebar()
        dashboard()


if __name__ == "__main__":
    main()
