from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.evidence_relationship import EvidenceRelationship
from backend.app.schemas.forensic_schemas import (
    RelationshipCreate, RelationshipUpdate, RelationshipResponse
)
from backend.app.services.relationship_service import relationship_service

router = APIRouter(prefix="/relationships", tags=["Evidence Relationships"])

@router.get("", response_model=List[RelationshipResponse])
def list_relationships(
    status: Optional[str] = None,
    relationship_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(EvidenceRelationship)
    if status:
        query = query.filter(EvidenceRelationship.status == status)
    if relationship_type:
        query = query.filter(EvidenceRelationship.relationship_type == relationship_type)

    rels = query.order_by(EvidenceRelationship.created_at.desc()).all()
    results = []
    for r in rels:
        results.append(RelationshipResponse(
            id=r.id,
            source_evidence_id=r.source_evidence_id,
            target_evidence_id=r.target_evidence_id,
            relationship_type=r.relationship_type,
            algorithm=r.algorithm,
            similarity_value=r.similarity_value,
            confidence_category=r.confidence_category,
            status=r.status,
            examiner_notes=r.examiner_notes,
            created_at=r.created_at,
            reviewed_at=r.reviewed_at,
            source_filename=r.source_evidence.original_filename if r.source_evidence else None,
            target_filename=r.target_evidence.original_filename if r.target_evidence else None
        ))
    return results

@router.post("", response_model=RelationshipResponse)
def create_relationship(req: RelationshipCreate, db: Session = Depends(get_db)):
    try:
        rel = relationship_service.create_or_update_relationship(
            db=db,
            source_id=req.source_evidence_id,
            target_id=req.target_evidence_id,
            relationship_type=req.relationship_type,
            algorithm=req.algorithm,
            similarity_value=req.similarity_value,
            confidence_category=req.confidence_category,
            status=req.status,
            examiner_notes=req.examiner_notes
        )
        return RelationshipResponse(
            id=rel.id,
            source_evidence_id=rel.source_evidence_id,
            target_evidence_id=rel.target_evidence_id,
            relationship_type=rel.relationship_type,
            algorithm=rel.algorithm,
            similarity_value=rel.similarity_value,
            confidence_category=rel.confidence_category,
            status=rel.status,
            examiner_notes=rel.examiner_notes,
            created_at=rel.created_at,
            reviewed_at=rel.reviewed_at,
            source_filename=rel.source_evidence.original_filename if rel.source_evidence else None,
            target_filename=rel.target_evidence.original_filename if rel.target_evidence else None
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{relationship_id}", response_model=RelationshipResponse)
def update_relationship_review(
    relationship_id: int,
    req: RelationshipUpdate,
    db: Session = Depends(get_db)
):
    rel = db.query(EvidenceRelationship).filter(EvidenceRelationship.id == relationship_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found.")

    if req.status is not None:
        rel.status = req.status
        if req.status in ("Confirmed by Examiner", "Rejected by Examiner"):
            rel.reviewed_at = datetime.utcnow()
    if req.examiner_notes is not None:
        rel.examiner_notes = req.examiner_notes

    db.commit()
    db.refresh(rel)

    return RelationshipResponse(
        id=rel.id,
        source_evidence_id=rel.source_evidence_id,
        target_evidence_id=rel.target_evidence_id,
        relationship_type=rel.relationship_type,
        algorithm=rel.algorithm,
        similarity_value=rel.similarity_value,
        confidence_category=rel.confidence_category,
        status=rel.status,
        examiner_notes=rel.examiner_notes,
        created_at=rel.created_at,
        reviewed_at=rel.reviewed_at,
        source_filename=rel.source_evidence.original_filename if rel.source_evidence else None,
        target_filename=rel.target_evidence.original_filename if rel.target_evidence else None
    )
