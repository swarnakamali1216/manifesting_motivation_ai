"""
routes/elevenlabs.py

FIXES APPLIED:
  1. Lazy key validation — _KEY_VALID is re-checked on first real request
     instead of only at startup. Render cold-start can no longer permanently
     break voice by failing the one-time boot check.
  2. _validate_key() is called with a short timeout and retried once per
     process lifetime if the startup check failed.
  3. Audio cache + ThreadPoolExecutor kept from previous version.
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

# ── FIX 1: Lazy key state — not locked to startup result ─────────────────────
_key_valid     = False       # current known state
_key_checked   = False       # have we succeeded at least once?
_key_lock      = threading.Lock()

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
            print("ElevenLabs: key valid — premium AI voices enabled")
            return True
        else:
            print(f"ElevenLabs: key rejected (status {resp.status_code})")
            return False
    except Exception as e:
        print(f"ElevenLabs: validation error ({e})")
        return False

def _is_key_valid() -> bool:
    """
    Return True if we know the key works.
    If we've never successfully validated, try once more right now.
    This handles Render cold-start where startup check timed out.
    """
    global _key_valid, _key_checked
    if _key_checked:          # already confirmed working at some point
        return _key_valid
    # Haven't confirmed yet — try now (lazy)
    return _validate_key()

# ── Startup validation (best-effort, non-fatal) ───────────────────────────────
def _startup_check():
    _validate_key()

threading.Thread(target=_startup_check, daemon=True).start()


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
    resp = req_lib.post(
        ELEVENLABS_URL.format(voice_id=voice_id),
        json={
            "text":     text,
            "model_id": "eleven_turbo_v2_5",
            "voice_settings": {
                "stability":         0.5,
                "similarity_boost":  0.75,
                "style":             0.0,
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
    print(f"ElevenLabs: HTTP {resp.status_code} — {resp.text[:200]}")
    return None


@elevenlabs_bp.route("/speak", methods=["POST", "OPTIONS"])
def speak():
    if request.method == "OPTIONS":
        return "", 200

    data  = request.get_json() or {}
    text  = (data.get("text") or "").strip()
    voice = data.get("voice_name") or data.get("voice_id") or "EXAVITQu4vr4xnSDxMaL"

    if not text:
        return jsonify({"error": "No text provided"}), 400

    # FIX 1: Lazy re-check instead of hard-fail on startup miss
    if not _is_key_valid():
        return jsonify({"error": "ElevenLabs unavailable — use browser TTS", "fallback": True}), 503

    text = text[:500]
    key  = _cache_key(text, voice)

    cached_audio = _cache_get(key)
    if cached_audio:
        print(f"ElevenLabs: cache hit ({len(text)} chars)")
        return Response(cached_audio, status=200, mimetype="audio/mpeg",
                        headers={"Content-Type": "audio/mpeg", "Cache-Control": "no-cache"})

    try:
        future = _executor.submit(_fetch_tts, text, voice)
        audio  = future.result(timeout=25)

        if audio:
            _cache_set(key, audio)
            print(f"ElevenLabs: spoke {len(text)} chars")
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
    if not _is_key_valid():
        return jsonify({"voices": [], "fallback": True}), 200
    try:
        resp = req_lib.get(
            "https://api.elevenlabs.io/v1/voices",
            headers={"xi-api-key": ELEVENLABS_KEY},
            timeout=10,
        )
        if resp.status_code == 200:
            voices = resp.json().get("voices", [])
            return jsonify({"voices": [{"id": v["voice_id"], "name": v["name"]} for v in voices]})
        return jsonify({"voices": [], "fallback": True}), 200
    except Exception as e:
        return jsonify({"voices": [], "error": str(e)}), 200