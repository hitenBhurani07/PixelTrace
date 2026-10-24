import json
import os
import uuid
import zipfile
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from PIL import Image

from backend.app.core.config import settings
from backend.app.models.investigation_case import InvestigationCase
from backend.app.models.evidence_file import EvidenceFile
from backend.app.models.investigation_event import InvestigationEvent
from backend.app.models.evidence_relationship import EvidenceRelationship
from backend.app.services.hashing_service import hashing_service
from backend.app.services.metadata_service import metadata_service

class EvidenceService:
    def acquire_single_image(
        self,
        db: Session,
        case_id: int,
        file_bytes: bytes,
        original_filename: str
    ) -> EvidenceFile:
        """
        Preserves original image bytes, extracts cryptographic and perceptual hashes,
        safely extracts metadata, and commits evidence record to database.
        """
        # 1. Enforce size limit
        if len(file_bytes) > settings.MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"File {original_filename} exceeds max size limit of {settings.MAX_IMAGE_SIZE_BYTES // (1024*1024)}MB"
            )

        # 2. Compute SHA-256 on byte-exact original
        sha256_hash = hashing_service.calculate_sha256_bytes(file_bytes)

        # 3. Generate unique evidence ID and storage filename
        timestamp_str = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        unique_token = uuid.uuid4().hex[:8]
        evidence_id = f"EVD-{case_id}-{timestamp_str}-{unique_token}"
        
        # Determine safe file extension
        ext = Path(original_filename).suffix.lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            ext = ".bin"
        storage_filename = f"{evidence_id}{ext}"
        storage_path = settings.EVIDENCE_DIR / storage_filename

        # 4. Save byte-exact original to disk (never overwrite)
        with open(storage_path, "wb") as f:
            f.write(file_bytes)

        # 5. Safely validate and decode image
        try:
            with Image.open(storage_path) as img:
                img.verify()
            # Reopen to read dimensions and format
            with Image.open(storage_path) as img:
                img_format = (img.format or "UNKNOWN").upper()
                width, height = img.size
        except Exception as e:
            # If invalid image bytes, remove file and error out
            if storage_path.exists():
                storage_path.unlink()
            raise HTTPException(
                status_code=400,
                detail=f"Uploaded file {original_filename} is not a valid decodable image: {str(e)}"
            )

        # 6. Calculate perceptual hashes (pHash, aHash, dHash)
        perceptual_hashes = hashing_service.calculate_perceptual_hashes(storage_path)

        # 7. Extract metadata
        extracted_meta = metadata_service.extract_metadata(storage_path)

        # 8. Create EvidenceFile entity
        now = datetime.utcnow()
        evidence = EvidenceFile(
            id=evidence_id,
            case_id=case_id,
            original_filename=Path(original_filename).name,
            storage_reference=storage_filename,
            sha256_hash=sha256_hash,
            file_size=len(file_bytes),
            image_format=img_format,
            width=width,
            height=height,
            acquisition_timestamp=now,
            ahash=perceptual_hashes.get("ahash"),
            dhash=perceptual_hashes.get("dhash"),
            phash=perceptual_hashes.get("phash"),
            metadata_json=json.dumps(extracted_meta),
            integrity_status="VERIFIED",
            last_verified_at=now
        )
        db.add(evidence)
        db.flush()

        # 9. Log Investigation Event
        event = InvestigationEvent(
            case_id=case_id,
            evidence_id=evidence_id,
            event_type="evidence_acquisition",
            event_timestamp=now,
            details_json=json.dumps({
                "original_filename": original_filename,
                "file_size": len(file_bytes),
                "format": img_format,
                "dimensions": f"{width}x{height}",
                "sha256": sha256_hash
            }),
            examiner_notes=f"Evidence acquired and preserved with SHA-256 hash {sha256_hash}."
        )
        db.add(event)

        # 10. Automatically check for existing exact byte duplicates across repository
        self._register_duplicate_relationships(db, evidence)

        db.commit()
        db.refresh(evidence)
        return evidence

    def _register_duplicate_relationships(self, db: Session, new_evidence: EvidenceFile):
        """Finds any existing evidence with matching SHA-256 and creates duplicate relationship."""
        existing_matches = db.query(EvidenceFile).filter(
            EvidenceFile.sha256_hash == new_evidence.sha256_hash,
            EvidenceFile.id != new_evidence.id
        ).all()

        for match in existing_matches:
            # Check if relationship already exists
            existing_rel = db.query(EvidenceRelationship).filter(
                EvidenceRelationship.source_evidence_id == match.id,
                EvidenceRelationship.target_evidence_id == new_evidence.id,
                EvidenceRelationship.relationship_type == "exact_duplicate"
            ).first()

            if not existing_rel:
                rel = EvidenceRelationship(
                    source_evidence_id=match.id,
                    target_evidence_id=new_evidence.id,
                    relationship_type="exact_duplicate",
                    algorithm="sha256",
                    similarity_value=1.0,
                    confidence_category="Exact Duplicate",
                    status="Suggested",
                    examiner_notes="Identical SHA-256 cryptographic hash on raw file bytes.",
                    created_at=datetime.utcnow()
                )
                db.add(rel)

    def acquire_zip_collection(
        self,
        db: Session,
        case_id: int,
        zip_bytes: bytes,
        archive_name: str
    ) -> List[EvidenceFile]:
        """
        Safely inspects and extracts images from a ZIP archive.
        Prevents Zip Slip (directory traversal) and enforces total decompression limits.
        """
        if len(zip_bytes) > settings.MAX_ZIP_SIZE_BYTES:
            raise HTTPException(
                status_code=400,
                detail=f"Archive exceeds maximum allowed size of {settings.MAX_ZIP_SIZE_BYTES // (1024*1024)}MB"
            )

        temp_zip_path = settings.TEMPORARY_DIR / f"temp_{uuid.uuid4().hex}.zip"
        with open(temp_zip_path, "wb") as f:
            f.write(zip_bytes)

        acquired_files: List[EvidenceFile] = []
        try:
            if not zipfile.is_zipfile(temp_zip_path):
                raise HTTPException(status_code=400, detail="Uploaded file is not a valid ZIP archive.")

            total_uncompressed_size = 0
            with zipfile.ZipFile(temp_zip_path, "r") as zf:
                # 1. Validation pass: check sizes and names
                for info in zf.infolist():
                    # Check for path traversal attempts
                    clean_name = os.path.normpath(info.filename)
                    if clean_name.startswith("..") or os.path.isabs(clean_name) or "/../" in info.filename:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Security violation: path traversal detected in archive entry: {info.filename}"
                        )
                    total_uncompressed_size += info.file_size
                    if total_uncompressed_size > settings.MAX_ZIP_EXTRACTED_BYTES:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Archive uncompressed size exceeds limit of {settings.MAX_ZIP_EXTRACTED_BYTES // (1024*1024)}MB"
                        )

                # 2. Ingestion pass
                for info in zf.infolist():
                    if info.is_dir():
                        continue
                    ext = Path(info.filename).suffix.lower()
                    if ext in settings.ALLOWED_EXTENSIONS:
                        raw_data = zf.read(info.filename)
                        filename_clean = Path(info.filename).name
                        if not filename_clean or filename_clean.startswith("."):
                            continue
                        try:
                            ev = self.acquire_single_image(db, case_id, raw_data, filename_clean)
                            acquired_files.append(ev)
                        except Exception:
                            # Skip corrupted individual images in collection safely
                            pass

        finally:
            if temp_zip_path.exists():
                temp_zip_path.unlink()

        return acquired_files

evidence_service = EvidenceService()
