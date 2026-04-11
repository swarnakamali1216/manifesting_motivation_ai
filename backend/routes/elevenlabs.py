"""
routes/elevenlabs.py
- Tries ElevenLabs if key is valid
- Returns 503 with fallback:true if key is missing/invalid
- Frontend catches this and uses browser TTS automatically
- No more 401 errors in console
"""
from flask import Blueprint, request, jsonify, Response
import os, requests as req_lib

elevenlabs_bp = Blueprint("elevenlabs", __name__)


ELEVENLABS_KEY = (os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("ELEVEN_KEY_TEST") or "").strip()
ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

# Validate key on startup
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
            print(f"🔊 ElevenLabs: ✅ Key valid — premium AI voices enabled")
        else:
            print(f"🔊 ElevenLabs: ❌ Key rejected by ElevenLabs (status {_test.status_code}) — falling back to browser TTS")
    except Exception as _e:
        print(f"🔊 ElevenLabs: ⚠️ Could not validate key ({_e}) — will try on first request")
else:
    if ELEVENLABS_KEY:
        print(f"🔊 ElevenLabs: ❌ Key too short ({len(ELEVENLABS_KEY)}) — browser TTS fallback active")
    else:
        print("🔊 ElevenLabs: ❌ No API key set — browser TTS fallback active")


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
        return jsonify({
            "error":    "ElevenLabs unavailable — use browser TTS",
            "fallback": True,
        }), 503

    text = text[:500]

    try:
        resp = req_lib.post(
            ELEVENLABS_URL.format(voice_id=voice),
            json={
                "text":     text,
                "model_id": "eleven_monolingual_v1",
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
            print(f"🔊 ElevenLabs: spoke {len(text)} chars")
            return Response(
                resp.content,
                status=200,
                mimetype="audio/mpeg",
                headers={"Content-Type": "audio/mpeg", "Cache-Control": "no-cache"},
            )

        print(f"❌ ElevenLabs: HTTP {resp.status_code}")
        return jsonify({"error": f"ElevenLabs error {resp.status_code}", "fallback": True}), 503

    except req_lib.exceptions.Timeout:
        print("❌ ElevenLabs: Timeout")
        return jsonify({"error": "ElevenLabs timeout", "fallback": True}), 503
    except Exception as e:
        print(f"❌ ElevenLabs: {e}")
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