import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from datetime import datetime
from backend.app.core.config import settings
from backend.app.database.session import get_db
from backend.app.models.evidence_file import EvidenceFile
from backend.app.models.evidence_relationship import EvidenceRelationship
from backend.app.models.investigation_event import InvestigationEvent
from backend.app.schemas.forensic_schemas import (
    EvidenceDetailResponse, IntegrityVerificationResponse,
    SimilaritySearchRequest, SimilaritySearchResponse,
    RelationshipResponse, TransformationAnalysisRequest,
    TransformationAnalysisResponse
)
from backend.app.services.integrity_service import integrity_service
from backend.app.services.similarity_service import similarity_service
from backend.app.services.transformation_service import transformation_service

router = APIRouter(prefix="/evidence", tags=["Evidence Forensics"])

@router.get("/{evidence_id}", response_model=EvidenceDetailResponse)
def get_evidence_detail(evidence_id: str, db: Session = Depends(get_db)):
    ev = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence file not found.")

    meta = None
    if ev.metadata_json:
        try:
            meta = json.loads(ev.metadata_json)
        except Exception:
            meta = {}

    return EvidenceDetailResponse(
        id=ev.id,
        case_id=ev.case_id,
        original_filename=ev.original_filename,
        storage_reference=ev.storage_reference,
        sha256_hash=ev.sha256_hash,
        file_size=ev.file_size,
        image_format=ev.image_format,
        width=ev.width,
        height=ev.height,
        acquisition_timestamp=ev.acquisition_timestamp,
        ahash=ev.ahash,
        dhash=ev.dhash,
        phash=ev.phash,
        integrity_status=ev.integrity_status,
        last_verified_at=ev.last_verified_at,
        metadata=meta
    )

@router.get("/{evidence_id}/metadata")
def get_evidence_metadata(evidence_id: str, db: Session = Depends(get_db)):
    ev = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence file not found.")

    if not ev.metadata_json:
        return {"source_parser": "None", "message": "No metadata recorded."}

    try:
        return json.loads(ev.metadata_json)
    except Exception:
        return {"raw": ev.metadata_json}

@router.post("/{evidence_id}/verify-integrity", response_model=IntegrityVerificationResponse)
def verify_integrity(evidence_id: str, db: Session = Depends(get_db)):
    try:
        res = integrity_service.verify_evidence_integrity(db, evidence_id)
        return IntegrityVerificationResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{evidence_id}/similarity-search", response_model=SimilaritySearchResponse)
def similarity_search(
    evidence_id: str,
    req: SimilaritySearchRequest,
    db: Session = Depends(get_db)
):
    try:
        res = similarity_service.run_similarity_search(
            db=db,
            query_evidence_id=evidence_id,
            algorithm=req.algorithm,
            threshold_preset=req.threshold_preset or "balanced",
            max_hamming_distance=req.max_hamming_distance,
            scope_case_id=req.scope_case_id
        )
        return SimilaritySearchResponse(**res)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{evidence_id}/relationships", response_model=List[RelationshipResponse])
def get_evidence_relationships(evidence_id: str, db: Session = Depends(get_db)):
    rels = db.query(EvidenceRelationship).filter(
        or_(
            EvidenceRelationship.source_evidence_id == evidence_id,
            EvidenceRelationship.target_evidence_id == evidence_id
        )
    ).all()

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

@router.post("/{evidence_id}/transformation-analysis", response_model=TransformationAnalysisResponse)
def run_transformation_analysis(
    evidence_id: str,
    req: TransformationAnalysisRequest,
    db: Session = Depends(get_db)
):
    ev_ref = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id).first()
    ev_cand = db.query(EvidenceFile).filter(EvidenceFile.id == req.candidate_evidence_id).first()

    if not ev_ref or not ev_cand:
        raise HTTPException(status_code=404, detail="Reference or candidate evidence file not found.")

    ref_path = settings.EVIDENCE_DIR / ev_ref.storage_reference
    cand_path = settings.EVIDENCE_DIR / ev_cand.storage_reference

    if not ref_path.exists() or not cand_path.exists():
        raise HTTPException(status_code=400, detail="One or both evidence files missing from disk.")

    try:
        res = transformation_service.analyze_transformation(
            ref_path=ref_path,
            cand_path=cand_path,
            ref_id=ev_ref.id,
            cand_id=ev_cand.id
        )

        # Log transformation analysis event in investigation timeline
        event = InvestigationEvent(
            case_id=ev_ref.case_id,
            evidence_id=ev_ref.id,
            event_type="transformation_analyzed",
            event_timestamp=datetime.utcnow(),
            details_json=json.dumps({
                "reference_id": ev_ref.id,
                "candidate_id": ev_cand.id,
                "inferred_type": res["transformation_type_inferred"],
                "inliers_count": res["inliers_count"],
                "method": res["feature_method"]
            }),
            examiner_notes=f"Transformation analysis executed against {ev_cand.id}: {res['transformation_type_inferred']} (Confidence: {res['confidence_level']})."
        )
        db.add(event)
        db.commit()

        return TransformationAnalysisResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transformation analysis failed: {str(e)}")
