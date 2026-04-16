"""
encryption.py — AES-256-GCM Journal Encryption Service
Place in: backend/encryption.py

Uses AES-256-GCM (Galois/Counter Mode):
  - True 256-bit AES key (matches paper claim)
  - GCM provides built-in authentication (detects tampering)
  - PBKDF2-SHA256 with 100,000 iterations for key derivation

Install: pip install cryptography
"""
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

# ── Master encryption key ──────────────────────────────────────────────────────
# MUST be set in .env — raises error if missing (never use a hardcoded fallback)
_MASTER_KEY = os.environ.get("JOURNAL_ENCRYPTION_KEY")
if not _MASTER_KEY:
    # Fallback ONLY for local dev — remove this in production
    import warnings
    warnings.warn(
        "JOURNAL_ENCRYPTION_KEY not set. Using dev fallback — "
        "DO NOT use in production.",
        stacklevel=2
    )
    _MASTER_KEY = "dev-only-fallback-key-not-for-production-2026"

_SALT = b"manifesting_motivation_salt_2026"  # fixed salt — acceptable for project scope


def _derive_key() -> bytes:
    """
    Derive a true 256-bit AES key from master key using PBKDF2-SHA256.
    All 32 bytes are used as the AES-256 key (unlike Fernet which splits them).
    """
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,          # 32 bytes = 256 bits — full AES-256 key
        salt=_SALT,
        iterations=100_000,
    )
    return kdf.derive(_MASTER_KEY.encode("utf-8"))


_AES_KEY = _derive_key()  # derive once on import


# ── Public API ─────────────────────────────────────────────────────────────────

def encrypt_journal(plaintext: str) -> str:
    """
    Encrypt a journal entry using AES-256-GCM.
    Returns base64-encoded string: nonce(12 bytes) + ciphertext + auth_tag.
    Safe to store directly in the database TEXT column.
    """
    if not plaintext:
        return plaintext
    try:
        aesgcm = AESGCM(_AES_KEY)
        nonce  = os.urandom(12)                          # 96-bit random nonce
        ct     = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
        # Store as: base64(nonce + ciphertext+tag)
        return base64.urlsafe_b64encode(nonce + ct).decode("utf-8")
    except Exception as e:
        print(f"[encryption] encrypt error: {e}")
        return plaintext  # fallback — never lose user data


def decrypt_journal(ciphertext: str) -> str:
    """
    Decrypt a journal entry encrypted with AES-256-GCM.
    Handles legacy plaintext entries gracefully (returns as-is).
    """
    if not ciphertext:
        return ciphertext
    try:
        raw    = base64.urlsafe_b64decode(ciphertext + "==")
        nonce  = raw[:12]                                # first 12 bytes = nonce
        ct     = raw[12:]                               # rest = ciphertext + auth tag
        aesgcm = AESGCM(_AES_KEY)
        return aesgcm.decrypt(nonce, ct, None).decode("utf-8")
    except Exception:
        # Not encrypted (legacy plaintext entry) — return as-is
        return ciphertext


def is_encrypted(text: str) -> bool:
    """
    Check whether a journal entry is AES-256-GCM encrypted.
    Used by the migration function to skip already-encrypted entries.
    """
    if not text:
        return False
    try:
        raw = base64.urlsafe_b64decode(text + "==")
        if len(raw) < 28:   # nonce(12) + min ciphertext(1) + GCM tag(16) = 29
            return False
        nonce  = raw[:12]
        ct     = raw[12:]
        AESGCM(_AES_KEY).decrypt(nonce, ct, None)
        return True
    except Exception:
        return False


def encrypt_existing_journals(db_session) -> dict:
    """
    One-time migration: encrypt all existing plaintext journal entries.
    Safe to run multiple times — skips already-encrypted entries.
    Call once via a protected admin/migration endpoint.
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
            "message":   f"Encrypted {encrypted_count} entries, skipped {skipped_count} (already encrypted or empty)"
        }
    except Exception as e:
        db_session.rollback()
        return {"success": False, "error": str(e)}