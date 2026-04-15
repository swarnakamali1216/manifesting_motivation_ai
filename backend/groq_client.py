"""
groq_client.py — Shared Groq client with persistent HTTP connection pool.

WHY THIS EXISTS:
  Without this, every request to /api/motivate creates a NEW TCP connection
  to Groq's API server, which means a full TLS handshake (~0.4-0.8s overhead).
  This module creates ONE shared client that keeps connections alive and
  reuses them across ALL requests — eliminating that cost entirely.

USAGE in any route file:
  from groq_client import get_groq_client
  client = get_groq_client()
  response = client.chat.completions.create(...)
"""

import os
import httpx
from groq import Groq

# ---------------------------------------------------------------------------
# Single shared Groq client — created once when the module first imports.
# All Flask routes (motivation, journal, goals, etc.) share this one instance.
# ---------------------------------------------------------------------------
_groq_client: Groq | None = None


def get_groq_client() -> Groq:
    """
    Returns the shared Groq client. Creates it on first call (lazy init).
    Thread-safe for reads; module-level init happens before requests arrive.
    """
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set in environment / .env file")

        _groq_client = Groq(
            api_key=api_key,
            http_client=httpx.Client(
                limits=httpx.Limits(
                    max_connections=50,            # max simultaneous TCP connections
                    max_keepalive_connections=20,  # keep 20 connections warm at all times
                    keepalive_expiry=60.0          # keep connections alive for 60s idle
                ),
                timeout=httpx.Timeout(
                    connect=10.0,   # time to establish connection
                    read=60.0,      # time to wait for Groq to respond (LLM can be slow)
                    write=10.0,
                    pool=5.0        # time to wait for a free connection from pool
                )
            )
        )
    return _groq_client


def warmup_groq() -> bool:
    """
    Sends a minimal request to Groq to pre-establish the TCP connection.
    Call this once at startup so the first real user request is fast.
    Returns True if warmup succeeded, False if it failed (non-fatal).
    """
    try:
        client = get_groq_client()
        client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=[{"role": "user", "content": "hi"}],
            max_tokens=3
        )
        return True
    except Exception as e:
        print(f"⚠️  Groq warmup failed (non-fatal): {e}")
        return False