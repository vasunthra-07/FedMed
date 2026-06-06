import csv
import json
import os
import socket
import subprocess
import sys
import time

import numpy as np
import pytest
import torch
from flwr.common import Code, FitRes, Status, ndarrays_to_parameters, parameters_to_ndarrays

import checkpoint
import config as C
import server
from common import DEVICE, MedXRayCNN, get_parameters, set_parameters
from security import create_jwt, get_jwt_claims, has_permission


@pytest.fixture(autouse=True)
def isolated_runtime(tmp_path, monkeypatch):
    state_dir = tmp_path / "state"
    ckpt_dir = tmp_path / "checkpoints"
    state_dir.mkdir()
    ckpt_dir.mkdir()
    monkeypatch.setattr(C, "STATE_DIR", state_dir)
    monkeypatch.setattr(C, "METRICS_CSV", state_dir / "metrics.csv")
    monkeypatch.setattr(C, "TELEMETRY_JSONL", state_dir / "telemetry.jsonl")
    monkeypatch.setattr(C, "STATUS_JSON", state_dir / "status.json")
    monkeypatch.setattr(C, "MU_CONFIG", state_dir / "mu_config.json")
    monkeypatch.setattr(C, "CHECKPOINTS_DIR", ckpt_dir)
    monkeypatch.setattr(checkpoint, "CHECKPOINTS_DIR", ckpt_dir)
    monkeypatch.setattr(C, "SERVER_DP_NOISE_STD", 0.0)
    monkeypatch.setattr(C, "MAX_CLIENT_UPDATE_NORM", 10.0)
    monkeypatch.setattr(C, "NUM_ROUNDS", 2)
    monkeypatch.setattr(C, "MIN_CLIENTS", 2)
    monkeypatch.setattr(server.C, "STATE_DIR", state_dir)
    monkeypatch.setattr(server.C, "METRICS_CSV", state_dir / "metrics.csv")
    monkeypatch.setattr(server.C, "TELEMETRY_JSONL", state_dir / "telemetry.jsonl")
    monkeypatch.setattr(server.C, "STATUS_JSON", state_dir / "status.json")
    monkeypatch.setattr(server.C, "MU_CONFIG", state_dir / "mu_config.json")
    monkeypatch.setattr(server.C, "CHECKPOINTS_DIR", ckpt_dir)
    monkeypatch.setattr(server.C, "SERVER_DP_NOISE_STD", 0.0)
    monkeypatch.setattr(server.C, "MAX_CLIENT_UPDATE_NORM", 10.0)
    monkeypatch.setattr(server.C, "NUM_ROUNDS", 2)
    monkeypatch.setattr(server.C, "MIN_CLIENTS", 2)
    yield


@pytest.fixture(autouse=True)
def jwt_secret(monkeypatch):
    import security as security_module

    monkeypatch.setattr(security_module, "JWT_SECRET", "test-secret-" + "b" * 64)


def _fit_res(arrays, client_id: int, num_examples: int = 5):
    return FitRes(
        status=Status(Code.OK, "ok"),
        parameters=ndarrays_to_parameters(arrays),
        num_examples=num_examples,
        metrics={
            "client_id": client_id,
            "loss": 0.5 + client_id * 0.01,
            "accuracy": 0.6,
            "epsilon": 1.2,
            "prox_penalty": 0.01,
            "mu": C.FEDPROX_MU,
        },
    )


def _strategy_from_model(model):
    return server.FedMedProxStrategy(
        initial_parameters=ndarrays_to_parameters(get_parameters(model)),
        fraction_fit=1.0,
        fraction_evaluate=1.0,
        min_fit_clients=2,
        min_evaluate_clients=2,
        min_available_clients=2,
    )


def _client_update(base_params, delta: float):
    updated = []
    for arr in base_params:
        out = arr.copy()
        if np.issubdtype(out.dtype, np.floating):
            out = out + delta
        updated.append(out)
    return updated


def _record_evaluation(strategy, round_num, parameters):
    arrays = parameters_to_ndarrays(parameters)
    set_parameters(strategy.global_model, arrays)
    loss = 0.4
    accuracy = 0.7
    server.append_metrics(round_num, loss, accuracy, num_clients=2, epsilon=strategy.epsilon_spent, mu=C.FEDPROX_MU)
    checkpoint.save_checkpoint(
        strategy.global_model.state_dict(),
        round_num=round_num,
        metrics={"loss": loss, "accuracy": accuracy},
        epsilon=strategy.epsilon_spent,
        mu=C.FEDPROX_MU,
    )
    server.write_status({
        "phase": "COMPLETE",
        "round": round_num,
        "total_rounds": C.NUM_ROUNDS,
        "global_accuracy": accuracy,
        "global_loss": loss,
        "epsilon_spent": strategy.epsilon_spent,
        "mu": C.FEDPROX_MU,
        "training_done": True,
    })


def test_one_round_fl_flow_generates_metrics_status_telemetry_and_checkpoint():
    model = MedXRayCNN()
    base = get_parameters(model)
    server.init_metrics_csv()
    strategy = _strategy_from_model(model)

    params, metrics = strategy.aggregate_fit(
        1,
        [(None, _fit_res(_client_update(base, 0.001), 0)),
         (None, _fit_res(_client_update(base, 0.002), 1))],
        failures=[],
    )
    assert params is not None
    assert "update_norm" not in metrics

    _record_evaluation(strategy, 1, params)

    assert C.METRICS_CSV.exists()
    rows = list(csv.DictReader(C.METRICS_CSV.open()))
    assert rows and rows[-1]["round"] == "1"
    assert json.loads(C.STATUS_JSON.read_text())["phase"] == "COMPLETE"
    events = server.load_valid_telemetry(C.TELEMETRY_JSONL)
    assert {event["event"] for event in events} >= {"SERVER_INIT", "CLIENT_FIT_RESULT", "AGGREGATION_COMPLETE"}
    assert checkpoint.list_checkpoints()[0]["round"] == 1


def test_three_client_aggregation_collects_metrics_and_tolerates_one_failure():
    model = MedXRayCNN()
    base = get_parameters(model)
    strategy = _strategy_from_model(model)

    params, _metrics = strategy.aggregate_fit(
        1,
        [(None, _fit_res(_client_update(base, 0.001), 0)),
         (None, _fit_res(_client_update(base, 0.002), 1)),
         (None, _fit_res(_client_update(base, 0.003), 2))],
        failures=[RuntimeError("client_2 disconnected after reporting")],
    )

    assert params is not None
    events = server.load_valid_telemetry(C.TELEMETRY_JSONL)
    fit_events = [e for e in events if e["event"] == "CLIENT_FIT_RESULT"]
    assert len(fit_events) == 3
    assert any(e["event"] == "CLIENT_FAILURE" for e in events)
    assert any(e["event"] == "AGGREGATION_COMPLETE" and e["payload"]["num_clients"] == 3 for e in events)


def test_resume_from_latest_checkpoint_restores_and_continues_training():
    model = MedXRayCNN()
    with torch.no_grad():
        for param in model.parameters():
            param.add_(torch.randn_like(param) * 0.01)
    expected = [p.detach().clone() for p in model.parameters()]
    checkpoint.save_checkpoint(model.state_dict(), 1, {"loss": 0.5, "accuracy": 0.65}, 1.0, 0.01)

    resumed = MedXRayCNN()
    round_num, meta = checkpoint.load_checkpoint(resumed, DEVICE)
    assert round_num == 1
    assert meta["round"] == 1
    for actual, want in zip(resumed.parameters(), expected):
        assert torch.allclose(actual, want)

    strategy = _strategy_from_model(resumed)
    base = get_parameters(resumed)
    params, _metrics = strategy.aggregate_fit(
        2,
        [(None, _fit_res(_client_update(base, 0.001), 0)),
         (None, _fit_res(_client_update(base, 0.002), 1))],
        failures=[],
    )
    assert params is not None


def test_telemetry_schema_and_malformed_handling():
    valid = {"event": "ROUND_START", "round": 1, "source": "server", "target": "all", "payload": {}}
    assert server.validate_telemetry_event(valid) == (True, "")
    assert not server.write_telemetry({"event": "BROKEN"})
    C.TELEMETRY_JSONL.write_text(
        json.dumps(valid | {"ts": "12:00:00.000"}) + "\n"
        + "{bad json}\n"
        + json.dumps({"event": "NO_ROUND", "payload": {}}) + "\n"
    )
    events = server.load_valid_telemetry(C.TELEMETRY_JSONL)
    assert len(events) == 1
    assert events[0]["event"] == "ROUND_START"


def test_rbac_role_restrictions_are_enforced():
    admin = get_jwt_claims(create_jwt("alice", role="admin"))
    researcher = get_jwt_claims(create_jwt("bob", role="researcher"))
    viewer = get_jwt_claims(create_jwt("eve", role="viewer"))

    assert has_permission(admin["role"], "settings:write")
    assert has_permission(researcher["role"], "model:analyze")
    assert not has_permission(researcher["role"], "settings:write")
    assert has_permission(viewer["role"], "metrics:read")
    assert not has_permission(viewer["role"], "model:analyze")


def test_poisoned_update_rejected_and_logged():
    model = MedXRayCNN()
    base = get_parameters(model)
    strategy = _strategy_from_model(model)
    poisoned = _client_update(base, 0.0)
    poisoned[0] = poisoned[0].copy()
    poisoned[0].flat[0] = np.nan

    params, _metrics = strategy.aggregate_fit(
        1,
        [(None, _fit_res(_client_update(base, 0.001), 0)),
         (None, _fit_res(poisoned, 1))],
        failures=[],
    )

    assert params is not None
    events = server.load_valid_telemetry(C.TELEMETRY_JSONL)
    assert any(e["event"] == "CLIENT_UPDATE_REJECTED" for e in events)
    assert any(e["event"] == "AGGREGATION_COMPLETE" and e["payload"]["num_clients"] == 1 for e in events)


def test_inf_update_rejected_and_logged():
    model = MedXRayCNN()
    base = get_parameters(model)
    strategy = _strategy_from_model(model)
    poisoned = _client_update(base, 0.0)
    poisoned[0] = poisoned[0].copy()
    poisoned[0].flat[0] = np.inf

    params, _metrics = strategy.aggregate_fit(
        1,
        [(None, _fit_res(_client_update(base, 0.001), 0)),
         (None, _fit_res(poisoned, 1))],
        failures=[],
    )

    assert params is not None
    events = server.load_valid_telemetry(C.TELEMETRY_JSONL)
    assert any(
        e["event"] == "CLIENT_UPDATE_REJECTED"
        and e["payload"]["reason"] == "non_finite_update"
        for e in events
    )


def test_extreme_norm_update_rejected():
    model = MedXRayCNN()
    base = get_parameters(model)
    strategy = _strategy_from_model(model)
    extreme = _client_update(base, 50.0)

    params, _metrics = strategy.aggregate_fit(
        1,
        [(None, _fit_res(_client_update(base, 0.001), 0)),
         (None, _fit_res(extreme, 1))],
        failures=[],
    )

    assert params is not None
    events = server.load_valid_telemetry(C.TELEMETRY_JSONL)
    assert any(
        e["event"] == "CLIENT_UPDATE_REJECTED"
        and e["payload"]["reason"] == "update_norm_exceeded"
        for e in events
    )


def test_shape_mismatch_update_rejected():
    model = MedXRayCNN()
    base = get_parameters(model)
    strategy = _strategy_from_model(model)
    bad_shape = _client_update(base, 0.0)
    bad_shape[0] = bad_shape[0].reshape(-1)

    params, _metrics = strategy.aggregate_fit(
        1,
        [(None, _fit_res(_client_update(base, 0.001), 0)),
         (None, _fit_res(bad_shape, 1))],
        failures=[],
    )

    assert params is not None
    events = server.load_valid_telemetry(C.TELEMETRY_JSONL)
    assert any(
        e["event"] == "CLIENT_UPDATE_REJECTED"
        and e["payload"]["reason"] == "parameter_shape_mismatch"
        for e in events
    )


def test_valid_update_accepted_with_clipping_stats(monkeypatch):
    monkeypatch.setattr(C, "CLIENT_UPDATE_CLIP_VALUE", 0.0005)
    monkeypatch.setattr(server.C, "CLIENT_UPDATE_CLIP_VALUE", 0.0005)
    model = MedXRayCNN()
    base = get_parameters(model)
    strategy = _strategy_from_model(model)

    params, _metrics = strategy.aggregate_fit(
        1,
        [(None, _fit_res(_client_update(base, 0.001), 0)),
         (None, _fit_res(_client_update(base, 0.001), 1))],
        failures=[],
    )

    assert params is not None
    events = server.load_valid_telemetry(C.TELEMETRY_JSONL)
    fit_events = [e for e in events if e["event"] == "CLIENT_FIT_RESULT"]
    assert fit_events
    assert fit_events[0]["payload"]["clipped_fraction"] > 0
    assert fit_events[0]["payload"]["clipped_update_norm"] > 0


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _wait_for_port(port: int, timeout_s: float = 30.0) -> bool:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.25)
    return False


def test_subprocess_flower_smoke_round(tmp_path):
    port = _free_port()
    state_dir = tmp_path / "state"
    ckpt_dir = tmp_path / "checkpoints"
    log_dir = tmp_path / "logs"
    env = os.environ.copy()
    env.update({
        "FEDMED_USE_TLS": "false",
        "FEDMED_SYNTHETIC_DATA": "true",
        "FEDMED_SERVER_HOST": "127.0.0.1",
        "FEDMED_SERVER_PORT": str(port),
        "FEDMED_STATE_DIR": str(state_dir),
        "FEDMED_CHECKPOINTS_DIR": str(ckpt_dir),
        "FEDMED_LOGS_DIR": str(log_dir),
        "FEDMED_NUM_ROUNDS": "1",
        "FEDMED_MIN_CLIENTS": "3",
        "FEDMED_LOCAL_EPOCHS": "1",
        "FEDMED_BATCH_SIZE": "3",
        "FEDMED_EVAL_BATCH_SIZE": "6",
        "FEDMED_SAMPLES_PER_CLIENT": "6",
        "FEDMED_SYNTHETIC_TEST_SAMPLES": "12",
        "FEDMED_NUM_WORKERS": "0",
        "FEDMED_SERVER_DP_NOISE": "0.0",
        "FEDMED_CLIENT_DP": "false",
        "FEDMED_MAX_UPDATE_NORM": "1000.0",
    })

    procs = []
    log_files = []
    try:
        server_log = (tmp_path / "server.out").open("w+", encoding="utf-8")
        log_files.append(server_log)
        server_proc = subprocess.Popen(
            [sys.executable, "server.py"],
            cwd=C.BASE_DIR,
            env=env,
            stdout=server_log,
            stderr=subprocess.STDOUT,
            text=True,
        )
        procs.append(server_proc)
        assert _wait_for_port(port), "server did not open the Flower port"

        for client_id in range(3):
            client_log = (tmp_path / f"client_{client_id}.out").open("w+", encoding="utf-8")
            log_files.append(client_log)
            procs.append(subprocess.Popen(
                [sys.executable, "client.py", "--id", str(client_id), "--server", f"127.0.0.1:{port}"],
                cwd=C.BASE_DIR,
                env=env,
                stdout=client_log,
                stderr=subprocess.STDOUT,
                text=True,
            ))

        try:
            server_proc.wait(timeout=90)
        except subprocess.TimeoutExpired:
            for proc in procs:
                if proc.poll() is None:
                    proc.terminate()
            for proc in procs:
                try:
                    proc.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    proc.kill()
            for handle in log_files:
                handle.flush()
            logs = "\n".join(path.read_text(errors="replace") for path in tmp_path.glob("*.out"))
            raise AssertionError(f"server did not exit within timeout\n{logs}")
        for proc in procs[1:]:
            proc.wait(timeout=30)

        for handle in log_files:
            handle.flush()
        server_out = (tmp_path / "server.out").read_text(errors="replace")
        client_out = [p.read_text(errors="replace") for p in sorted(tmp_path.glob("client_*.out"))]

        assert server_proc.returncode == 0, server_out
        assert all(proc.returncode == 0 for proc in procs[1:]), "\n".join(client_out)
        assert "Training complete" in server_out
        assert (state_dir / "metrics.csv").exists()
        assert (state_dir / "status.json").exists()
        assert (state_dir / "telemetry.jsonl").exists()
        assert list(ckpt_dir.glob("checkpoint_round_*.pt"))
        events = [json.loads(line) for line in (state_dir / "telemetry.jsonl").read_text().splitlines() if line.strip()]
        assert any(event["event"] == "AGGREGATION_COMPLETE" for event in events)
    finally:
        for proc in procs:
            if proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    proc.kill()
        for handle in log_files:
            handle.close()
