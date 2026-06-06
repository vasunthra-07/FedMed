# =============================================================================
# tests/test_security.py  —  Unit tests for security.py
# =============================================================================

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import time
import pytest
import security as security_module
from security import (
    create_jwt, verify_jwt,
    hash_password, verify_password,
    validate_image_upload,
    generate_certs,
    get_client_root_certificates,
    get_flower_server_certificates,
)


@pytest.fixture(autouse=True)
def jwt_secret(monkeypatch):
    monkeypatch.setattr(security_module, "JWT_SECRET", "test-secret-" + "a" * 64)

# ── Minimal valid PNG magic bytes (1×1 black pixel) ───────────────────────────
_VALID_PNG = (
    b"\x89PNG\r\n\x1a\n"           # PNG signature
    b"\x00\x00\x00\rIHDR"          # IHDR chunk length + type
    b"\x00\x00\x00\x01"            # width = 1
    b"\x00\x00\x00\x01"            # height = 1
    b"\x08\x02\x00\x00\x00"        # bit depth, color type, etc.
    b"\x90wS\xde"                  # CRC
    b"\x00\x00\x00\x0cIDATx"       # IDAT chunk
    b"\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N"  # compressed data
    b"\x00\x00\x00\x00IEND\xaeB`\x82"  # IEND
)

_VALID_JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 100   # JPEG magic + padding


# =============================================================================
# JWT
# =============================================================================

class TestJWT:

    def test_create_and_verify(self):
        token = create_jwt("alice")
        assert token is not None
        assert len(token) > 10
        user = verify_jwt(token)
        assert user == "alice"

    def test_tampered_token_rejected(self):
        token   = create_jwt("alice")
        tampered = token[:-4] + "XXXX"
        user = verify_jwt(tampered)
        assert user is None

    def test_empty_token_rejected(self):
        assert verify_jwt("") is None
        assert verify_jwt("not.a.token") is None

    def test_missing_secret_rejected(self, monkeypatch):
        monkeypatch.setattr(security_module, "JWT_SECRET", None)
        with pytest.raises(RuntimeError):
            create_jwt("alice")

    def test_different_users_different_tokens(self):
        t1 = create_jwt("alice")
        t2 = create_jwt("bob")
        assert t1 != t2

    def test_same_user_consistent_verify(self):
        token = create_jwt("admin")
        assert verify_jwt(token) == "admin"
        assert verify_jwt(token) == "admin"   # idempotent


# =============================================================================
# PASSWORD HASHING
# =============================================================================

class TestPasswordHashing:

    def test_hash_is_not_plaintext(self):
        pw   = "mysecretpassword"
        hashed = hash_password(pw)
        assert pw not in hashed

    def test_correct_password_verifies(self):
        pw     = "fedmed2024"
        hashed = hash_password(pw)
        assert verify_password(pw, hashed)

    def test_wrong_password_rejected(self):
        pw     = "fedmed2024"
        hashed = hash_password(pw)
        assert not verify_password("wrongpassword", hashed)

    def test_empty_password_rejected(self):
        hashed = hash_password("fedmed2024")
        assert not verify_password("", hashed)

    def test_different_hashes_for_same_password(self):
        """bcrypt uses random salt — same password → different hash."""
        pw = "fedmed2024"
        h1 = hash_password(pw)
        h2 = hash_password(pw)
        assert h1 != h2   # different salts

    def test_both_hashes_verify_correctly(self):
        pw = "fedmed2024"
        h1 = hash_password(pw)
        h2 = hash_password(pw)
        assert verify_password(pw, h1)
        assert verify_password(pw, h2)


# =============================================================================
# FILE VALIDATION
# =============================================================================

class TestFileValidation:

    # ── Valid files ────────────────────────────────────────────────────────────

    def test_valid_png_accepted(self):
        ok, err = validate_image_upload(_VALID_PNG, "scan.png")
        assert ok, f"Valid PNG rejected: {err}"
        assert err == ""

    def test_valid_jpeg_accepted(self):
        ok, err = validate_image_upload(_VALID_JPEG, "xray.jpg")
        assert ok, f"Valid JPEG rejected: {err}"

    # ── Extension checks ───────────────────────────────────────────────────────

    def test_svg_rejected(self):
        svg = b"<svg xmlns='http://www.w3.org/2000/svg'></svg>"
        ok, err = validate_image_upload(svg, "malicious.svg")
        assert not ok
        assert "not allowed" in err.lower()

    def test_html_rejected(self):
        html = b"<!DOCTYPE html><html></html>"
        ok, err = validate_image_upload(html, "xss.html")
        assert not ok

    def test_pdf_rejected(self):
        pdf = b"%PDF-1.4" + b"\x00" * 100
        ok, err = validate_image_upload(pdf, "report.pdf")
        assert not ok

    def test_exe_rejected(self):
        exe = b"MZ" + b"\x00" * 100   # PE magic
        ok, err = validate_image_upload(exe, "malware.exe")
        assert not ok

    # ── Magic byte spoofing ────────────────────────────────────────────────────

    def test_html_disguised_as_png_rejected(self):
        """File with .png extension but HTML content should be rejected."""
        html_bytes = b"<!DOCTYPE html><html><body>XSS</body></html>"
        ok, err = validate_image_upload(html_bytes, "fake.png")
        assert not ok
        assert "spoofing" in err.lower() or "content does not match" in err.lower()

    def test_jpeg_magic_with_png_extension_rejected(self):
        ok, err = validate_image_upload(_VALID_JPEG, "image.png")
        assert not ok   # JPEG magic bytes don't match PNG extension

    # ── Size checks ───────────────────────────────────────────────────────────

    def test_oversized_file_rejected(self):
        big_png = _VALID_PNG + b"\x00" * (15 * 1024 * 1024)   # 15 MB
        ok, err = validate_image_upload(big_png, "big.png", max_mb=10)
        assert not ok
        assert "large" in err.lower() or "mb" in err.lower()

    def test_empty_file_rejected(self):
        ok, err = validate_image_upload(b"", "empty.png")
        assert not ok

    def test_tiny_file_rejected(self):
        ok, err = validate_image_upload(b"\x89PNG\r\n", "tiny.png")
        assert not ok

    def test_file_at_size_limit_accepted(self):
        """File exactly at size limit should pass."""
        # Build a PNG-magic prefixed file just under the limit
        data = _VALID_PNG + b"\x00" * (9 * 1024 * 1024)   # ~9 MB
        ok, _err = validate_image_upload(data, "limit.png", max_mb=10)
        assert ok

    # ── Case sensitivity ───────────────────────────────────────────────────────

    def test_uppercase_extension_accepted(self):
        ok, err = validate_image_upload(_VALID_JPEG, "XRAY.JPG")
        assert ok, f"Uppercase extension rejected: {err}"

    def test_mixed_case_extension_accepted(self):
        ok, err = validate_image_upload(_VALID_JPEG, "scan.Jpeg")
        assert ok, f"Mixed-case extension rejected: {err}"


class TestFlowerTLS:

    def test_flower_certificate_helpers_return_expected_bytes(self, tmp_path, monkeypatch):
        if not security_module.CRYPTO_AVAILABLE:
            pytest.skip("cryptography not installed")

        monkeypatch.setattr(security_module, "CERTS_DIR", tmp_path)
        monkeypatch.setattr(security_module, "TLS_CA_CERT", tmp_path / "ca.crt")
        monkeypatch.setattr(security_module, "TLS_SERVER_CERT", tmp_path / "server.crt")
        monkeypatch.setattr(security_module, "TLS_SERVER_KEY", tmp_path / "server.key")
        monkeypatch.setattr(security_module, "TLS_CLIENT_CERT", tmp_path / "client.crt")
        monkeypatch.setattr(security_module, "TLS_CLIENT_KEY", tmp_path / "client.key")

        assert generate_certs(force=True)
        certs = get_flower_server_certificates()
        root = get_client_root_certificates()

        assert certs is not None
        assert len(certs) == 3
        assert certs[0] == root
        assert b"BEGIN CERTIFICATE" in certs[0]
        assert b"BEGIN CERTIFICATE" in certs[1]
        assert b"BEGIN RSA PRIVATE KEY" in certs[2]
