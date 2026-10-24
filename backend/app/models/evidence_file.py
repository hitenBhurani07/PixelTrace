from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class EvidenceFile(Base):
    __tablename__ = "evidence_files"

    id = Column(String(64), primary_key=True, index=True)  # e.g., "EVD-20261024-XXXXXX"
    case_id = Column(Integer, ForeignKey("investigation_cases.id", ondelete="CASCADE"), index=True, nullable=False)
    original_filename = Column(String(255), nullable=False)
    storage_reference = Column(String(512), nullable=False)  # Path relative to storage/evidence
    sha256_hash = Column(String(64), index=True, nullable=False)
    file_size = Column(Integer, nullable=False)  # Size in bytes
    image_format = Column(String(32), nullable=False)  # JPEG, PNG, WEBP, TIFF, etc.
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    acquisition_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Perceptual hashes
    ahash = Column(String(64), nullable=True, index=True)
    dhash = Column(String(64), nullable=True, index=True)
    phash = Column(String(64), nullable=True, index=True)
    
    # Metadata extracted
    metadata_json = Column(Text, nullable=True)  # JSON-encoded extracted EXIF/IPTC/XMP
    
    # Integrity status
    integrity_status = Column(String(32), default="VERIFIED", nullable=False)  # "VERIFIED", "CORRUPTED", "MISSING"
    last_verified_at = Column(DateTime, nullable=True)

    # Relationships
    case = relationship("InvestigationCase", back_populates="evidence_files")
    analyses = relationship("SimilarityAnalysis", back_populates="evidence", cascade="all, delete-orphan")
    events = relationship("InvestigationEvent", back_populates="evidence", cascade="all, delete-orphan")
    
    # Relationships where this file is source or target
    outbound_relationships = relationship(
        "EvidenceRelationship",
        foreign_keys="EvidenceRelationship.source_evidence_id",
        back_populates="source_evidence",
        cascade="all, delete-orphan"
    )
    inbound_relationships = relationship(
        "EvidenceRelationship",
        foreign_keys="EvidenceRelationship.target_evidence_id",
        back_populates="target_evidence",
        cascade="all, delete-orphan"
    )
