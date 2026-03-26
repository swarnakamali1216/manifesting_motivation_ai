"""
backend/routes/realtime.py
Place this file at: backend/routes/realtime.py  (NOT backend/realtime.py)

Open-Meteo weather: FREE, no API key, no signup, no expiry.
GNews news:         FREE, needs one key from gnews.io (100 req/day free)
"""

from flask import Blueprint, request, jsonify
import os
import requests
from datetime import datetime

realtime_bp = Blueprint("realtime", __name__)

GNEWS_KEY = os.environ.get("GNEWS_API_KEY", "")

# Chennai coordinates (hardcoded — your app is for Chennai users)
CHENNAI_LAT = 13.0827
CHENNAI_LON = 80.2707

WEATHER_CODE_MAP = {
    0:"Clear sky", 1:"Mainly clear", 2:"Partly cloudy", 3:"Overcast",
    45:"Foggy", 48:"Foggy", 51:"Light drizzle", 53:"Drizzle", 55:"Heavy drizzle",
    61:"Light rain", 63:"Moderate rain", 65:"Heavy rain",
    71:"Light snow", 73:"Snow", 75:"Heavy snow",
    80:"Rain showers", 81:"Rain showers", 82:"Heavy showers",
    95:"Thunderstorm", 96:"Thunderstorm", 99:"Thunderstorm",
}


@realtime_bp.route("/realtime/weather", methods=["GET"])
def get_weather():
    """
    Calls Open-Meteo — completely free, no API key.
    Returns current Chennai weather.
    """
    lat = float(request.args.get("lat", CHENNAI_LAT))
    lon = float(request.args.get("lon", CHENNAI_LON))

    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,"
            f"weather_code,wind_speed_10m,precipitation"
            f"&timezone=Asia%2FKolkata"
            f"&forecast_days=1"
        )
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        data = resp.json()

        cur        = data.get("current", {})
        temp       = cur.get("temperature_2m")
        feels_like = cur.get("apparent_temperature")
        humidity   = cur.get("relative_humidity_2m")
        wind       = cur.get("wind_speed_10m")
        code       = cur.get("weather_code", 0)
        precip     = cur.get("precipitation", 0)
        condition  = WEATHER_CODE_MAP.get(code, "Clear")

        summary = f"{temp}°C, feels like {feels_like}°C. {condition}. Humidity {humidity}%. Wind {wind} km/h."
        if precip and precip > 0:
            summary += f" Precipitation: {precip}mm."

        return jsonify({
            "temperature":   temp,
            "feels_like":    feels_like,
            "humidity":      humidity,
            "wind_speed":    wind,
            "condition":     condition,
            "weather_code":  code,
            "precipitation": precip,
            "summary":       summary,
            "location":      "Chennai, India",
            "source":        "Open-Meteo (live)",
            "updated_at":    cur.get("time", datetime.now().isoformat()),
        })

    except requests.exceptions.Timeout:
        return jsonify({"error": "Weather API timeout. Try again."}), 504
    except Exception as e:
        print(f"Weather error: {e}")
        return jsonify({"error": str(e)}), 500


@realtime_bp.route("/realtime/news", methods=["GET"])
def get_news():
    """
    Calls GNews API.
    Free key at: https://gnews.io  (100 requests/day free, key never expires)
    Add to .env:  GNEWS_API_KEY=your_key_here
    """
    query   = request.args.get("q", "india")
    n       = int(request.args.get("n", 5))

    if not GNEWS_KEY:
        return jsonify({
            "error":    "GNEWS_API_KEY not set in .env",
            "howtoget": "Go to https://gnews.io → Sign Up Free → Copy your API key → add GNEWS_API_KEY=xxxx to .env",
            "fallback": [
                {"title": "Times of India — India's top news",     "url": "https://timesofindia.com"},
                {"title": "NDTV — Latest India & world news",      "url": "https://ndtv.com"},
                {"title": "The Hindu — Quality journalism",         "url": "https://thehindu.com"},
            ]
        })

    try:
        url = (
            f"https://gnews.io/api/v4/top-headlines"
            f"?token={GNEWS_KEY}"
            f"&lang=en&country=in&max={n}&q={query}"
        )
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data     = resp.json()
        articles = data.get("articles", [])

        news = [{
            "title":       a.get("title", ""),
            "description": a.get("description", ""),
            "url":         a.get("url", ""),
            "source":      a.get("source", {}).get("name", ""),
            "published":   a.get("publishedAt", ""),
        } for a in articles]

        return jsonify({
            "query":    query,
            "articles": news,
            "total":    len(news),
            "source":   "GNews API (live)",
        })

    except Exception as e:
        print(f"News error: {e}")
        return jsonify({"error": str(e)}), 500


@realtime_bp.route("/realtime/status", methods=["GET"])
def status():
    return jsonify({
        "weather": "Open-Meteo — free, no key needed",
        "news":    "GNews configured" if GNEWS_KEY else "GNews — add GNEWS_API_KEY to .env (free at gnews.io)",
        "test_weather": "/api/realtime/weather",
        "test_news":    "/api/realtime/news",
    })