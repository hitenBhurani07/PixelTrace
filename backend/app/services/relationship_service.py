import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.models.evidence_file import EvidenceFile
from backend.app.models.evidence_relationship import EvidenceRelationship
from backend.app.models.investigation_event import InvestigationEvent

class RelationshipService:
    def create_or_update_relationship(
        self,
        db: Session,
        source_id: str,
        target_id: str,
        relationship_type: str,
        algorithm: Optional[str] = None,
        similarity_value: Optional[float] = None,
        confidence_category: Optional[str] = None,
        status: str = "Suggested",
        examiner_notes: Optional[str] = None
    ) -> EvidenceRelationship:
        """
        Creates or updates a relationship between two evidence files.
        Maintains unique constraint on (source, target, type).
        """
        if source_id == target_id:
            raise ValueError("Cannot create a relationship between an image and itself.")

        # Check existing
        rel = db.query(EvidenceRelationship).filter(
            EvidenceRelationship.source_evidence_id == source_id,
            EvidenceRelationship.target_evidence_id == target_id,
            EvidenceRelationship.relationship_type == relationship_type
        ).first()

        now = datetime.utcnow()
        if rel:
            if status:
                rel.status = status
            if examiner_notes is not None:
                rel.examiner_notes = examiner_notes
            if similarity_value is not None:
                rel.similarity_value = similarity_value
            if confidence_category is not None:
                rel.confidence_category = confidence_category
            if status in ("Confirmed by Examiner", "Rejected by Examiner"):
                rel.reviewed_at = now
        else:
            rel = EvidenceRelationship(
                source_evidence_id=source_id,
                target_evidence_id=target_id,
                relationship_type=relationship_type,
                algorithm=algorithm,
                similarity_value=similarity_value,
                confidence_category=confidence_category,
                status=status,
                examiner_notes=examiner_notes,
                created_at=now,
                reviewed_at=now if status in ("Confirmed by Examiner", "Rejected by Examiner") else None
            )
            db.add(rel)

        # Log relationship review/creation event
        source_ev = db.query(EvidenceFile).filter(EvidenceFile.id == source_id).first()
        event = InvestigationEvent(
            case_id=source_ev.case_id if source_ev else None,
            evidence_id=source_id,
            event_type="relationship_updated" if rel.id else "relationship_created",
            event_timestamp=now,
            details_json=json.dumps({
                "source_id": source_id,
                "target_id": target_id,
                "type": relationship_type,
                "status": status,
                "similarity": similarity_value
            }),
            examiner_notes=examiner_notes
        )
        db.add(event)

        db.commit()
        db.refresh(rel)
        return rel

    def get_graph_data(self, db: Session, case_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Compiles React Flow compatible nodes and edges based on actual acquired evidence
        and recorded relationships.
        """
        ev_query = db.query(EvidenceFile)
        if case_id is not None:
            ev_query = ev_query.filter(EvidenceFile.case_id == case_id)
        evidence_files = ev_query.all()

        ev_id_set = {e.id for e in evidence_files}

        # Build nodes
        nodes = []
        for ev in evidence_files:
            nodes.append({
                "id": ev.id,
                "label": ev.original_filename,
                "case_id": ev.case_id,
                "dimensions": f"{ev.width}x{ev.height}",
                "format": ev.image_format,
                "file_size": ev.file_size,
                "sha256_short": f"{ev.sha256_hash[:8]}...{ev.sha256_hash[-6:]}",
                "thumbnail_url": f"/storage/evidence/{ev.storage_reference}"
            })

        # Build edges
        rel_query = db.query(EvidenceRelationship).filter(
            EvidenceRelationship.source_evidence_id.in_(ev_id_set),
            EvidenceRelationship.target_evidence_id.in_(ev_id_set)
        )
        relationships = rel_query.all()

        edges = []
        for r in relationships:
            edges.append({
                "id": f"edge-{r.id}",
                "source": r.source_evidence_id,
                "target": r.target_evidence_id,
                "relationship_type": r.relationship_type,
                "algorithm": r.algorithm,
                "similarity_value": r.similarity_value,
                "status": r.status,
                "confidence_category": r.confidence_category,
                "examiner_notes": r.examiner_notes
            })

        return {
            "case_id": case_id,
            "nodes": nodes,
            "edges": edges
        }

relationship_service = RelationshipService()
