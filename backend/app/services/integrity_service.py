from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.models.evidence_file import EvidenceFile
from backend.app.models.investigation_event import InvestigationEvent
from backend.app.services.hashing_service import hashing_service

class IntegrityService:
    def verify_evidence_integrity(self, db: Session, evidence_id: str) -> Dict[str, Any]:
        """
        Recalculates the SHA-256 hash of the stored evidence file on disk
        and compares it against the immutable acquisition hash recorded in the database.
        """
        evidence = db.query(EvidenceFile).filter(EvidenceFile.id == evidence_id).first()
        if not evidence:
            raise ValueError(f"Evidence file with ID {evidence_id} not found.")

        target_file = settings.EVIDENCE_DIR / evidence.storage_reference
        now = datetime.utcnow()

        if not target_file.exists():
            evidence.integrity_status = "MISSING"
            evidence.last_verified_at = now
            status = "MISSING"
            msg = "Evidence file is missing from local storage directory."
            calculated_hash = None
        else:
            calculated_hash = hashing_service.calculate_sha256_file(target_file)
            if calculated_hash.lower() == evidence.sha256_hash.lower():
                evidence.integrity_status = "VERIFIED"
                evidence.last_verified_at = now
                status = "PASS"
                msg = "Cryptographic integrity verified. Stored original byte sequence matches recorded acquisition hash."
            else:
                evidence.integrity_status = "CORRUPTED"
                evidence.last_verified_at = now
                status = "FAIL"
                msg = "INTEGRITY VIOLATION: Current file byte hash differs from acquisition hash!"

        # Log an investigation event
        event = InvestigationEvent(
            case_id=evidence.case_id,
            evidence_id=evidence.id,
            event_type="integrity_verified",
            event_timestamp=now,
            details_json=f'{{"status": "{status}", "recorded_sha256": "{evidence.sha256_hash}", "calculated_sha256": "{calculated_hash}"}}',
            examiner_notes=msg
        )
        db.add(event)
        db.commit()
        db.refresh(evidence)

        return {
            "evidence_id": evidence.id,
            "original_filename": evidence.original_filename,
            "recorded_sha256": evidence.sha256_hash,
            "calculated_sha256": calculated_hash,
            "status": status,
            "verified_at": now,
            "message": msg
        }

integrity_service = IntegrityService()
