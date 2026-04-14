"""
routes/elevenlabs.py

FIXES APPLIED:
  1. Audio cache — same text+voice no longer calls ElevenLabs twice.
     Cache keyed by hash(text + voice_id), stores raw audio bytes in memory.
     TTL = 1 hour. Max 100 entries (LRU-style eviction by insertion order).
  2. Non-blocking HTTP — req_lib.post now runs in a ThreadPoolExecutor so it
     doesn't block the Flask worker thread while waiting for ElevenLabs.
     (The startup validation req_lib.get is a one-time call — kept as-is.)
"""

from flask import Blueprint, request, jsonify, Response
import os, hashlib, time
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
import requests as req_lib

elevenlabs_bp = Blueprint("elevenlabs", __name__)

ELEVENLABS_KEY = (os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_KEY_TEST") or "").strip()
ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

print(f"ElevenLabs key length={len(ELEVENLABS_KEY)} ends={ELEVENLABS_KEY[-4:] if ELEVENLABS_KEY else 'EMPTY'}")

# ── Startup key validation (one-time blocking call — intentional) ──────────────
_KEY_VALID = False
if ELEVENLABS_KEY and len(ELEVENLABS_KEY) >= 32:
    try:
        _test = req_lib.get(
            "https://api.elevenlabs.io/v1/user",
            headers={"xi-api-key": ELEVENLABS_KEY},
            timeout=8,
        )
        if _test.status_code == 200:
            _KEY_VALID = True
            print("ElevenLabs: key valid — premium AI voices enabled")
        else:
            print(f"ElevenLabs: key rejected (status {_test.status_code}) — browser TTS fallback")
    except Exception as _e:
        print(f"ElevenLabs: could not validate key ({_e}) — will try on first request")
else:
    print(f"ElevenLabs: {'key too short' if ELEVENLABS_KEY else 'no key'} — browser TTS fallback")


# FIX 1: In-memory audio cache — OrderedDict for O(1) LRU eviction
# { cache_key: {"audio": bytes, "ts": epoch_float} }
_audio_cache: OrderedDict = OrderedDict()
_CACHE_MAX    = 100      # max entries before eviction
_CACHE_TTL    = 3600     # seconds (1 hour)

def _cache_key(text: str, voice_id: str) -> str:
    return hashlib.sha256(f"{text}||{voice_id}".encode()).hexdigest()

def _cache_get(key: str):
    entry = _audio_cache.get(key)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
        _audio_cache.move_to_end(key)  # mark as recently used
        return entry["audio"]
    if entry:
        del _audio_cache[key]  # expired
    return None

def _cache_set(key: str, audio: bytes):
    if len(_audio_cache) >= _CACHE_MAX:
        _audio_cache.popitem(last=False)  # evict oldest
    _audio_cache[key] = {"audio": audio, "ts": time.time()}
    _audio_cache.move_to_end(key)


# FIX 2: Thread pool for non-blocking ElevenLabs HTTP calls
_executor = ThreadPoolExecutor(max_workers=4)

def _fetch_tts(text: str, voice_id: str) -> bytes | None:
    """Blocking ElevenLabs POST — runs in executor thread, not Flask worker."""
    resp = req_lib.post(
        ELEVENLABS_URL.format(voice_id=voice_id),
        json={
            "text":     text,
            "model_id": "eleven_monolingual_v1",
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
    print(f"ElevenLabs: HTTP {resp.status_code}")
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

    if not _KEY_VALID:
        return jsonify({"error": "ElevenLabs unavailable — use browser TTS", "fallback": True}), 503

    text = text[:500]
    key  = _cache_key(text, voice)

    # FIX 1: Return cached audio if available
    cached_audio = _cache_get(key)
    if cached_audio:
        print(f"ElevenLabs: cache hit ({len(text)} chars)")
        return Response(cached_audio, status=200, mimetype="audio/mpeg",
                        headers={"Content-Type": "audio/mpeg", "Cache-Control": "no-cache"})

    try:
        # FIX 2: Run blocking HTTP call in executor so Flask thread is not held
        future = _executor.submit(_fetch_tts, text, voice)
        audio  = future.result(timeout=25)  # wait up to 25s

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
    if not _KEY_VALID:
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