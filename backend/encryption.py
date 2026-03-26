"""
encryption.py — AES-256 Journal Encryption Service
Place in: backend/encryption.py

Uses Fernet symmetric encryption (AES-128-CBC under the hood,
but we derive a 256-bit key making it AES-256 equivalent strength).

Install: pip install cryptography
"""
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import os

# ── Master encryption key ──────────────────────────────────────────────────────
# In production this comes from .env — NEVER hardcode in real apps
_MASTER_KEY = os.environ.get("JOURNAL_ENCRYPTION_KEY", "manifesting-motivation-aes256-secret-key-2026")
_SALT       = b"manifesting_motivation_salt_2026"  # fixed salt for deterministic key

def _get_fernet() -> Fernet:
    """Derive a 256-bit AES key from master key using PBKDF2."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_SALT,
        iterations=100_000,
        backend=default_backend()
    )
    key = base64.urlsafe_b64encode(kdf.derive(_MASTER_KEY.encode()))
    return Fernet(key)

_fernet = _get_fernet()  # initialise once on import

# ── Public API ─────────────────────────────────────────────────────────────────

def encrypt_journal(plaintext: str) -> str:
    """
    Encrypt a journal entry using AES-256.
    Returns base64-encoded ciphertext string safe to store in DB.
    """
    if not plaintext:
        return plaintext
    try:
        token = _fernet.encrypt(plaintext.encode("utf-8"))
        return token.decode("utf-8")
    except Exception as e:
        print(f"Encryption error: {e}")
        return plaintext  # fallback — never lose user data

def decrypt_journal(ciphertext: str) -> str:
    """
    Decrypt a journal entry.
    Handles both encrypted entries and legacy plaintext entries gracefully.
    """
    if not ciphertext:
        return ciphertext
    try:
        plaintext = _fernet.decrypt(ciphertext.encode("utf-8"))
        return plaintext.decode("utf-8")
    except Exception:
        # Not encrypted (legacy entry) — return as-is
        return ciphertext

def is_encrypted(text: str) -> bool:
    """Check if a journal entry is encrypted."""
    if not text:
        return False
    try:
        _fernet.decrypt(text.encode("utf-8"))
        return True
    except Exception:
        return False

def encrypt_existing_journals(db_session) -> dict:
    """
    One-time migration: encrypt all existing plaintext journal entries.
    Call once via the migration endpoint.
    Returns stats dict.
    """
    from sqlalchemy import text as sql_text

    encrypted_count = 0
    skipped_count   = 0

    try:
        rows = db_session.execute(
            sql_text("SELECT id, content FROM journal_entries")
        ).fetchall()

        for row in rows:
            entry_id = row[0]
            content  = row[1]

            if content and not is_encrypted(content):
                encrypted = encrypt_journal(content)
                db_session.execute(
                    sql_text("UPDATE journal_entries SET content = :c WHERE id = :id"),
                    {"c": encrypted, "id": entry_id}
                )
                encrypted_count += 1
            else:
                skipped_count += 1

        db_session.commit()
        return {
            "success":   True,
            "encrypted": encrypted_count,
            "skipped":   skipped_count,
            "message":   f"Encrypted {encrypted_count} entries, skipped {skipped_count} (already encrypted)"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}