"""
backend/encryption.py — AES-256-GCM journal encryption

SETUP:
  1. Generate a key (run once):
       python -c "from cryptography.hazmat.primitives import keymaterial; import os,base64; print(base64.b64encode(os.urandom(32)).decode())"
     OR simpler:
       python -c "import os,base64; print(base64.b64encode(os.urandom(32)).decode())"

  2. Add to Render environment variables:
       JOURNAL_ENCRYPTION_KEY=<the base64 string from above>

  3. Add to your local .env:
       JOURNAL_ENCRYPTION_KEY=<same key>

  ⚠️  IMPORTANT: Use the SAME key on both local and Render.
      If the key changes, old entries cannot be decrypted.

INSTALL:
  pip install cryptography

SAFE FALLBACK:
  If JOURNAL_ENCRYPTION_KEY is not set, encryption is skipped
  and plaintext is stored. This means the app never crashes due
  to a missing key — you just lose encryption until you set it.
  A warning is printed so you know.
"""

import os
import base64
from dotenv import load_dotenv
load_dotenv()

# ── Try to import cryptography ─────────────────────────────────────────────────
try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    _CRYPTO_OK = True
except ImportError:
    _CRYPTO_OK = False
    print("⚠️  cryptography package not installed — journal encryption disabled. Run: pip install cryptography")

# ── Load key ───────────────────────────────────────────────────────────────────
_raw_key = os.getenv("JOURNAL_ENCRYPTION_KEY", "").strip()
_KEY: bytes | None = None

if _raw_key and _CRYPTO_OK:
    try:
        decoded = base64.b64decode(_raw_key)
        if len(decoded) != 32:
            print(f"⚠️  JOURNAL_ENCRYPTION_KEY must be 32 bytes when decoded (got {len(decoded)}). Encryption disabled.")
        else:
            _KEY = decoded
            print("✅ Journal encryption ready (AES-256-GCM)")
    except Exception as e:
        print(f"⚠️  JOURNAL_ENCRYPTION_KEY decode error: {e}. Encryption disabled.")
else:
    if not _raw_key:
        print("⚠️  JOURNAL_ENCRYPTION_KEY not set — journal entries stored as plaintext. Set this env var to enable encryption.")


# ── Public API ─────────────────────────────────────────────────────────────────

def encrypt_journal(plaintext: str) -> str:
    """
    Encrypt a journal entry string.
    Returns:  "enc:v1:<base64(nonce+ciphertext)>"
    If key not set or crypto unavailable, returns plaintext unchanged.
    """
    if not plaintext:
        return plaintext
    if not _KEY or not _CRYPTO_OK:
        return plaintext   # graceful fallback — no crash

    try:
        aesgcm = AESGCM(_KEY)
        nonce  = os.urandom(12)          # 96-bit nonce, unique per entry
        ct     = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        blob   = base64.b64encode(nonce + ct).decode("ascii")
        return f"enc:v1:{blob}"
    except Exception as e:
        print(f"[encrypt_journal] encryption failed, storing plaintext: {e}")
        return plaintext   # never crash the save


def decrypt_journal(value: str) -> str:
    """
    Decrypt a journal entry string.
    Handles:
      - "enc:v1:<blob>"  → decrypt with AES-256-GCM
      - anything else    → return as-is (plaintext or legacy entry)

    If decryption fails (wrong key, corrupt data), returns a safe
    placeholder instead of crashing.
    """
    if not value:
        return value

    # Not an encrypted entry — return as-is (legacy plaintext)
    if not value.startswith("enc:v1:"):
        return value

    if not _KEY or not _CRYPTO_OK:
        # Key not available but entry is encrypted — return placeholder
        # so the frontend doesn't crash showing raw ciphertext
        return "[entry encrypted — JOURNAL_ENCRYPTION_KEY not configured on this server]"

    try:
        blob   = base64.b64decode(value[len("enc:v1:"):])
        nonce  = blob[:12]
        ct     = blob[12:]
        aesgcm = AESGCM(_KEY)
        plain  = aesgcm.decrypt(nonce, ct, None)
        return plain.decode("utf-8")
    except Exception as e:
        print(f"[decrypt_journal] decryption failed: {e}")
        # Don't crash the GET route — return a safe placeholder
        return "[entry could not be decrypted — key mismatch or corrupt data]"


def is_encryption_enabled() -> bool:
    """Returns True if encryption is active (key loaded and crypto available)."""
    return _KEY is not None and _CRYPTO_OK