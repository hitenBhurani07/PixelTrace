# PixelTrace System Architecture

## 1. System Overview
PixelTrace is an educational digital forensics and image provenance analysis platform designed to investigate image lineage, cryptographic integrity, perceptual similarity, and transformation history.

```
+-----------------------------------------------------------------------------------+
|                           Investigator Workstation (UI)                          |
|  React 18 + Vite + Tailwind CSS + Lucide Icons + React Flow (Provenance Graphs)  |
+------------------------------------------+----------------------------------------+
                                           | HTTP / REST (JSON + Multipart)
                                           v
+-----------------------------------------------------------------------------------+
|                             Backend Application (FastAPI)                         |
|                                                                                   |
|  +--------------------+  +----------------------+  +---------------------------+  |
|  |   Core & Config    |  |   Database & ORM     |  |    Storage Vault          |  |
|  | - Safe File Limits |  | - SQLAlchemy Models  |  | - storage/evidence/       |  |
|  | - Security Checks  |  | - SQLite 3 Engine    |  | - storage/derived/        |  |
|  | - CORS Middleware  |  | - Immutable Records  |  | - storage/reports/        |  |
|  +--------------------+  +----------------------+  +---------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                             Forensic Modules                                |  |
|  |  +-----------------------+  +-----------------------+  +-----------------+  |  |
|  |  |  Hashing & Perceptual |  |  CV Transformation    |  | Metadata Parser |  |  |
|  |  |  - SHA-256 (hashlib)  |  |  - SIFT / ORB Matcher |  | - ExifTool      |  |  |
|  |  |  - pHash / aHash/dHash|  |  - Lowe's Ratio 0.75  |  | - Pillow EXIF   |  |  |
|  |  |  - Hamming Distance   |  |  - RANSAC Homography  |  | - Correlation   |  |  |
|  |  +-----------------------+  +-----------------------+  +-----------------+  |  |
|  |  +-----------------------+  +-----------------------+  +-----------------+  |  |
|  |  |  Exact Duplicates     |  |  Audit Timeline       |  | ReportLab PDF   |  |  |
|  |  |  - Byte-Level Groups  |  |  - Event Stream       |  | - Structured Doc|  |  |
|  |  +-----------------------+  +-----------------------+  +-----------------+  |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Directory Layout & Separation of Concerns

- `backend/app/core/`: Application settings, path resolution, security size limits, directory initialization.
- `backend/app/database/`: SQLite session factory, engine configuration, declarative base.
- `backend/app/models/`: SQLAlchemy relational entities (`InvestigationCase`, `EvidenceFile`, `SimilarityAnalysis`, `EvidenceRelationship`, `InvestigationEvent`, `InvestigationReport`).
- `backend/app/schemas/`: Pydantic validation schemas enforcing structured API requests and responses.
- `backend/app/services/`: Pure forensic algorithm logic:
  - `hashing_service.py`: SHA-256 and bitwise perceptual hashing (pHash, aHash, dHash).
  - `evidence_service.py`: Safe ingestion, archive extraction, byte preservation, duplicate linking.
  - `integrity_service.py`: Verification of stored evidence bytes against acquisition records.
  - `similarity_service.py`: Hamming distance ranking and clustering.
  - `transformation_service.py`: Computer vision feature matching (SIFT/ORB) and RANSAC inlier analysis.
  - `metadata_service.py`: EXIF extraction and side-by-side field correlation.
  - `relationship_service.py`: Relational graph generation and examiner adjudication.
  - `timeline_service.py`: Chronological audit trail logging.
  - `report_service.py`: Structured PDF report compilation using ReportLab.
- `storage/`:
  - `evidence/`: Verbatim preserved evidence files (never overwritten).
  - `derived/`: Derived forensic outputs (e.g. feature-match visualization maps).
  - `reports/`: Generated PDF examination reports.
  - `temporary/`: Ephemeral staging for safe ZIP archive extraction.
- `frontend/`: Single-page application built on React, Vite, Tailwind CSS, Lucide icons, and React Flow.

---

## 3. Data Integrity & Evidence Preservation Guarantees

1. **Byte-Exact Preservation**: When an evidence file is uploaded, its raw byte stream is read directly, SHA-256 is computed via Python's `hashlib`, and the file is written to `storage/evidence/` with a unique server-generated ID.
2. **Read-Only Evidence Vault**: Original evidence files are never modified, compressed, or overwritten in place.
3. **Audit Trail**: Every significant action (case creation, acquisition, verification, search, relationship decision, report compilation) is logged into `investigation_events` with UTC timestamps.
