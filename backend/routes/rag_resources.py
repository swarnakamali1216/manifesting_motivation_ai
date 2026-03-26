"""
rag_resources.py — RAG Resource Broker using ChromaDB
Place in: backend/routes/rag_resources.py

Install dependencies:
    pip install chromadb sentence-transformers

How it works:
1. A curated resource library is embedded into ChromaDB on startup
2. When user requests resources for a goal, we:
   - Embed the goal + learning style as a query
   - ChromaDB finds semantically similar resources
   - Return top matches filtered by level
"""

from flask import Blueprint, request, jsonify
import os, json

rag_bp = Blueprint("rag", __name__)

# ── Try to import ChromaDB ─────────────────────────────────────────────────────
try:
    import chromadb
    from chromadb.utils import embedding_functions
    CHROMA_OK = True
except ImportError:
    CHROMA_OK = False
    print("⚠️  ChromaDB not installed — using fallback mode. Run: pip install chromadb")

# ── Curated Resource Library ───────────────────────────────────────────────────
# Each resource has: id, title, url, topic, level, style, description
RESOURCES = [
    # Python
    {"id":"py1","topic":"python","level":"beginner","style":"visual","title":"Python for Beginners - Full Course","url":"https://www.youtube.com/watch?v=eWRyvpOLPSo","desc":"Complete Python beginner course with visual examples and projects"},
    {"id":"py2","topic":"python","level":"beginner","style":"reading","title":"Python Official Tutorial","url":"https://docs.python.org/3/tutorial/","desc":"Official Python documentation tutorial for beginners"},
    {"id":"py3","topic":"python","level":"beginner","style":"hands-on","title":"Codecademy Python Course","url":"https://www.codecademy.com/learn/learn-python-3","desc":"Interactive hands-on Python learning with instant feedback"},
    {"id":"py4","topic":"python","level":"intermediate","style":"visual","title":"Intermediate Python - Socratica","url":"https://www.youtube.com/playlist?list=PLi01XoE8jYohWFPpC17Z-wWhPOSuh8Er-","desc":"Clear visual explanations of intermediate Python concepts"},
    {"id":"py5","topic":"python","level":"intermediate","style":"hands-on","title":"HackerRank Python Challenges","url":"https://www.hackerrank.com/domains/python","desc":"Practice Python with real coding challenges"},
    {"id":"py6","topic":"python","level":"advanced","style":"reading","title":"Fluent Python Book","url":"https://www.oreilly.com/library/view/fluent-python-2nd/9781492056348/","desc":"Deep dive into advanced Python idioms and patterns"},

    # Web Development
    {"id":"web1","topic":"web development","level":"beginner","style":"visual","title":"The Odin Project","url":"https://www.theodinproject.com","desc":"Free full-stack web development curriculum with visual guides"},
    {"id":"web2","topic":"web development","level":"beginner","style":"hands-on","title":"freeCodeCamp Web Dev","url":"https://www.freecodecamp.org","desc":"Free interactive web development certifications"},
    {"id":"web3","topic":"web development","level":"intermediate","style":"visual","title":"Traversy Media - React Course","url":"https://www.youtube.com/c/TraversyMedia","desc":"Visual React and modern JavaScript tutorials"},
    {"id":"web4","topic":"react","level":"beginner","style":"hands-on","title":"React Official Tutorial","url":"https://react.dev/learn","desc":"Hands-on interactive React tutorial from the official docs"},
    {"id":"web5","topic":"react","level":"intermediate","style":"visual","title":"Scrimba React Course","url":"https://scrimba.com/learn/learnreact","desc":"Interactive visual React course with live coding"},

    # Machine Learning / AI
    {"id":"ml1","topic":"machine learning","level":"beginner","style":"visual","title":"3Blue1Brown Neural Networks","url":"https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi","desc":"Beautiful visual explanations of neural networks"},
    {"id":"ml2","topic":"machine learning","level":"beginner","style":"hands-on","title":"Kaggle ML Courses","url":"https://www.kaggle.com/learn","desc":"Free hands-on machine learning courses with notebooks"},
    {"id":"ml3","topic":"machine learning","level":"beginner","style":"reading","title":"Machine Learning Crash Course - Google","url":"https://developers.google.com/machine-learning/crash-course","desc":"Google's free ML crash course with reading material"},
    {"id":"ml4","topic":"machine learning","level":"intermediate","style":"hands-on","title":"Fast.ai Practical Deep Learning","url":"https://course.fast.ai","desc":"Top-down practical deep learning course"},
    {"id":"ml5","topic":"ai","level":"beginner","style":"visual","title":"Andrew Ng Machine Learning Specialization","url":"https://www.coursera.org/specializations/machine-learning-introduction","desc":"World's best ML course, visual and structured"},

    # Data Science
    {"id":"ds1","topic":"data science","level":"beginner","style":"hands-on","title":"Pandas Tutorial - Kaggle","url":"https://www.kaggle.com/learn/pandas","desc":"Hands-on data manipulation with pandas"},
    {"id":"ds2","topic":"data science","level":"beginner","style":"visual","title":"Data Science Full Course - Simplilearn","url":"https://www.youtube.com/watch?v=ua-CiDNNj30","desc":"Complete visual data science course for beginners"},
    {"id":"ds3","topic":"data science","level":"intermediate","style":"reading","title":"Python Data Science Handbook","url":"https://jakevdp.github.io/PythonDataScienceHandbook/","desc":"Free online book covering numpy, pandas, matplotlib, sklearn"},

    # Fitness / Health
    {"id":"fit1","topic":"fitness","level":"beginner","style":"visual","title":"Jeff Nippard - Beginner Gym Program","url":"https://www.youtube.com/c/JeffNippard","desc":"Science-based visual fitness training guides"},
    {"id":"fit2","topic":"fitness","level":"beginner","style":"hands-on","title":"Nike Training Club App","url":"https://www.nike.com/ntc-app","desc":"Free guided workout app with structured programs"},
    {"id":"fit3","topic":"fitness","level":"intermediate","style":"reading","title":"Starting Strength Book","url":"https://startingstrength.com","desc":"The definitive strength training guide"},

    # Language Learning
    {"id":"lang1","topic":"language learning","level":"beginner","style":"visual","title":"Dreaming Spanish","url":"https://www.dreamingspanish.com","desc":"Comprehensible input method with visual storytelling"},
    {"id":"lang2","topic":"language learning","level":"beginner","style":"hands-on","title":"Duolingo","url":"https://www.duolingo.com","desc":"Gamified interactive language learning"},
    {"id":"lang3","topic":"language learning","level":"intermediate","style":"reading","title":"Language Transfer","url":"https://www.languagetransfer.org","desc":"Free structured language courses based on transfer method"},

    # Finance / Career
    {"id":"fin1","topic":"finance","level":"beginner","style":"visual","title":"Andrei Jikh - Personal Finance","url":"https://www.youtube.com/c/AndreiJikh","desc":"Visual personal finance and investing guides"},
    {"id":"fin2","topic":"finance","level":"beginner","style":"reading","title":"Investopedia Financial Education","url":"https://www.investopedia.com/financial-term-dictionary-4769738","desc":"Comprehensive finance reading resource"},
    {"id":"career1","topic":"career","level":"beginner","style":"hands-on","title":"LinkedIn Learning","url":"https://www.linkedin.com/learning","desc":"Professional skills courses with hands-on practice"},
    {"id":"career2","topic":"career","level":"intermediate","style":"reading","title":"Harvard Business Review","url":"https://hbr.org","desc":"In-depth career and leadership reading material"},

    # Productivity / Habits
    {"id":"prod1","topic":"productivity","level":"beginner","style":"visual","title":"Thomas Frank - Study & Productivity","url":"https://www.youtube.com/c/Thomasfrank","desc":"Visual productivity and study technique videos"},
    {"id":"prod2","topic":"habits","level":"beginner","style":"reading","title":"Atomic Habits Summary","url":"https://jamesclear.com/atomic-habits","desc":"James Clear's proven habit building framework"},
    {"id":"prod3","topic":"habits","level":"beginner","style":"hands-on","title":"Habitica - Gamified Habits","url":"https://habitica.com","desc":"Gamified habit tracking app with rewards"},

    # Mindfulness / Mental Health
    {"id":"mind1","topic":"mindfulness","level":"beginner","style":"hands-on","title":"Headspace App","url":"https://www.headspace.com","desc":"Guided meditation and mindfulness practice"},
    {"id":"mind2","topic":"mindfulness","level":"beginner","style":"visual","title":"Calm Masterclass","url":"https://www.calm.com","desc":"Visual mindfulness and sleep improvement program"},
]

# ── ChromaDB setup ─────────────────────────────────────────────────────────────
_chroma_client     = None
_chroma_collection = None

def _init_chromadb():
    """Initialize ChromaDB with resource embeddings."""
    global _chroma_client, _chroma_collection

    if not CHROMA_OK:
        return False

    try:
        # Use persistent local storage
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "chroma_db")
        _chroma_client = chromadb.PersistentClient(path=db_path)

        # Use sentence-transformers for embeddings
        try:
            ef = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="all-MiniLM-L6-v2"
            )
        except Exception:
            ef = embedding_functions.DefaultEmbeddingFunction()

        # Get or create collection
        _chroma_collection = _chroma_client.get_or_create_collection(
            name="resources",
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"}
        )

        # Seed collection if empty
        if _chroma_collection.count() == 0:
            print("🧠 Seeding ChromaDB with resource library...")
            _chroma_collection.add(
                ids       = [r["id"] for r in RESOURCES],
                documents = [f"{r['topic']} {r['level']} {r['style']} {r['title']} {r['desc']}" for r in RESOURCES],
                metadatas = [{"topic": r["topic"], "level": r["level"], "style": r["style"], "title": r["title"], "url": r["url"], "desc": r["desc"]} for r in RESOURCES],
            )
            print(f"✅ ChromaDB seeded with {len(RESOURCES)} resources!")

        return True

    except Exception as e:
        print(f"⚠️  ChromaDB init error: {e}")
        return False

# Initialize on import
_chroma_ready = _init_chromadb()

# ── Fallback search (no ChromaDB) ──────────────────────────────────────────────
def _fallback_search(goal: str, level: str, style: str, n: int = 3) -> list:
    """Simple keyword fallback when ChromaDB unavailable."""
    goal_lower = goal.lower()
    scored = []

    for r in RESOURCES:
        score = 0
        # Topic match
        if r["topic"] in goal_lower or any(w in goal_lower for w in r["topic"].split()):
            score += 3
        # Level match
        if r["level"] == level:
            score += 2
        # Style match
        if r["style"] == style:
            score += 2
        # Keyword in title/desc
        for word in goal_lower.split():
            if len(word) > 3 and (word in r["title"].lower() or word in r["desc"].lower()):
                score += 1
        if score > 0:
            scored.append((score, r))

    scored.sort(key=lambda x: -x[0])
    return [r for _, r in scored[:n]]

# ── POST /api/rag/resources ────────────────────────────────────────────────────
@rag_bp.route("/rag/resources", methods=["POST"])
def get_resources():
    """
    Get personalized learning resources for a goal.
    Body: { goal_title, learning_style, level, user_id }
    """
    data          = request.get_json() or {}
    goal_title    = data.get("goal_title", "")
    learning_style = data.get("learning_style", "visual")   # visual/reading/hands-on
    level         = data.get("level", "beginner")            # beginner/intermediate/advanced
    n_results     = data.get("n", 3)

    if not goal_title:
        return jsonify({"error": "goal_title required"}), 400

    # Normalize inputs
    level  = level.lower()  if level  in ["beginner","intermediate","advanced"] else "beginner"
    style  = learning_style.lower() if learning_style in ["visual","reading","hands-on"] else "visual"
    query  = f"{goal_title} {level} {style} learning resources"

    resources = []

    # ── Try ChromaDB first ─────────────────────────────────────────────────────
    if _chroma_ready and _chroma_collection:
        try:
            results = _chroma_collection.query(
                query_texts=[query],
                n_results=min(n_results + 2, 10),
                where={"level": level} if level != "beginner" else None,
            )
            metas = results.get("metadatas", [[]])[0]
            dists = results.get("distances", [[]])[0]

            for i, meta in enumerate(metas[:n_results]):
                similarity = round((1 - dists[i]) * 100, 1) if dists else 0
                resources.append({
                    "title":      meta.get("title"),
                    "url":        meta.get("url"),
                    "description": meta.get("desc"),
                    "level":      meta.get("level"),
                    "style":      meta.get("style"),
                    "relevance":  f"{similarity}%",
                    "source":     "ChromaDB RAG",
                })

            print(f"✅ ChromaDB returned {len(resources)} resources for: {goal_title}")

        except Exception as e:
            print(f"ChromaDB query error: {e} — falling back")
            resources = []

    # ── Fallback if ChromaDB failed ────────────────────────────────────────────
    if not resources:
        fallback = _fallback_search(goal_title, level, style, n_results)
        resources = [{
            "title":       r["title"],
            "url":         r["url"],
            "description": r["desc"],
            "level":       r["level"],
            "style":       r["style"],
            "relevance":   "keyword match",
            "source":      "fallback",
        } for r in fallback]
        print(f"⚠️  Using fallback for: {goal_title} — {len(resources)} results")

    return jsonify({
        "goal":      goal_title,
        "level":     level,
        "style":     style,
        "resources": resources,
        "engine":    "ChromaDB RAG" if _chroma_ready else "keyword fallback",
        "total":     len(resources),
    })

# ── GET /api/rag/status ────────────────────────────────────────────────────────
@rag_bp.route("/rag/status", methods=["GET"])
def rag_status():
    """Check RAG system status — good for viva demo!"""
    count = _chroma_collection.count() if _chroma_collection else 0
    return jsonify({
        "chromadb_ready":   _chroma_ready,
        "resources_indexed": count,
        "embedding_model":  "all-MiniLM-L6-v2",
        "search_type":      "semantic similarity (cosine)",
        "fallback_ready":   True,
        "total_library":    len(RESOURCES),
    })

# ── POST /api/rag/seed ────────────────────────────────────────────────────────
@rag_bp.route("/rag/seed", methods=["POST"])
def reseed():
    """Re-seed ChromaDB — call if collection is empty."""
    global _chroma_ready
    _chroma_ready = _init_chromadb()
    count = _chroma_collection.count() if _chroma_collection else 0
    return jsonify({"seeded": _chroma_ready, "count": count})