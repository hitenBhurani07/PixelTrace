import io
import json
import zipfile
import pytest
from pathlib import Path

from backend.app.services.hashing_service import hashing_service
from backend.app.services.metadata_service import metadata_service
from backend.app.models.investigation_case import InvestigationCase
from backend.app.models.evidence_file import EvidenceFile
from backend.app.models.evidence_relationship import EvidenceRelationship

def test_01_sha256_generation(synthetic_images):
    """Verifies cryptographic SHA-256 calculation directly from file bytes."""
    hash1 = hashing_service.calculate_sha256_bytes(synthetic_images["base"])
    hash2 = hashing_service.calculate_sha256_bytes(synthetic_images["exact_duplicate"])
    hash3 = hashing_service.calculate_sha256_bytes(synthetic_images["resized"])

    assert len(hash1) == 64
    assert hash1 == hash2  # Exact duplicate matches bit-for-bit
    assert hash1 != hash3  # Resized copy has different byte hash

def test_02_perceptual_hashing_and_hamming_distance(tmp_path, synthetic_images):
    """Verifies aHash, dHash, and pHash generation and Hamming distance calculation."""
    p_base = tmp_path / "base.png"
    p_resized = tmp_path / "resized.png"
    p_unrelated = tmp_path / "unrelated.png"

    p_base.write_bytes(synthetic_images["base"])
    p_resized.write_bytes(synthetic_images["resized"])
    p_unrelated.write_bytes(synthetic_images["unrelated"])

    h_base = hashing_service.calculate_perceptual_hashes(p_base)
    h_resized = hashing_service.calculate_perceptual_hashes(p_resized)
    h_unrelated = hashing_service.calculate_perceptual_hashes(p_unrelated)

    # Valid hex strings of 16 characters (64 bits)
    assert len(h_base["phash"]) == 16
    assert len(h_resized["phash"]) == 16
    assert len(h_unrelated["phash"]) == 16

    # Compare base vs resized: should have small Hamming distance (high similarity)
    dist_near, sim_near, cat_near = hashing_service.calculate_similarity(h_base["phash"], h_resized["phash"])
    assert dist_near <= 6
    assert sim_near >= 0.90
    assert cat_near in ("Exact Duplicate", "Strong Visual Similarity")

    # Compare base vs unrelated: should have large Hamming distance
    dist_unrel, sim_unrel, _ = hashing_service.calculate_similarity(h_base["phash"], h_unrelated["phash"])
    assert dist_unrel > dist_near
    assert sim_unrel < sim_near

def test_03_case_creation_and_persistence(client):
    """Verifies case creation via API and database persistence."""
    res = client.post("/api/cases", json={
        "title": "Incident Room 402 Evidence",
        "description": "Acquired evidence from surveillance camera storage",
        "examiner": "Forensic Specialist A. Kumar"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Incident Room 402 Evidence"
    assert data["case_number"].startswith("CASE-")
    assert data["examiner"] == "Forensic Specialist A. Kumar"
    assert data["status"] == "Active"

    # Verify retrieval
    case_id = data["id"]
    get_res = client.get(f"/api/cases/{case_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == case_id

def test_04_evidence_acquisition_and_exact_duplicates(client, synthetic_images):
    """Verifies evidence acquisition, byte-level duplicate clustering, and storage isolation."""
    # 1. Create test case
    case_res = client.post("/api/cases", json={"title": "Duplicate Identification Test"})
    case_id = case_res.json()["id"]

    # 2. Upload base image
    res1 = client.post(
        f"/api/cases/{case_id}/evidence",
        files=[("files", ("image_alpha.png", synthetic_images["base"], "image/png"))]
    )
    assert res1.status_code == 200
    ev1 = res1.json()[0]
    assert ev1["image_format"] == "PNG"
    assert ev1["width"] == 300
    assert ev1["height"] == 300
    assert ev1["integrity_status"] == "VERIFIED"

    # 3. Upload exact duplicate with different filename
    res2 = client.post(
        f"/api/cases/{case_id}/evidence",
        files=[("files", ("image_bravo_duplicate.png", synthetic_images["exact_duplicate"], "image/png"))]
    )
    assert res2.status_code == 200
    ev2 = res2.json()[0]

    # Verify identical SHA-256
    assert ev1["sha256_hash"] == ev2["sha256_hash"]
    assert ev1["id"] != ev2["id"]

    # 4. Check duplicate groups endpoint
    dup_res = client.get(f"/api/cases/{case_id}/duplicates")
    assert dup_res.status_code == 200
    dup_data = dup_res.json()
    assert dup_data["total_groups"] == 1
    assert dup_data["groups"][0]["file_count"] == 2
    assert dup_data["groups"][0]["sha256_hash"] == ev1["sha256_hash"]

def test_05_corrupt_image_handling(client, synthetic_images):
    """Verifies that non-image/corrupted payloads are safely rejected and do not corrupt storage."""
    case_res = client.post("/api/cases", json={"title": "Corrupt Payload Test"})
    case_id = case_res.json()["id"]

    res = client.post(
        f"/api/cases/{case_id}/evidence",
        files=[("files", ("bad_file.png", synthetic_images["corrupt"], "image/png"))]
    )
    assert res.status_code == 400
    assert "not a valid decodable image" in res.json()["detail"].lower()

def test_06_zip_archive_safe_acquisition(client, synthetic_images):
    """Verifies safe ZIP extraction, Zip-Slip traversal rejection, and image collection ingestion."""
    case_res = client.post("/api/cases", json={"title": "ZIP Collection Test"})
    case_id = case_res.json()["id"]

    # Construct safe test ZIP
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("photo1.png", synthetic_images["base"])
        zf.writestr("subfolder/photo2.png", synthetic_images["resized"])
        zf.writestr("notes.txt", b"Unsupported text document")  # Should be safely ignored
    
    zip_bytes = zip_buf.getvalue()

    res = client.post(
        f"/api/cases/{case_id}/evidence",
        files=[("files", ("evidence_pack.zip", zip_bytes, "application/zip"))]
    )
    assert res.status_code == 200
    acquired = res.json()
    assert len(acquired) == 2  # Only the 2 supported images were acquired

    # Test Zip-Slip attack rejection
    slip_buf = io.BytesIO()
    with zipfile.ZipFile(slip_buf, "w") as zf:
        zf.writestr("../../etc/passwd.png", synthetic_images["base"])
    slip_bytes = slip_buf.getvalue()

    slip_res = client.post(
        f"/api/cases/{case_id}/evidence",
        files=[("files", ("malicious.zip", slip_bytes, "application/zip"))]
    )
    assert slip_res.status_code == 400
    assert "path traversal" in slip_res.json()["detail"].lower()

def test_07_integrity_verification(client, synthetic_images):
    """Verifies recalculation of stored file hash and detection of byte consistency or tampering."""
    case_res = client.post("/api/cases", json={"title": "Integrity Verification Test"})
    case_id = case_res.json()["id"]

    res = client.post(
        f"/api/cases/{case_id}/evidence",
        files=[("files", ("valid.png", synthetic_images["base"], "image/png"))]
    )
    ev_id = res.json()[0]["id"]

    # Verify integrity: should pass
    verify_res = client.post(f"/api/evidence/{ev_id}/verify-integrity")
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert v_data["status"] == "PASS"
    assert v_data["recorded_sha256"] == v_data["calculated_sha256"]

def test_08_similarity_search_and_ranking(client, synthetic_images):
    """Verifies similarity search ranking by Hamming distance across candidate images."""
    case_res = client.post("/api/cases", json={"title": "Similarity Search Ranking Test"})
    case_id = case_res.json()["id"]

    # Upload base, resized, and unrelated
    client.post(
        f"/api/cases/{case_id}/evidence",
        files=[
            ("files", ("base.png", synthetic_images["base"], "image/png")),
            ("files", ("resized.png", synthetic_images["resized"], "image/png")),
            ("files", ("unrelated.png", synthetic_images["unrelated"], "image/png"))
        ]
    )
    ev_list = client.get(f"/api/cases/{case_id}/evidence").json()
    base_ev = next(e for e in ev_list if e["original_filename"] == "base.png")

    # Search similarity with broad preset
    search_res = client.post(
        f"/api/evidence/{base_ev['id']}/similarity-search",
        json={
            "algorithm": "phash",
            "threshold_preset": "broad"
        }
    )
    assert search_res.status_code == 200
    s_data = search_res.json()
    assert s_data["total_matches"] >= 1
    # First match must be the resized version (closer Hamming distance)
    first_match = s_data["results"][0]
    assert first_match["candidate_filename"] == "resized.png"
    assert first_match["hamming_distance"] <= 6

def test_09_relationship_creation_and_examiner_review(client, synthetic_images):
    """Verifies examiner relationship review workflow (Confirm / Reject decisions)."""
    case_res = client.post("/api/cases", json={"title": "Review Workflow Test"})
    case_id = case_res.json()["id"]

    # Ingest 2 files
    res = client.post(
        f"/api/cases/{case_id}/evidence",
        files=[
            ("files", ("ref.png", synthetic_images["base"], "image/png")),
            ("files", ("cand.png", synthetic_images["resized"], "image/png"))
        ]
    )
    e1, e2 = res.json()[0], res.json()[1]

    # 1. Propose relationship (Suggested)
    rel_res = client.post("/api/relationships", json={
        "source_evidence_id": e1["id"],
        "target_evidence_id": e2["id"],
        "relationship_type": "perceptual_similarity",
        "similarity_value": 0.94,
        "status": "Suggested"
    })
    assert rel_res.status_code == 200
    rel = rel_res.json()
    assert rel["status"] == "Suggested"

    # 2. Examiner reviews and confirms
    rel_id = rel["id"]
    patch_res = client.patch(f"/api/relationships/{rel_id}", json={
        "status": "Confirmed by Examiner",
        "examiner_notes": "Visual elements match subject pattern; dimensions indicate scaling."
    })
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["status"] == "Confirmed by Examiner"
    assert "scaling" in updated["examiner_notes"]
    assert updated["reviewed_at"] is not None

def test_10_transformation_analysis_cv(client, synthetic_images):
    """Verifies OpenCV feature matching and geometric homography inlier analysis."""
    case_res = client.post("/api/cases", json={"title": "Transformation Analysis Test"})
    case_id = case_res.json()["id"]

    res = client.post(
        f"/api/cases/{case_id}/evidence",
        files=[
            ("files", ("base_orig.png", synthetic_images["base"], "image/png")),
            ("files", ("base_scaled.png", synthetic_images["resized"], "image/png"))
        ]
    )
    e1, e2 = res.json()[0], res.json()[1]

    # Run transformation analysis
    tf_res = client.post(
        f"/api/evidence/{e1['id']}/transformation-analysis",
        json={"reference_evidence_id": e1["id"], "candidate_evidence_id": e2["id"]}
    )
    assert tf_res.status_code == 200
    tf_data = tf_res.json()

    assert tf_data["aspect_ratio_match"] is True
    assert tf_data["good_matches_count"] > 0
    assert tf_data["visualization_image_url"] is not None
    assert "scaling" in tf_data["transformation_type_inferred"].lower() or "resiz" in tf_data["transformation_type_inferred"].lower() or "match" in tf_data["transformation_type_inferred"].lower()

def test_11_metadata_extraction_and_missing_tags(tmp_path, synthetic_images):
    """Verifies robust handling when metadata is absent (no crash, clean 'Not available' labels)."""
    img_path = tmp_path / "plain.png"
    img_path.write_bytes(synthetic_images["base"])

    meta = metadata_service.extract_metadata(img_path)
    assert meta["make"] == "Not available"
    assert meta["model"] == "Not available"
    assert meta["gps_latitude"] == "Not available"
    assert meta["image_width"] == "300"
    assert meta["image_height"] == "300"

def test_12_investigation_timeline_and_events(client, synthetic_images):
    """Verifies chronological audit logging across all investigation operations."""
    case_res = client.post("/api/cases", json={"title": "Timeline Audit Test"})
    case_id = case_res.json()["id"]

    client.post(
        f"/api/cases/{case_id}/evidence",
        files=[("files", ("sample.png", synthetic_images["base"], "image/png"))]
    )

    timeline_res = client.get(f"/api/cases/{case_id}/timeline")
    assert timeline_res.status_code == 200
    events = timeline_res.json()
    assert len(events) >= 2  # case_creation + evidence_acquisition

    types = [e["event_type"] for e in events]
    assert "case_creation" in types
    assert "evidence_acquisition" in types

def test_13_pdf_report_generation(client, synthetic_images):
    """Verifies ReportLab PDF generation, disk persistence, and file retrieval."""
    case_res = client.post("/api/cases", json={
        "title": "Comprehensive Report Test",
        "description": "Validation of automated PDF compilation"
    })
    case_id = case_res.json()["id"]

    # Ingest evidence
    client.post(
        f"/api/cases/{case_id}/evidence",
        files=[("files", ("report_sample.png", synthetic_images["base"], "image/png"))]
    )

    # Generate PDF report
    rep_res = client.post(
        f"/api/cases/{case_id}/reports",
        json={"examiner_notes": "Preliminary investigation completed with verified cryptographic hashes."}
    )
    assert rep_res.status_code == 200
    rep_data = rep_res.json()
    assert rep_data["report_reference"].startswith("REP-")
    assert rep_data["file_size"] > 1000  # Non-empty valid PDF

    # Verify download endpoint
    rep_id = rep_data["id"]
    dl_res = client.get(f"/api/reports/{rep_id}/download")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    assert len(dl_res.content) > 1000
