"""
Database session management.

Creates the SQLAlchemy engine, session factory, and a FastAPI dependency
for getting a database session per request.

The database file is stored at: backend/database/results.db
"""

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from database.models import Base


# ─── Database Location ───────────────────────────────────────
# Put results.db inside the database/ folder itself
DB_DIR = Path(__file__).parent
DB_PATH = DB_DIR / "results.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"


# ─── Engine ──────────────────────────────────────────────────
# check_same_thread=False is required for SQLite + FastAPI (multi-threaded)
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,  # set to True to see every SQL query in the terminal
)


# ─── Session Factory ─────────────────────────────────────────
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    class_=Session,
)


# ─── Table Creation ──────────────────────────────────────────
def init_db() -> None:
    """Create all tables if they don't exist yet."""
    Base.metadata.create_all(bind=engine)


# ─── FastAPI Dependency ──────────────────────────────────────
def get_db():
    """
    Yield a database session and close it when the request is done.

    Usage in FastAPI:
        @app.get("/something")
        def endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()