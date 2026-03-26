"""
models.py — CLEAN VERSION
Place at: backend/models.py
Run ONCE after replacing: python -c "from models import init_db; init_db()"
"""
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/manifesting_motivation")

engine       = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(bind=engine)
Base         = declarative_base()

# ─────────────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String(100))
    email          = Column(String(200), unique=True, index=True)
    password_hash  = Column(String(200), nullable=True)
    role           = Column(String(20), default="user")
    google_id      = Column(String(200), nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

class MotivationSession(Base):
    __tablename__ = "motivation_sessions"
    id             = Column(Integer, primary_key=True)
    user_id        = Column(Integer, ForeignKey("users.id"))
    user_input     = Column(Text)
    ai_response    = Column(Text)
    emotion        = Column(String(50), default="neutral")
    vader_score    = Column(Float,   default=0.0)
    input_type     = Column(String(20), default="text")
    is_crisis      = Column(Boolean, default=False)
    persona        = Column(String(50), default="gentle")
    created_at     = Column(DateTime, default=datetime.utcnow)

class Goal(Base):
    __tablename__ = "goals"
    id             = Column(Integer, primary_key=True)
    user_id        = Column(Integer, ForeignKey("users.id"))
    title          = Column(String(300))
    category       = Column(String(50), default="general")
    deadline       = Column(String(50), nullable=True)
    completed      = Column(Boolean, default=False)
    roadmap        = Column(Text, nullable=True)          # JSON list of steps
    interview_data = Column(Text, nullable=True)          # JSON prefs
    num_steps      = Column(Integer, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

class GoalStep(Base):
    __tablename__ = "goal_steps"
    id             = Column(Integer, primary_key=True)
    goal_id        = Column(Integer, ForeignKey("goals.id"))
    user_id        = Column(Integer, ForeignKey("users.id"))
    step_index     = Column(Integer, default=0)
    title          = Column(String(300))
    description    = Column(Text, nullable=True)
    proof_question = Column(Text, nullable=True)
    status         = Column(String(20), default="locked")   # locked/active/done/skipped/failed
    proof_answer   = Column(Text, nullable=True)
    completed_at   = Column(DateTime, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

class JournalEntry(Base):
    __tablename__ = "journal_entries"
    id             = Column(Integer, primary_key=True)
    user_id        = Column(Integer, ForeignKey("users.id"))
    content        = Column(Text)                           # AES-256 encrypted
    ai_insight     = Column(Text, nullable=True)
    mood           = Column(String(50), default="neutral")
    vader_score    = Column(Float, default=0.0)
    created_at     = Column(DateTime, default=datetime.utcnow)

class AIMemory(Base):
    __tablename__ = "ai_memory"
    id             = Column(Integer, primary_key=True)
    user_id        = Column(Integer, ForeignKey("users.id"), unique=True)
    memory_text    = Column(Text, default="")              # ChromaDB-synced summary
    session_count  = Column(Integer, default=0)
    last_emotion   = Column(String(50), default="neutral")
    updated_at     = Column(DateTime, default=datetime.utcnow)

# ── ONE CheckIn class — NO DUPLICATE ─────────────────────────────────────────
class CheckIn(Base):
    __tablename__ = "check_ins"
    id             = Column(Integer, primary_key=True)
    user_id        = Column(Integer, ForeignKey("users.id"))
    mood           = Column(String(50), default="neutral")
    note           = Column(Text, default="")
    ai_reply       = Column(Text, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)

class UserProfile(Base):
    __tablename__ = "user_profiles"
    id             = Column(Integer, primary_key=True)
    user_id        = Column(Integer, ForeignKey("users.id"), unique=True)
    xp             = Column(Integer, default=0)
    level          = Column(Integer, default=1)
    streak         = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_session   = Column(DateTime, nullable=True)
    badges         = Column(Text, default="[]")             # JSON list
    updated_at     = Column(DateTime, default=datetime.utcnow)

class SpacedRepetition(Base):
    __tablename__ = "spaced_repetition"
    id             = Column(Integer, primary_key=True)
    user_id        = Column(Integer, ForeignKey("users.id"))
    goal_id        = Column(Integer, ForeignKey("goals.id"), nullable=True)
    content        = Column(Text)
    next_review    = Column(DateTime, default=datetime.utcnow)
    interval_days  = Column(Integer, default=1)
    ease_factor    = Column(Float, default=2.5)
    repetitions    = Column(Integer, default=0)
    created_at     = Column(DateTime, default=datetime.utcnow)

def init_db():
    """Create all tables that don't exist yet. Safe to run multiple times."""
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created / verified")