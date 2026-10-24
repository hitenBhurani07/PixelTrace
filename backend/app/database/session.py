from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all models to ensure they are registered with Base.metadata
    from backend.app.models import (
        investigation_case,
        evidence_file,
        similarity_analysis,
        evidence_relationship,
        investigation_event,
        investigation_report,
    )
    Base.metadata.create_all(bind=engine)
