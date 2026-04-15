"""
gunicorn.conf.py — Production server config for Manifesting Motivation AI.

HOW TO RUN:
  pip install gunicorn
  gunicorn -c gunicorn.conf.py app:app

WHY GUNICORN INSTEAD OF flask run / python app.py:
  - Flask's built-in server handles ONE request at a time.
    If User A is waiting for Groq (1-2s), User B is completely blocked.
  - Gunicorn spawns multiple worker processes, each handling requests
    independently. With 4 CPU cores you get ~9 workers × 2 threads = 18
    concurrent requests with no blocking between users.

WORKER MATH:
  workers = (CPU cores × 2) + 1
  For 2-core VPS  → 5 workers
  For 4-core VPS  → 9 workers
  For 8-core VPS  → 17 workers
  Each worker also runs 2 threads (for I/O-heavy Groq API calls).
"""

import multiprocessing
import os

# ---------------------------------------------------------------------------
# Core settings
# ---------------------------------------------------------------------------
bind            = "0.0.0.0:5000"
workers         = multiprocessing.cpu_count() * 2 + 1
threads         = 2                  # threads per worker (good for API I/O)
worker_class    = "gthread"          # threaded workers — best for Groq API calls
timeout         = 120                # kill worker if silent for 2min (Groq can be slow)
graceful_timeout = 30               # time to finish in-flight requests on restart
keepalive       = 5                  # keep HTTP connection open for 5s after response

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
accesslog       = "-"               # stdout
errorlog        = "-"               # stderr
loglevel        = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s "%(r)s" %(s)s %(b)s %(D)sµs'

# ---------------------------------------------------------------------------
# Lifecycle hooks — warm up Groq in EVERY worker after forking
# ---------------------------------------------------------------------------
def post_fork(server, worker):
    """
    Called inside each worker process right after it forks from the master.
    This is the correct place to warm up connections — each worker gets
    its own TCP pool, so each one needs its own warmup call.
    """
    import time
    time.sleep(0.5 * (worker.age % 3))  # stagger warmups so they don't all hit Groq at once

    try:
        from groq_client import warmup_groq
        success = warmup_groq()
        if success:
            print(f"🔥 Worker {worker.pid} — Groq connection ready")
        else:
            print(f"⚠️  Worker {worker.pid} — Groq warmup skipped, will retry on first request")
    except Exception as e:
        print(f"⚠️  Worker {worker.pid} warmup error: {e}")


def on_starting(server):
    """Called once when Gunicorn master process starts."""
    print("""
=======================================================
  🦋  Manifesting Motivation AI — Production Mode
  🔧  Workers:  {} × 2 threads
  🌐  Binding:  {}
  ⚡  Mode:     gthread (async-safe for Groq I/O)
=======================================================
""".format(workers, bind))


def worker_exit(server, worker):
    """Clean up the shared Groq HTTP client when a worker exits."""
    try:
        from groq_client import _groq_client
        if _groq_client and hasattr(_groq_client, '_client'):
            _groq_client._client.close()
    except Exception:
        pass