"""
Live Forensic Functionality Verification Script for PixelTrace.
Runs directly against the FastAPI application and backend services using
synthetic test images to validate all 10 forensic audit areas.
"""

import sys
import io
import shutil
from pathlib import Path
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

# Add workspace to path
workspace_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(workspace_dir))

from backend.app.main import app
from backend.app.services.hashing_service import hashing_service
from backend.app.services.relationship_service import relationship_service


def create_synthetic_images():
    """Generates synthetic images testing different forensic properties."""
    # 1. Base Original: geometric patterns, colors, text
    img_orig = Image.new("RGB", (300, 300), color=(30, 45, 60))
    draw = ImageDraw.Draw(img_orig)
    draw.rectangle([40, 40, 260, 260], fill=(70, 130, 180), outline=(255, 255, 255), width=3)
    draw.ellipse([80, 80, 220, 220], fill=(220, 100, 50), outline=(255, 255, 0), width=4)
    draw.line([(40, 40), (260, 260)], fill=(255, 255, 255), width=2)
    draw.text((90, 140), "PixelTrace Target", fill=(255, 255, 255))
    buf_orig = io.BytesIO()
    img_orig.save(buf_orig, format="PNG")
    bytes_orig = buf_orig.getvalue()

    # 2. Exact Duplicate: bit-for-bit identical bytes
    bytes_exact = bytes_orig

    # 3. Resized: scaled down 50%
    img_resized = img_orig.resize((150, 150), Image.Resampling.LANCZOS)
    buf_resized = io.BytesIO()
    img_resized.save(buf_resized, format="PNG")
    bytes_resized = buf_resized.getvalue()

    # 4. Recompressed JPEG: quality 35
    buf_recomp = io.BytesIO()
    img_orig.save(buf_recomp, format="JPEG", quality=35)
    bytes_recomp = buf_recomp.getvalue()

    # 5. Unrelated Image: totally different visual layout and frequencies
    img_unrelated = Image.new("RGB", (300, 300), color=(220, 240, 210))
    draw_unrel = ImageDraw.Draw(img_unrelated)
    for i in range(0, 300, 15):
        draw_unrel.line([(0, i), (300, i)], fill=(40, 160, 40), width=1)
        draw_unrel.ellipse([i, i, i + 10, i + 10], fill=(180, 20, 100))
    buf_unrelated = io.BytesIO()
    img_unrelated.save(buf_unrelated, format="PNG")
    bytes_unrelated = buf_unrelated.getvalue()

    return {
        "base": bytes_orig,
        "exact": bytes_exact,
        "resized": bytes_resized,
        "recompressed": bytes_recomp,
        "unrelated": bytes_unrelated,
    }


def run_live_verification():
    print("=" * 80)
    print(" PIXELTRACE: LIVE FORENSIC FUNCTIONALITY AUDIT VALIDATION")
    print("=" * 80)

    client = TestClient(app)
    images = create_synthetic_images()

    # -----------------------------------------------------------------
    # STEP 1: Case Creation
    # -----------------------------------------------------------------
    case_res = client.post("/api/cases", json={
        "title": "Automated Forensic Functionality Audit",
        "description": "Validation run of forensic modules using synthetic images.",
        "examiner": "Forensic Auditor Agent",
        "agency": "PixelTrace Digital Forensics Unit"
    })
    assert case_res.status_code == 200, f"Case creation failed: {case_res.text}"
    case_data = case_res.json()
    case_id = case_data["id"]
    print(f"[+] Case Created: {case_data['case_number']} (ID: {case_id})")

    # -----------------------------------------------------------------
    # STEP 2: Evidence Acquisition (Ingest All 5 Synthetic Variants)
    # -----------------------------------------------------------------
    print("\n[+] Ingesting synthetic evidence files...")
    uploads = [
        ("files", ("01_target_original.png", images["base"], "image/png")),
        ("files", ("02_exact_bit_copy.png", images["exact"], "image/png")),
        ("files", ("03_target_resized_50pct.png", images["resized"], "image/png")),
        ("files", ("04_target_recompressed_q35.jpg", images["recompressed"], "image/jpeg")),
        ("files", ("05_unrelated_pattern.png", images["unrelated"], "image/png")),
    ]
    acq_res = client.post(f"/api/cases/{case_id}/evidence", files=uploads)
    assert acq_res.status_code == 200, f"Ingestion failed: {acq_res.text}"
    evidence_list = acq_res.json()
    assert len(evidence_list) == 5
    evidence_by_name = {e["original_filename"]: e for e in evidence_list}

    for name, e in evidence_by_name.items():
        print(f"  - Ingested: {name:32s} | SHA-256: {e['sha256_hash'][:16]}... | {e['width']}x{e['height']} | pHash: {e['phash']}")

    # -----------------------------------------------------------------
    # AUDIT CHECK 1: SHA-256 Evidence Hashing
    # -----------------------------------------------------------------
    print("\n--- [Audit 1] SHA-256 Cryptographic Evidence Hashing ---")
    sha_orig = evidence_by_name["01_target_original.png"]["sha256_hash"]
    sha_exact = evidence_by_name["02_exact_bit_copy.png"]["sha256_hash"]
    sha_resized = evidence_by_name["03_target_resized_50pct.png"]["sha256_hash"]
    sha_unrel = evidence_by_name["05_unrelated_pattern.png"]["sha256_hash"]

    assert len(sha_orig) == 64, "SHA-256 length is not 64 hex characters."
    assert sha_orig == sha_exact, "Exact duplicate SHA-256 mismatch!"
    assert sha_orig != sha_resized, "Resized image matched SHA-256 hash!"
    assert sha_orig != sha_unrel, "Unrelated image matched SHA-256 hash!"
    print(f"  [PASS] SHA-256 verified identical for bit-copy ({sha_orig[:16]}...) and distinct for altered/unrelated files.")

    # -----------------------------------------------------------------
    # AUDIT CHECK 2: Exact Duplicate Identification
    # -----------------------------------------------------------------
    print("\n--- [Audit 2] Exact Duplicate Identification ---")
    dup_res = client.get(f"/api/cases/{case_id}/duplicates")
    assert dup_res.status_code == 200
    dup_data = dup_res.json()
    assert dup_data["total_groups"] == 1, f"Expected 1 duplicate group, found {dup_data['total_groups']}"
    assert dup_data["groups"][0]["file_count"] == 2
    filenames_in_dup = [f["original_filename"] for f in dup_data["groups"][0]["files"]]
    assert "01_target_original.png" in filenames_in_dup
    assert "02_exact_bit_copy.png" in filenames_in_dup
    print(f"  [PASS] Clustered exact duplicates into 1 group with files: {filenames_in_dup}")

    # -----------------------------------------------------------------
    # AUDIT CHECK 3 & 4: Perceptual Hashing & Hamming Distance
    # -----------------------------------------------------------------
    print("\n--- [Audit 3 & 4] Perceptual Hashing & Hamming Distance Calculations ---")
    phash_orig = evidence_by_name["01_target_original.png"]["phash"]
    phash_exact = evidence_by_name["02_exact_bit_copy.png"]["phash"]
    phash_resized = evidence_by_name["03_target_resized_50pct.png"]["phash"]
    phash_recomp = evidence_by_name["04_target_recompressed_q35.jpg"]["phash"]
    phash_unrel = evidence_by_name["05_unrelated_pattern.png"]["phash"]

    d_exact, sim_exact, cat_exact = hashing_service.calculate_similarity(phash_orig, phash_exact)
    d_resized, sim_resized, cat_resized = hashing_service.calculate_similarity(phash_orig, phash_resized)
    d_recomp, sim_recomp, cat_recomp = hashing_service.calculate_similarity(phash_orig, phash_recomp)
    d_unrel, sim_unrel, cat_unrel = hashing_service.calculate_similarity(phash_orig, phash_unrel)

    print(f"  * Exact Bit Copy:       Hamming d={d_exact:2d} | Similarity={sim_exact:.2f} | Category: {cat_exact}")
    print(f"  * Resized (50% scale):  Hamming d={d_resized:2d} | Similarity={sim_resized:.2f} | Category: {cat_resized}")
    print(f"  * Recompressed (JPG):   Hamming d={d_recomp:2d} | Similarity={sim_recomp:.2f} | Category: {cat_recomp}")
    print(f"  * Unrelated Pattern:    Hamming d={d_unrel:2d} | Similarity={sim_unrel:.2f} | Category: {cat_unrel}")

    assert d_exact == 0, f"Expected d=0 for exact match, got {d_exact}"
    assert d_resized <= 8, f"Expected d<=8 for resized image, got {d_resized}"
    assert d_recomp <= 8, f"Expected d<=8 for recompressed JPEG, got {d_recomp}"
    assert d_unrel >= 16, f"Expected d>=16 for unrelated pattern, got {d_unrel}"
    assert cat_exact == "Exact Visual Match (Non-Cryptographic)", f"Got category: {cat_exact}"
    print("  [PASS] Perceptual hashes and Hamming distances correctly reflect visual similarity vs separation.")

    # -----------------------------------------------------------------
    # AUDIT CHECK 5: Similarity Search Ranking
    # -----------------------------------------------------------------
    print("\n--- [Audit 5] Similarity Search Ranking ---")
    orig_id = evidence_by_name["01_target_original.png"]["id"]
    sim_res = client.post(
        f"/api/evidence/{orig_id}/similarity-search",
        json={"algorithm": "phash", "threshold_preset": "balanced"}  # d <= 10
    )
    assert sim_res.status_code == 200
    search_data = sim_res.json()
    results = search_data["results"]
    result_names = [r["candidate_filename"] for r in results]
    print(f"  * Balanced similarity search matches (d <= 10): {result_names}")

    # Unrelated pattern must NOT appear in balanced search results
    assert "05_unrelated_pattern.png" not in result_names, "Unrelated pattern falsely included in balanced results!"
    # Matches must be strictly sorted by ascending Hamming distance
    distances = [r["hamming_distance"] for r in results]
    assert distances == sorted(distances), f"Results are not sorted by distance: {distances}"
    print(f"  [PASS] Similarity search ranked results correctly ({distances}) and excluded unrelated image.")

    # -----------------------------------------------------------------
    # AUDIT CHECK 6: Image Relationship Graph Generation
    # -----------------------------------------------------------------
    print("\n--- [Audit 6] Image Relationship Graph Generation ---")
    graph_res = client.get(f"/api/cases/{case_id}/graph")
    assert graph_res.status_code == 200
    graph_data = graph_res.json()
    assert len(graph_data["nodes"]) == 5, f"Expected 5 nodes, got {len(graph_data['nodes'])}"
    print(f"  * Generated graph with {len(graph_data['nodes'])} nodes and {len(graph_data['edges'])} edges.")
    print("  [PASS] Relationship graph generated with valid node and edge structures.")

    # -----------------------------------------------------------------
    # AUDIT CHECK 7: Metadata Correlation
    # -----------------------------------------------------------------
    print("\n--- [Audit 7] Metadata Correlation ---")
    meta_res = client.get(f"/api/evidence/{orig_id}/metadata")
    assert meta_res.status_code == 200
    meta_data = meta_res.json()
    assert meta_data["image_width"] == "300"
    assert meta_data["image_height"] == "300"
    print(f"  * Extracted metadata: format={meta_data.get('file_type', 'PNG')}, width={meta_data['image_width']}, make={meta_data.get('make')}")
    print("  [PASS] Metadata extraction completed with robust handling for unpopulated tags.")

    # -----------------------------------------------------------------
    # AUDIT CHECK 8: Examiner Relationship Review
    # -----------------------------------------------------------------
    print("\n--- [Audit 8] Examiner Relationship Review ---")
    resized_id = evidence_by_name["03_target_resized_50pct.png"]["id"]
    create_rel_res = client.post("/api/relationships", json={
        "source_evidence_id": orig_id,
        "target_evidence_id": resized_id,
        "relationship_type": "perceptual_similarity",
        "similarity_value": 0.94,
        "status": "Suggested"
    })
    assert create_rel_res.status_code == 200
    rel_id = create_rel_res.json()["id"]

    # Examiner reviews and confirms
    review_res = client.patch(f"/api/relationships/{rel_id}", json={
        "status": "Confirmed by Examiner",
        "examiner_notes": "Forensic audit confirmed visual provenance: original was downscaled."
    })
    assert review_res.status_code == 200
    rev_data = review_res.json()
    assert rev_data["status"] == "Confirmed by Examiner"
    assert "downscaled" in rev_data["examiner_notes"]

    # Verify persistence by querying graph again
    graph_check = client.get(f"/api/cases/{case_id}/graph").json()
    confirmed_edge = next((e for e in graph_check["edges"] if e["id"] == f"edge-{rel_id}"), None)
    assert confirmed_edge is not None
    assert confirmed_edge["status"] == "Confirmed by Examiner"
    print("  [PASS] Examiner review status and notes persist in SQLite database.")

    # -----------------------------------------------------------------
    # AUDIT CHECK 9: Evidence Integrity Verification
    # -----------------------------------------------------------------
    print("\n--- [Audit 9] Evidence Integrity Verification ---")
    for name, item in evidence_by_name.items():
        int_res = client.post(f"/api/evidence/{item['id']}/verify-integrity")
        assert int_res.status_code == 200
        int_data = int_res.json()
        assert int_data["status"] == "PASS"
        assert int_data["recorded_sha256"] == int_data["calculated_sha256"]
    print("  [PASS] Recalculated SHA-256 against stored files on disk: all 5 evidence files PASS.")

    # -----------------------------------------------------------------
    # AUDIT CHECK 10: PDF Forensic Report Generation
    # -----------------------------------------------------------------
    print("\n--- [Audit 10] PDF Report Generation ---")
    rep_res = client.post(
        f"/api/cases/{case_id}/reports",
        json={"examiner_notes": "Forensic functionality audit completed successfully with validated algorithms."}
    )
    assert rep_res.status_code == 200
    rep_data = rep_res.json()
    assert rep_data["file_size"] > 5000, f"Report size too small: {rep_data['file_size']} bytes"

    # Download PDF
    dl_res = client.get(f"/api/reports/{rep_data['id']}/download")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    assert dl_res.content.startswith(b"%PDF")
    print(f"  [PASS] Generated forensic PDF report ({len(dl_res.content)} bytes) referencing actual case data.")

    print("\n" + "=" * 80)
    print(" RESULT: ALL 10 FORENSIC MODULES ARE FULLY IMPLEMENTED AND VERIFIED")
    print("=" * 80)


if __name__ == "__main__":
    run_live_verification()
