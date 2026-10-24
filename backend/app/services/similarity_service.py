import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.models.evidence_file import EvidenceFile
from backend.app.models.evidence_relationship import EvidenceRelationship
from backend.app.models.similarity_analysis import SimilarityAnalysis
from backend.app.services.hashing_service import hashing_service

class SimilarityService:
    PRESET_THRESHOLDS = {
        "strict": 4,     # ~93.75% similarity
        "balanced": 10,  # ~84.38% similarity
        "broad": 16      # ~75.0% similarity
    }

    def get_exact_duplicates(self, db: Session, case_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Identifies and groups all evidence files that share an identical SHA-256 cryptographic hash.
        Operates on original file byte hashes, not decoded pixels.
        """
        query = db.query(EvidenceFile.sha256_hash, func.count(EvidenceFile.id).label("cnt"))
        if case_id is not None:
            query = query.filter(EvidenceFile.case_id == case_id)
        
        duplicate_hashes = (
            query.group_by(EvidenceFile.sha256_hash)
            .having(func.count(EvidenceFile.id) > 1)
            .all()
        )

        groups = []
        total_dup_files = 0

        for row in duplicate_hashes:
            dup_hash = row[0]
            files_q = db.query(EvidenceFile).filter(EvidenceFile.sha256_hash == dup_hash)
            if case_id is not None:
                files_q = files_q.filter(EvidenceFile.case_id == case_id)
            files = files_q.order_by(EvidenceFile.acquisition_timestamp.asc()).all()

            total_size = sum(f.file_size for f in files)
            total_dup_files += len(files)

            groups.append({
                "sha256_hash": dup_hash,
                "file_count": len(files),
                "total_size": total_size,
                "files": files
            })

        return {
            "total_groups": len(groups),
            "total_duplicate_files": total_dup_files,
            "groups": groups
        }

    def run_similarity_search(
        self,
        db: Session,
        query_evidence_id: str,
        algorithm: str = "phash",
        threshold_preset: str = "balanced",
        max_hamming_distance: Optional[int] = None,
        scope_case_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Performs perceptual similarity search using aHash, dHash, or pHash.
        Calculates bitwise Hamming distance and normalized similarity against candidates.
        """
        query_ev = db.query(EvidenceFile).filter(EvidenceFile.id == query_evidence_id).first()
        if not query_ev:
            raise ValueError(f"Evidence file {query_evidence_id} not found.")

        # Determine threshold
        if max_hamming_distance is not None:
            cutoff_dist = max_hamming_distance
        else:
            cutoff_dist = self.PRESET_THRESHOLDS.get(threshold_preset.lower(), 10)

        # Get query hash string
        algorithm_clean = algorithm.lower()
        if algorithm_clean == "phash":
            query_hash = query_ev.phash
        elif algorithm_clean == "ahash":
            query_hash = query_ev.ahash
        elif algorithm_clean == "dhash":
            query_hash = query_ev.dhash
        else:
            query_hash = query_ev.phash
            algorithm_clean = "phash"

        if not query_hash:
            raise ValueError(f"Perceptual hash ({algorithm_clean}) not available for query evidence {query_evidence_id}.")

        # Retrieve candidate pool (excluding query image itself)
        cand_query = db.query(EvidenceFile).filter(EvidenceFile.id != query_evidence_id)
        if scope_case_id is not None:
            cand_query = cand_query.filter(EvidenceFile.case_id == scope_case_id)
        candidates = cand_query.all()

        results = []
        for cand in candidates:
            cand_hash = getattr(cand, algorithm_clean, None)
            if not cand_hash:
                continue

            try:
                distance, norm_sim, category = hashing_service.calculate_similarity(query_hash, cand_hash)
            except Exception:
                continue

            if distance <= cutoff_dist:
                # Check if relationship already exists in database
                existing_rel = db.query(EvidenceRelationship).filter(
                    (
                        (EvidenceRelationship.source_evidence_id == query_ev.id) & 
                        (EvidenceRelationship.target_evidence_id == cand.id)
                    ) | (
                        (EvidenceRelationship.source_evidence_id == cand.id) & 
                        (EvidenceRelationship.target_evidence_id == query_ev.id)
                    )
                ).first()

                results.append({
                    "candidate_id": cand.id,
                    "candidate_filename": cand.original_filename,
                    "candidate_case_id": cand.case_id,
                    "candidate_dimensions": f"{cand.width}x{cand.height}",
                    "candidate_format": cand.image_format,
                    "algorithm": algorithm_clean,
                    "query_hash": query_hash,
                    "candidate_hash": cand_hash,
                    "hamming_distance": distance,
                    "normalized_similarity": norm_sim,
                    "confidence_category": category,
                    "has_existing_relationship": existing_rel is not None,
                    "existing_relationship_status": existing_rel.status if existing_rel else None
                })

        # Rank by Hamming distance ascending (closest match first)
        results.sort(key=lambda x: (x["hamming_distance"], -x["normalized_similarity"]))

        # Record analysis in database
        analysis = SimilarityAnalysis(
            evidence_id=query_ev.id,
            algorithm=algorithm_clean,
            parameters_json=json.dumps({
                "cutoff_distance": cutoff_dist,
                "preset": threshold_preset,
                "scope_case_id": scope_case_id
            }),
            execution_timestamp=datetime.utcnow(),
            result_json=json.dumps({"total_matches": len(results)})
        )
        db.add(analysis)
        db.commit()

        return {
            "query_evidence_id": query_ev.id,
            "algorithm": algorithm_clean,
            "max_distance_applied": cutoff_dist,
            "total_matches": len(results),
            "results": results
        }

similarity_service = SimilarityService()
