"""
backend/routes/realtime.py
Open-Meteo weather: FREE, no API key, no signup.
GNews news: FREE key from gnews.io (100 req/day free).

Location is dynamic — passed by the frontend as lat/lon.
Default fallback: auto-detected from request or generic India coords.
"""
from flask import Blueprint, request, jsonify
import os, requests
from datetime import datetime

realtime_bp = Blueprint("realtime", __name__)
GNEWS_KEY   = os.environ.get("GNEWS_API_KEY", "")

# Default coordinates — generic India (not city-specific)
DEFAULT_LAT = 20.5937
DEFAULT_LON = 78.9629

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
    GET /api/realtime/weather?lat=XX&lon=YY&location=CityName
    Frontend passes user's coordinates (from browser Geolocation API).
    Falls back to generic India center if not provided.
    """
    lat      = float(request.args.get("lat", DEFAULT_LAT))
    lon      = float(request.args.get("lon", DEFAULT_LON))
    location = request.args.get("location", "Your location")

    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,"
            f"weather_code,wind_speed_10m,precipitation"
            f"&timezone=Asia%2FKolkata&forecast_days=1"
        )
        resp = requests.get(url, timeout=8)
        resp.raise_for_status()
        cur = resp.json().get("current", {})

        temp      = cur.get("temperature_2m")
        feels     = cur.get("apparent_temperature")
        humidity  = cur.get("relative_humidity_2m")
        wind      = cur.get("wind_speed_10m")
        code      = cur.get("weather_code", 0)
        precip    = cur.get("precipitation", 0)
        condition = WEATHER_CODE_MAP.get(code, "Clear")

        summary = f"{temp}°C, feels like {feels}°C. {condition}. Humidity {humidity}%. Wind {wind} km/h."
        if precip and precip > 0:
            summary += f" Rain: {precip}mm."

        return jsonify({
            "temperature": temp, "feels_like": feels, "humidity": humidity,
            "wind_speed": wind, "condition": condition, "weather_code": code,
            "precipitation": precip, "summary": summary,
            "location": location, "source": "Open-Meteo (live)",
            "updated_at": cur.get("time", datetime.now().isoformat()),
        })

    except requests.exceptions.Timeout:
        return jsonify({"error": "Weather API timeout"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@realtime_bp.route("/realtime/news", methods=["GET"])
def get_news():
    query = request.args.get("q", "india motivation")
    n     = int(request.args.get("n", 5))

    if not GNEWS_KEY:
        return jsonify({
            "error": "GNEWS_API_KEY not set in .env",
            "howtoget": "https://gnews.io → Sign Up Free → add GNEWS_API_KEY=xxxx to .env",
            "fallback": [
                {"title": "Times of India", "url": "https://timesofindia.com"},
                {"title": "NDTV",           "url": "https://ndtv.com"},
                {"title": "The Hindu",      "url": "https://thehindu.com"},
            ]
        })

    try:
        url  = f"https://gnews.io/api/v4/top-headlines?token={GNEWS_KEY}&lang=en&country=in&max={n}&q={query}"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        articles = resp.json().get("articles", [])
        return jsonify({
            "query": query,
            "articles": [{"title":a.get("title"),"description":a.get("description"),"url":a.get("url"),"source":a.get("source",{}).get("name"),"published":a.get("publishedAt")} for a in articles],
            "total": len(articles), "source": "GNews API (live)",
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@realtime_bp.route("/realtime/status", methods=["GET"])
def status():
    return jsonify({
        "weather": "Open-Meteo — free, no key needed, location-aware",
        "news":    "GNews configured" if GNEWS_KEY else "Add GNEWS_API_KEY to .env (free at gnews.io)",
        "note":    "Pass ?lat=XX&lon=YY&location=CityName from frontend Geolocation API",
    })