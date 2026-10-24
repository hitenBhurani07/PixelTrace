from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class EvidenceRelationship(Base):
    __tablename__ = "evidence_relationships"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    source_evidence_id = Column(String(64), ForeignKey("evidence_files.id", ondelete="CASCADE"), index=True, nullable=False)
    target_evidence_id = Column(String(64), ForeignKey("evidence_files.id", ondelete="CASCADE"), index=True, nullable=False)
    relationship_type = Column(String(64), nullable=False)  
    # e.g.: "exact_duplicate", "perceptual_similarity", "metadata_correlation", "examiner_confirmed", "examiner_rejected"
    algorithm = Column(String(64), nullable=True)  # e.g., "sha256", "phash", "sift_features", "metadata_fields"
    similarity_value = Column(Float, nullable=True)  # 0.0 - 1.0 normalized
    confidence_category = Column(String(64), nullable=True)  # "Exact Duplicate", "Strong Visual Similarity", "Possible Visual Relationship", "Metadata Match"
    status = Column(String(32), default="Suggested", nullable=False)  
    # "Suggested", "Under Review", "Confirmed by Examiner", "Rejected by Examiner"
    examiner_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("source_evidence_id", "target_evidence_id", "relationship_type", name="uq_source_target_type"),
    )

    source_evidence = relationship("EvidenceFile", foreign_keys=[source_evidence_id], back_populates="outbound_relationships")
    target_evidence = relationship("EvidenceFile", foreign_keys=[target_evidence_id], back_populates="inbound_relationships")
