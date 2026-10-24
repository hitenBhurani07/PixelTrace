from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class InvestigationEvent(Base):
    __tablename__ = "investigation_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    case_id = Column(Integer, ForeignKey("investigation_cases.id", ondelete="CASCADE"), index=True, nullable=True)
    evidence_id = Column(String(64), ForeignKey("evidence_files.id", ondelete="CASCADE"), index=True, nullable=True)
    event_type = Column(String(64), index=True, nullable=False)  
    # e.g.: "case_creation", "evidence_acquisition", "hash_calculated", "metadata_extracted", 
    #       "similarity_search", "relationship_created", "relationship_reviewed", 
    #       "transformation_analyzed", "integrity_verified", "report_generated"
    event_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    details_json = Column(Text, nullable=True)  # JSON-encoded payload
    examiner_notes = Column(Text, nullable=True)

    case = relationship("InvestigationCase", back_populates="events")
    evidence = relationship("EvidenceFile", back_populates="events")
