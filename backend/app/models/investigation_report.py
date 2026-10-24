from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class InvestigationReport(Base):
    __tablename__ = "investigation_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("investigation_cases.id", ondelete="CASCADE"), index=True, nullable=False)
    report_reference = Column(String(64), unique=True, index=True, nullable=False)  # e.g., "REP-20261024-XXXX"
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    storage_reference = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=False)

    case = relationship("InvestigationCase", back_populates="reports")
