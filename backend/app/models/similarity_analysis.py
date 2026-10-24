from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class SimilarityAnalysis(Base):
    __tablename__ = "similarity_analyses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    evidence_id = Column(String(64), ForeignKey("evidence_files.id", ondelete="CASCADE"), index=True, nullable=False)
    algorithm = Column(String(32), nullable=False)  # "phash", "ahash", "dhash"
    parameters_json = Column(Text, nullable=True)
    execution_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    result_json = Column(Text, nullable=False)

    evidence = relationship("EvidenceFile", back_populates="analyses")
