from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class InvestigationCase(Base):
    __tablename__ = "investigation_cases"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_number = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    examiner = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    status = Column(String(32), default="Active", nullable=False)  # "Active", "Archived"

    # Relationships
    evidence_files = relationship("EvidenceFile", back_populates="case", cascade="all, delete-orphan")
    events = relationship("InvestigationEvent", back_populates="case", cascade="all, delete-orphan")
    reports = relationship("InvestigationReport", back_populates="case", cascade="all, delete-orphan")
