import json
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database.session import get_db
from backend.app.models.investigation_case import InvestigationCase
from backend.app.models.evidence_file import EvidenceFile
from backend.app.models.evidence_relationship import EvidenceRelationship
from backend.app.schemas.forensic_schemas import (
    DashboardStatsResponse, CaseResponse, EvidenceResponse,
    MetadataComparisonResponse
)
from backend.app.services.metadata_service import metadata_service
from backend.app.services.similarity_service import similarity_service

router = APIRouter(tags=["System & Dashboard"])

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "PixelTrace Digital Forensics Engine",
        "version": "1.0.0"
    }

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Computes real investigation dashboard statistics directly from SQLite records.
    Never fabricates stats or mock data.
    """
    total_cases = db.query(InvestigationCase).count()
    total_evidence = db.query(EvidenceFile).count()

    # Exact duplicate groups
    dup_data = similarity_service.get_exact_duplicates(db)
    total_dup_groups = dup_data["total_groups"]

    # Near-duplicate / perceptual similarity relationships
    total_near_dup = db.query(EvidenceRelationship).filter(
        EvidenceRelationship.relationship_type.in_(["perceptual_similarity", "exact_duplicate"])
    ).count()

    # Images with metadata present
    total_with_meta = 0
    all_ev = db.query(EvidenceFile).all()
    for ev in all_ev:
        if ev.metadata_json:
            try:
                m = json.loads(ev.metadata_json)
                if m.get("make") != "Not available" or len(m.get("raw_tags", {})) > 0:
                    total_with_meta += 1
            except Exception:
                pass

    # Unresolved relationships (Suggested or Under Review)
    total_unresolved = db.query(EvidenceRelationship).filter(
        EvidenceRelationship.status.in_(["Suggested", "Under Review"])
    ).count()

    # Recent cases
    recent_cases_records = db.query(InvestigationCase).order_by(
        InvestigationCase.created_at.desc()
    ).limit(5).all()

    recent_cases = []
    for c in recent_cases_records:
        recent_cases.append(CaseResponse(
            id=c.id,
            case_number=c.case_number,
            title=c.title,
            description=c.description,
            examiner=c.examiner,
            created_at=c.created_at,
            updated_at=c.updated_at,
            status=c.status,
            evidence_count=len(c.evidence_files)
        ))

    # Recent evidence
    recent_evidence = db.query(EvidenceFile).order_by(
        EvidenceFile.acquisition_timestamp.desc()
    ).limit(6).all()

    return DashboardStatsResponse(
        total_cases=total_cases,
        total_evidence_files=total_evidence,
        total_exact_duplicate_groups=total_dup_groups,
        total_near_duplicate_relationships=total_near_dup,
        total_images_with_metadata=total_with_meta,
        total_unresolved_relationships=total_unresolved,
        recent_cases=recent_cases,
        recent_evidence=recent_evidence
    )

@router.get("/metadata/compare", response_model=MetadataComparisonResponse)
def compare_metadata_endpoints(
    source_id: str,
    target_id: str,
    db: Session = Depends(get_db)
):
    ev1 = db.query(EvidenceFile).filter(EvidenceFile.id == source_id).first()
    ev2 = db.query(EvidenceFile).filter(EvidenceFile.id == target_id).first()
    if not ev1 or not ev2:
        raise HTTPException(status_code=404, detail="One or both evidence files not found.")

    m1 = json.loads(ev1.metadata_json) if ev1.metadata_json else {}
    m2 = json.loads(ev2.metadata_json) if ev2.metadata_json else {}

    res = metadata_service.correlate_metadata(
        m1, m2,
        name1=ev1.original_filename,
        name2=ev2.original_filename
    )
    return MetadataComparisonResponse(
        source_evidence_id=ev1.id,
        target_evidence_id=ev2.id,
        **res
    )
