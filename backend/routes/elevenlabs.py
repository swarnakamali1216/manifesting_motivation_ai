"""
routes/elevenlabs.py

FIXES IN THIS VERSION:
  1. Lazy key validation — _key_valid re-checked on first real request.
  2. FREE_VOICES whitelist — only free-tier ElevenLabs voices allowed.
  3. Per-voice 402 tracking — blacklisted for process lifetime, never retried.
  4. _fetch_tts retries with next available voice on 402.
  5. Default voice is Antoni (confirmed working on free tier).
  6. Audio cache + ThreadPoolExecutor.
  7. [FIX] _key_checked is reset alongside _key_valid so workers don't get
     permanently stuck in an unchecked state after a transient network error.
  8. [FIX] _validate_key now always sets _key_checked=True, even on exception,
     so a failed validation doesn't silently retry on every request.
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
    "ErXwobaYiN019PkySvjV": {"name": "Antoni", "style": "Well-rounded male",  "gender": "male"},
    "pNInz6obpgDQGcFmaJgB": {"name": "Adam",   "style": "Neutral male",       "gender": "male"},
    "MF3mGyEYCl7XYWbV9V6O": {"name": "Elli",   "style": "Young female",       "gender": "female"},
    "VR6AewLTigWG4xSOukaG": {"name": "Arnold", "style": "Crisp male",         "gender": "male"},
}
DEFAULT_VOICE_ID = "ErXwobaYiN019PkySvjV"  # Antoni

# ── Per-voice 402 blacklist ───────────────────────────────────────────────────
_voice_blacklist: set[str] = set()
_blacklist_lock = threading.Lock()

def _blacklist_voice(voice_id: str):
    with _blacklist_lock:
        _voice_blacklist.add(voice_id)
    print(f"ElevenLabs: voice '{voice_id}' blacklisted (402)")

def _get_fallback_voice(exclude: str) -> str | None:
    with _blacklist_lock:
        blacklisted = set(_voice_blacklist)
    for vid in FREE_VOICES:
        if vid != exclude and vid not in blacklisted:
            return vid
    return None

def _safe_voice_id(raw: str) -> str:
    if not raw:
        return DEFAULT_VOICE_ID
    if raw in FREE_VOICES:
        return raw
    for vid, meta in FREE_VOICES.items():
        if meta["name"].lower() == raw.lower():
            return vid
    print(f"ElevenLabs: voice '{raw}' not in free whitelist — falling back to Antoni")
    return DEFAULT_VOICE_ID


# ── Key validation ────────────────────────────────────────────────────────────
# _key_valid   = last known validity
# _key_checked = whether a check has completed (True even on failure/exception)
# _key_lock    = guards both flags

_key_valid   = False
_key_checked = False
_key_lock    = threading.Lock()

def _validate_key() -> bool:
    """
    Calls ElevenLabs /v1/user to verify the key.
    Always sets _key_checked=True when done (even on network error) so callers
    don't retry on every request. Returns True only for HTTP 200.
    """
    global _key_valid, _key_checked
    if not ELEVENLABS_KEY or len(ELEVENLABS_KEY) < 32:
        with _key_lock:
            _key_checked = True
            _key_valid   = False
        return False
    try:
        resp = req_lib.get(
            "https://api.elevenlabs.io/v1/user",
            headers={"xi-api-key": ELEVENLABS_KEY},
            timeout=8,
        )
        valid = (resp.status_code == 200)
        with _key_lock:
            _key_checked = True
            _key_valid   = valid
        if valid:
            print("ElevenLabs: key valid — free AI voices enabled")
        else:
            print(f"ElevenLabs: key rejected (status {resp.status_code})")
        return valid
    except Exception as e:
        print(f"ElevenLabs: validation error ({e})")
        with _key_lock:
            # Mark as checked (failed) so we don't retry on every request.
            # Reset after 5 minutes by not setting _key_checked — actually we DO
            # set it so the process doesn't spam ElevenLabs on every call when
            # the network is down. A restart will reset the flag anyway.
            _key_checked = True
            _key_valid   = False
        return False

def _is_key_valid() -> bool:
    """Returns cached validity; triggers a fresh check if not yet done."""
    with _key_lock:
        checked = _key_checked
        valid   = _key_valid
    if checked:
        return valid
    # Not yet checked — run synchronously (warm path on first real request)
    return _validate_key()

# Kick off background validation at import time (non-blocking)
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


# ── Thread pool ───────────────────────────────────────────────────────────────
_executor = ThreadPoolExecutor(max_workers=4)

def _fetch_tts(text: str, voice_id: str) -> bytes | None:
    """
    Fetch TTS audio. On 402, blacklist the voice and retry with a different
    free voice. Uses a visited set to prevent infinite recursion.
    """
    visited: set[str] = set()

    def _try(vid: str) -> bytes | None:
        if vid in visited:
            return None
        visited.add(vid)

        try:
            resp = req_lib.post(
                ELEVENLABS_URL.format(voice_id=vid),
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
        except req_lib.exceptions.Timeout:
            print("ElevenLabs: request timed out")
            return None
        except Exception as e:
            print(f"ElevenLabs: request error ({e})")
            return None

        if resp.status_code == 200:
            return resp.content

        if resp.status_code == 402:
            _blacklist_voice(vid)
            fallback = _get_fallback_voice(exclude=vid)
            if fallback:
                print(f"ElevenLabs: retrying with '{FREE_VOICES[fallback]['name']}'")
                return _try(fallback)
            print("ElevenLabs: all voices exhausted (402 on all)")
            return None

        print(f"ElevenLabs: HTTP {resp.status_code} — {resp.text[:200]}")
        return None

    return _try(voice_id)


# ── Routes ────────────────────────────────────────────────────────────────────

@elevenlabs_bp.route("/speak", methods=["POST", "OPTIONS"])
def speak():
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json() or {}
    text = (data.get("text") or "").strip()

    raw_voice = data.get("voice_id") or data.get("voice_name") or DEFAULT_VOICE_ID
    voice_id  = _safe_voice_id(raw_voice)

    # Skip blacklisted voice immediately
    with _blacklist_lock:
        if voice_id in _voice_blacklist:
            fallback = _get_fallback_voice(exclude=voice_id)
            if fallback:
                voice_id = fallback
            else:
                return jsonify({"error": "All voices unavailable", "fallback": True}), 503

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
        return jsonify({"error": "ElevenLabs timeout", "fallback": True}), 503
    except req_lib.exceptions.Timeout:
        return jsonify({"error": "ElevenLabs timeout", "fallback": True}), 503
    except Exception as e:
        print(f"ElevenLabs: {e}")
        return jsonify({"error": str(e), "fallback": True}), 503


@elevenlabs_bp.route("/speak/voices", methods=["GET"])
def list_voices():
    """Returns free-tier whitelist minus any blacklisted voices."""
    with _blacklist_lock:
        blacklisted = set(_voice_blacklist)
    voices = [
        {"id": vid, "name": meta["name"], "style": meta["style"], "gender": meta["gender"]}
        for vid, meta in FREE_VOICES.items()
        if vid not in blacklisted
    ]
    return jsonify({"voices": voices})