"""
models.py — COMPLETE VERSION with ALL columns used by routes
Place at: backend/models.py
Run ONCE: python -c "from models import init_db; init_db()"

SAFE to run on existing DB — create_all() only adds missing tables, 
it does NOT drop or modify existing columns.
For adding columns to EXISTING tables run the ALTER TABLE statements below.
"""
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/manifesting_motivation"
)

engine       = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(bind=engine)
Base         = declarative_base()

# ─────────────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(100))
    email           = Column(String(200), unique=True, index=True)
    password_hash   = Column(String(200), nullable=True)
    role            = Column(String(20),  default="user")
    google_id       = Column(String(200), nullable=True)
    is_active       = Column(Boolean,     default=True)
    # ── gamification (stored directly on users — no separate table needed) ──
    xp              = Column(Integer,     default=0)
    level           = Column(Integer,     default=1)
    current_streak  = Column(Integer,     default=0)
    longest_streak  = Column(Integer,     default=0)
    badges          = Column(Text,        default="[]")   # JSON list of badge IDs
    # ── session metadata ──
    persona         = Column(String(50),  nullable=True)
    onboarding_done = Column(Boolean,     default=False)
    last_login      = Column(DateTime,    nullable=True)
    created_at      = Column(DateTime,    default=datetime.utcnow)


class MotivationSession(Base):
    __tablename__ = "motivation_sessions"
    id          = Column(Integer, primary_key=True)
    user_id     = Column(Integer, ForeignKey("users.id"))
    user_input  = Column(Text)
    ai_response = Column(Text)
    emotion     = Column(String(50),  default="neutral")
    vader_score = Column(Float,       default=0.0)
    input_type  = Column(String(20),  default="text")
    is_crisis   = Column(Boolean,     default=False)
    persona     = Column(String(50),  default="general")
    xp_earned   = Column(Integer,     default=0)
    created_at  = Column(DateTime,    default=datetime.utcnow)


class Goal(Base):
    __tablename__ = "goals"
    id             = Column(Integer, primary_key=True)
    user_id        = Column(Integer, ForeignKey("users.id"))
    title          = Column(String(300))
    description    = Column(Text,    nullable=True)
    category       = Column(String(50), default="general")
    persona        = Column(String(50), nullable=True)
    deadline       = Column(String(50), nullable=True)
    is_complete    = Column(Boolean,  default=False)   # primary completion flag
    completed      = Column(Boolean,  default=False)   # alias — keep both for compatibility
    streak         = Column(Integer,  default=0)
    roadmap        = Column(Text,     nullable=True)   # JSON list of steps
    interview_data = Column(Text,     nullable=True)   # JSON prefs
    num_steps      = Column(Integer,  nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)


class GoalStep(Base):
    __tablename__ = "goal_steps"
    id             = Column(Integer, primary_key=True)
    goal_id        = Column(Integer, ForeignKey("goals.id"))
    user_id        = Column(Integer, ForeignKey("users.id"))
    step_index     = Column(Integer, default=0)
    title          = Column(String(300))
    description    = Column(Text,    nullable=True)
    proof_question = Column(Text,    nullable=True)
    status         = Column(String(20), default="locked")
    proof_answer   = Column(Text,    nullable=True)
    completed_at   = Column(DateTime, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)


class JournalEntry(Base):
    __tablename__ = "journal_entries"
    id          = Column(Integer, primary_key=True)
    user_id     = Column(Integer, ForeignKey("users.id"))
    content     = Column(Text)           # AES-256 encrypted
    ai_insight  = Column(Text,   nullable=True)
    mood        = Column(String(50), default="neutral")
    mood_score  = Column(Float,  default=0.0)
    vader_score = Column(Float,  default=0.0)
    created_at  = Column(DateTime, default=datetime.utcnow)


class AIMemory(Base):
    __tablename__ = "ai_memory"
    __table_args__ = (UniqueConstraint("user_id", name="ai_memory_user_id_key"),)
    id            = Column(Integer, primary_key=True)
    user_id       = Column(Integer, ForeignKey("users.id"), unique=True)
    memory_text   = Column(Text,    default="")
    session_count = Column(Integer, default=0)
    last_emotion  = Column(String(50), default="neutral")
    updated_at    = Column(DateTime, default=datetime.utcnow)


class CheckIn(Base):
    __tablename__ = "check_ins"
    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("users.id"))
    mood       = Column(String(50), default="neutral")
    note       = Column(Text,    default="")
    energy     = Column(Integer, nullable=True)
    ai_reply   = Column(Text,    nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SpacedRepetition(Base):
    __tablename__ = "spaced_repetition"
    id            = Column(Integer, primary_key=True)
    user_id       = Column(Integer, ForeignKey("users.id"))
    goal_id       = Column(Integer, ForeignKey("goals.id"), nullable=True)
    content       = Column(Text)
    next_review   = Column(DateTime, default=datetime.utcnow)
    interval_days = Column(Integer,  default=1)
    ease_factor   = Column(Float,    default=2.5)
    repetitions   = Column(Integer,  default=0)
    created_at    = Column(DateTime, default=datetime.utcnow)


class Invite(Base):
    __tablename__ = "invites"
    id          = Column(Integer, primary_key=True)
    inviter_id  = Column(Integer, ForeignKey("users.id"))
    to_email    = Column(String(200))
    status      = Column(String(20), default="sent")   # sent / joined
    created_at  = Column(DateTime,   default=datetime.utcnow)


def init_db():
    """
    Create all tables that don't exist yet.
    SAFE to run multiple times — will NOT drop or alter existing tables.

    For EXISTING installs, run these in pgAdmin to add missing columns:
    ─────────────────────────────────────────────────────────────────────
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active       BOOLEAN  DEFAULT TRUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS xp              INTEGER  DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS level           INTEGER  DEFAULT 1;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak  INTEGER  DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak  INTEGER  DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS badges          TEXT     DEFAULT '[]';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS persona         VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN  DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login      TIMESTAMP;
    ALTER TABLE goals ADD COLUMN IF NOT EXISTS is_complete     BOOLEAN  DEFAULT FALSE;
    ALTER TABLE goals ADD COLUMN IF NOT EXISTS description     TEXT;
    ALTER TABLE goals ADD COLUMN IF NOT EXISTS persona         VARCHAR(50);
    ALTER TABLE goals ADD COLUMN IF NOT EXISTS streak          INTEGER  DEFAULT 0;
    ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS mood_score FLOAT DEFAULT 0.0;
    ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS vader_score FLOAT DEFAULT 0.0;
    ALTER TABLE check_ins ADD COLUMN IF NOT EXISTS energy      INTEGER;
    ALTER TABLE motivation_sessions ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0;
    ALTER TABLE ai_memory ADD CONSTRAINT IF NOT EXISTS ai_memory_user_id_key UNIQUE (user_id);
    ─────────────────────────────────────────────────────────────────────
    """
    Base.metadata.create_all(bind=engine)
    print("✅ All tables created / verified")