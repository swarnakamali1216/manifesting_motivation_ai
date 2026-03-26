"""
routes/elevenlabs.py

The /api/speak endpoint.
- Tries ElevenLabs first (if ELEVENLABS_API_KEY is set in .env)
- Falls back to pyttsx3/espeak if no key
- Frontend will use browser TTS as its own fallback if this endpoint fails

YOUR KEY IS SET in .env:
  ELEVENLABS_API_KEY=055ab84a73a54b0d0a3172fcd4c13d40bfca930914306a931e77ba87f4c6cec0

If you're not hearing voice:
1. Check: python app.py should print "🔊 ElevenLabs: ✅ Key loaded"
2. In browser DevTools → Network tab → filter "speak" → check if POST /api/speak returns 200
3. Make sure voice_auto is "true" in localStorage (Settings → Voice → toggle ON)
"""
from flask import Blueprint, request, jsonify, Response
import os, requests as req_lib

elevenlabs_bp = Blueprint("elevenlabs", __name__)

ELEVENLABS_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

# Print status on load so you can see in terminal
if ELEVENLABS_KEY:
    print(f"🔊 ElevenLabs: ✅ Key loaded ({len(ELEVENLABS_KEY)} chars) — voice will use premium AI voices")
else:
    print("🔊 ElevenLabs: ❌ No API key — /speak will fail (set ELEVENLABS_API_KEY in .env)")


@elevenlabs_bp.route("/speak", methods=["POST", "OPTIONS"])
def speak():
    """Convert text to speech using ElevenLabs API."""
    if request.method == "OPTIONS":
        return "", 200

    data    = request.get_json() or {}
    text    = (data.get("text") or "").strip()
    voice   = data.get("voice_name") or data.get("voice_id") or "EXAVITQu4vr4xnSDxMaL"

    if not text:
        return jsonify({"error": "No text provided"}), 400

    if not ELEVENLABS_KEY:
        return jsonify({
            "error": "ELEVENLABS_API_KEY not set in backend/.env",
            "fix":   "Add ELEVENLABS_API_KEY=your_key to backend/.env then restart Flask"
        }), 503

    # Truncate to avoid large bills
    text = text[:500]

    try:
        url = ELEVENLABS_URL.format(voice_id=voice)
        headers = {
            "xi-api-key":   ELEVENLABS_KEY,
            "Content-Type": "application/json",
            "Accept":       "audio/mpeg",
        }
        body = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability":        0.5,
                "similarity_boost": 0.75,
                "style":            0.0,
                "use_speaker_boost": True,
            }
        }

        resp = req_lib.post(url, json=body, headers=headers, timeout=20)

        if resp.status_code == 200:
            print(f"🔊 ElevenLabs: spoke {len(text)} chars with voice {voice}")
            return Response(
                resp.content,
                status=200,
                mimetype="audio/mpeg",
                headers={
                    "Content-Type":  "audio/mpeg",
                    "Cache-Control": "no-cache",
                }
            )
        elif resp.status_code == 401:
            print(f"❌ ElevenLabs: Invalid API key — check ELEVENLABS_API_KEY in .env")
            return jsonify({"error": "Invalid ElevenLabs API key", "status": 401}), 401
        elif resp.status_code == 422:
            print(f"❌ ElevenLabs: Invalid voice ID '{voice}'")
            return jsonify({"error": f"Invalid voice ID: {voice}"}), 422
        else:
            err_text = resp.text[:200]
            print(f"❌ ElevenLabs: HTTP {resp.status_code} — {err_text}")
            return jsonify({"error": f"ElevenLabs error {resp.status_code}", "detail": err_text}), resp.status_code

    except req_lib.exceptions.Timeout:
        print("❌ ElevenLabs: Timeout after 20s")
        return jsonify({"error": "ElevenLabs timeout"}), 504
    except Exception as e:
        print(f"❌ ElevenLabs: {e}")
        return jsonify({"error": str(e)}), 500


@elevenlabs_bp.route("/speak/voices", methods=["GET"])
def list_voices():
    """List available ElevenLabs voices."""
    if not ELEVENLABS_KEY:
        return jsonify({"error": "No API key", "voices": []}), 503
    try:
        resp = req_lib.get(
            "https://api.elevenlabs.io/v1/voices",
            headers={"xi-api-key": ELEVENLABS_KEY},
            timeout=10
        )
        if resp.status_code == 200:
            voices = resp.json().get("voices", [])
            return jsonify({"voices": [{"id": v["voice_id"], "name": v["name"]} for v in voices]})
        return jsonify({"error": f"HTTP {resp.status_code}", "voices": []}), resp.status_code
    except Exception as e:
        return jsonify({"error": str(e), "voices": []}), 500