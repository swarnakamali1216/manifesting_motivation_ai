"""
routes/elevenlabs.py

FIXES APPLIED:
  1. Lazy key validation — _key_valid is re-checked on first real request
     instead of only at startup. Render cold-start can no longer permanently
     break voice by failing the one-time boot check.
  2. _validate_key() is called with a short timeout and retried once per
     process lifetime if the startup check failed.
  3. Audio cache + ThreadPoolExecutor kept from previous version.
  4. FREE_VOICES whitelist — only free-tier ElevenLabs voices allowed.
     Any voice_id not in the whitelist falls back to Sarah automatically.
  5. _fetch_tts now uses the actual voice_id parameter (was hardcoded).
  6. Default voice fixed from Bella (premium/402) to Sarah (free).
  7. Explicit 402 handling — retries with Sarah instead of returning 503.
"""

from flask import Blueprint, request, jsonify, Response
import os, hashlib, time, threading
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
import requests as req_lib

elevenlabs_bp = Blueprint("elevenlabs", __name__)

ELEVENLABS_KEY = (os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_KEY_TEST") or "").strip()
ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

print(f"ElevenLabs key length={len(ELEVENLABS_KEY)} ends={ELEVENLABS_KEY[-4:] if ELEVENLABS_KEY else 'EMPTY'}")

# ── Free-tier voice whitelist ─────────────────────────────────────────────────
FREE_VOICES: dict[str, dict] = {
    "21m00Tcm4TlvDq8ikWAM": {"name": "Sarah",   "style": "Warm & encouraging",  "gender": "female"},
    "pNInz6obpgDQGcFmaJgB": {"name": "Adam",    "style": "Neutral male",         "gender": "male"},
    "ErXwobaYiN019PkySvjV": {"name": "Antoni",  "style": "Well-rounded male",    "gender": "male"},
    "VR6AewLTigWG4xSOukaG": {"name": "Arnold",  "style": "Crisp male",           "gender": "male"},
    "MF3mGyEYCl7XYWbV9V6O": {"name": "Elli",    "style": "Young female",         "gender": "female"},
    "TxGEqnHWrfWFTfGW9XjX": {"name": "Josh",    "style": "Deep male",            "gender": "male"},
}
DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Sarah — always free

def _safe_voice_id(raw: str) -> str:
    """
    Accept either a voice_id or a voice name (case-insensitive).
    If not in the free whitelist, fall back to Sarah and log a warning.
    """
    if not raw:
        return DEFAULT_VOICE_ID
    # Direct ID match
    if raw in FREE_VOICES:
        return raw
    # Name match (e.g. frontend sends "Josh")
    for vid, meta in FREE_VOICES.items():
        if meta["name"].lower() == raw.lower():
            return vid
    print(f"ElevenLabs: voice '{raw}' not in free whitelist — falling back to Sarah")
    return DEFAULT_VOICE_ID


# ── FIX 1: Lazy key state — not locked to startup result ─────────────────────
_key_valid   = False
_key_checked = False
_key_lock    = threading.Lock()

def _validate_key() -> bool:
    """Try to validate the ElevenLabs key. Returns True if valid."""
    global _key_valid, _key_checked
    if not ELEVENLABS_KEY or len(ELEVENLABS_KEY) < 32:
        return False
    try:
        resp = req_lib.get(
            "https://api.elevenlabs.io/v1/user",
            headers={"xi-api-key": ELEVENLABS_KEY},
            timeout=8,
        )
        if resp.status_code == 200:
            with _key_lock:
                _key_valid   = True
                _key_checked = True
            print("ElevenLabs: key valid — free AI voices enabled")
            return True
        else:
            print(f"ElevenLabs: key rejected (status {resp.status_code})")
            return False
    except Exception as e:
        print(f"ElevenLabs: validation error ({e})")
        return False

def _is_key_valid() -> bool:
    global _key_valid, _key_checked
    if _key_checked:
        return _key_valid
    return _validate_key()

# ── Startup validation (best-effort, non-fatal) ───────────────────────────────
threading.Thread(target=_validate_key, daemon=True).start()


# ── In-memory audio cache ─────────────────────────────────────────────────────
_audio_cache: OrderedDict = OrderedDict()
_CACHE_MAX = 100
_CACHE_TTL = 3600

def _cache_key(text: str, voice_id: str) -> str:
    return hashlib.sha256(f"{text}||{voice_id}".encode()).hexdigest()

def _cache_get(key: str):
    entry = _audio_cache.get(key)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
        _audio_cache.move_to_end(key)
        return entry["audio"]
    if entry:
        del _audio_cache[key]
    return None

def _cache_set(key: str, audio: bytes):
    if len(_audio_cache) >= _CACHE_MAX:
        _audio_cache.popitem(last=False)
    _audio_cache[key] = {"audio": audio, "ts": time.time()}
    _audio_cache.move_to_end(key)


# ── Thread pool for non-blocking HTTP ────────────────────────────────────────
_executor = ThreadPoolExecutor(max_workers=4)

def _fetch_tts(text: str, voice_id: str) -> bytes | None:
    """
    Fetch TTS audio from ElevenLabs.
    FIX: uses the actual voice_id parameter (was hardcoded to Sarah before).
    FIX: explicit 402 handling — retries with Sarah instead of silent None.
    """
    resp = req_lib.post(
        ELEVENLABS_URL.format(voice_id=voice_id),   # ← FIX: was hardcoded
        json={
            "text":     text,
            "model_id": "eleven_turbo_v2_5",
            "voice_settings": {
                "stability":        0.5,
                "similarity_boost": 0.75,
                "style":            0.0,
                "use_speaker_boost": True,
            },
        },
        headers={
            "xi-api-key":   ELEVENLABS_KEY,
            "Content-Type": "application/json",
            "Accept":       "audio/mpeg",
        },
        timeout=20,
    )

    if resp.status_code == 200:
        return resp.content

    if resp.status_code == 402:
        # Premium voice slipped through — retry once with Sarah
        print(f"ElevenLabs: 402 on voice '{voice_id}' — retrying with Sarah")
        if voice_id != DEFAULT_VOICE_ID:
            return _fetch_tts(text, DEFAULT_VOICE_ID)
        print("ElevenLabs: 402 even on Sarah — quota exhausted or plan issue")
        return None

    print(f"ElevenLabs: HTTP {resp.status_code} — {resp.text[:200]}")
    return None


# ── Routes ────────────────────────────────────────────────────────────────────

@elevenlabs_bp.route("/speak", methods=["POST", "OPTIONS"])
def speak():
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    text = (data.get("text") or "").strip()

    # FIX: default is now Sarah (free), not Bella (premium/402)
    raw_voice = data.get("voice_id") or data.get("voice_name") or DEFAULT_VOICE_ID
    voice_id  = _safe_voice_id(raw_voice)

    if not text:
        return jsonify({"error": "No text provided"}), 400

    if not _is_key_valid():
        return jsonify({"error": "ElevenLabs unavailable — use browser TTS", "fallback": True}), 503

    text = text[:500]
    key  = _cache_key(text, voice_id)

    cached = _cache_get(key)
    if cached:
        print(f"ElevenLabs: cache hit ({len(text)} chars, voice={voice_id})")
        return Response(cached, status=200, mimetype="audio/mpeg",
                        headers={"Content-Type": "audio/mpeg", "Cache-Control": "no-cache"})

    try:
        future = _executor.submit(_fetch_tts, text, voice_id)
        audio  = future.result(timeout=25)

        if audio:
            _cache_set(key, audio)
            print(f"ElevenLabs: spoke {len(text)} chars via voice={voice_id}")
            return Response(audio, status=200, mimetype="audio/mpeg",
                            headers={"Content-Type": "audio/mpeg", "Cache-Control": "no-cache"})

        return jsonify({"error": "ElevenLabs returned no audio", "fallback": True}), 503

    except TimeoutError:
        print("ElevenLabs: executor timeout")
        return jsonify({"error": "ElevenLabs timeout", "fallback": True}), 503
    except req_lib.exceptions.Timeout:
        print("ElevenLabs: request timeout")
        return jsonify({"error": "ElevenLabs timeout", "fallback": True}), 503
    except Exception as e:
        print(f"ElevenLabs: {e}")
        return jsonify({"error": str(e), "fallback": True}), 503


@elevenlabs_bp.route("/speak/voices", methods=["GET"])
def list_voices():
    """
    Returns only the free-tier whitelist — no API call needed,
    no risk of returning premium voices the plan can't use.
    """
    voices = [
        {"id": vid, "name": meta["name"], "style": meta["style"], "gender": meta["gender"]}
        for vid, meta in FREE_VOICES.items()
    ]
    return jsonify({"voices": voices})