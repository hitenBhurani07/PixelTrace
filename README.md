# PixelTrace — Digital Image Provenance & Evidence Relationship Analyzer

**Subject:** Digital Image Forensics / Computer Vision  
**Category:** Digital Image Provenance, Cryptographic Integrity, and Evidence Relationship Analysis  
**Workstation URL (Dev):** `http://localhost:5173`  
**API Documentation:** `http://localhost:8000/docs`  

---

## 1. Abstract & Problem Statement

In modern digital forensics investigations, examiners frequently encounter collections of hundreds or thousands of digital image files acquired from disparate digital devices, cloud backups, and messaging platforms. Investigators need to determine:
1. *Are two image files exact duplicates?*
2. *Are two images visually related despite differences in resolution, compression, or formatting?*
3. *Which files in an evidence collection belong to the same image lineage?*
4. *What transformations (resizing, recompression, rotation, cropping) may have occurred between related images?*
5. *What metadata is available to corroborate or contradict a possible relationship?*
6. *Can the integrity of each acquired evidence file be verified against its acquisition record?*
7. *Can the findings be compiled into a reproducible, structured examination report?*

**PixelTrace** is a complete, educational digital image forensics workstation engineered to answer these questions through empirical cryptographic hashing, perceptual frequency analysis, computer vision geometric consensus, and interactive provenance graph mapping—without fabricating data or relying on cloud AI APIs.

---

## 2. Key Features & Forensic Modules

### 🛡️ Evidence Acquisition & Immutable Vault
- **Supported Formats**: JPEG, JPG, PNG, WebP, TIFF.
- **Acquisition Modes**: Single upload, multi-image upload, drag-and-drop, and ZIP archive ingestion.
- **Security & Safe Decompression**: Protects against Zip-Slip path traversal attacks, limits image size (20MB) and uncompressed archive expansion (300MB), and verifies decodability.
- **Original Preservation**: File bytes are preserved verbatim in dedicated disk vaults (`storage/evidence/`) and never overwritten.

### 🔐 Forensic Module A: Exact Duplicate Identification
- Computes SHA-256 directly on raw binary bytes using Python's `hashlib`.
- Clusters exact duplicate groups regardless of filenames, folder structures, or filesystem timestamps.

### 🔍 Forensic Module B: Perceptual Similarity Engine
- Generates 64-bit perceptual hashes via `ImageHash`:
  - **pHash (Default)**: 2D Discrete Cosine Transform (DCT) low-frequency representation.
  - **aHash**: Luminance average thresholding.
  - **dHash**: Adjacent horizontal pixel gradient differences.
- Computes bitwise **Hamming Distance** ($0 \le d \le 64$) and **Normalized Similarity**:
  $$\text{Normalized Similarity} = 1.0 - \left(\frac{\text{Hamming Distance}}{64}\right)$$
- Presets: Strict ($d \le 4$), Balanced ($d \le 10$), Broad ($d \le 16$), and custom thresholds.

### 🌐 Forensic Module C: Interactive Provenance Graph
- Interactive visual network powered by **React Flow** (`@xyflow/react`).
- Custom image evidence nodes showing thumbnails, dimensions, format, and SHA-256 summaries.
- Color-coded edges representing observed relationship types:
  - Exact Byte Duplicate (Solid Green)
  - Perceptual Similarity (Dashed Cyan)
  - Metadata Correlation (Dotted Purple)
  - Examiner Confirmed (Solid Emerald)
  - Examiner Rejected (Dashed Red)
- Search by evidence ID, filter by relationship type and similarity percentage slider.
- **Examiner Review Drawer**: Confirm, reject, or mark relationships under review with formal forensic notes.

### 🏷️ Forensic Module D: Metadata Correlation
- Extended metadata extraction with ExifTool support and comprehensive Pillow EXIF fallback.
- Field-by-field correlation: Camera make/model, lens, capture timestamps (`DateTimeOriginal`), GPS coordinates, and software tags.
- Identifies matching indicators vs discrepancies without arbitrary confidence scores.

### ⚙️ Forensic Module E: Image Transformation Analysis
- Controlled computer vision comparison using **OpenCV SIFT** (with ORB fallback) and Lowe's ratio test ($0.75$).
- **RANSAC geometric verification**: Computes homography matrices and counts robust inliers.
- Evaluates aspect ratio preservation, volume change percentage, and perceptual hash distances.
- Formulates cautious, non-exaggerated forensic transformation narratives (e.g., *"Observed visual similarity is consistent with possible downscaling (-75.0% pixel volume change)"*).
- Generates side-by-side inlier feature correspondence visualization maps.

### ⏱️ Forensic Module F: Investigation Timeline Audit
- Immutable chronological audit log capturing case creation, evidence acquisition, hash validation, similarity searches, relationship updates, and report generation.
- Explicitly differentiates file-embedded capture timestamps, filesystem timestamps, and system execution timestamps.

### 📄 Professional Investigation PDF Reports
- Compiles publication-ready PDF examination reports using **ReportLab**.
- Formats evidence inventories, SHA-256 validation results, duplicate clusters, relationship networks, audit timeline, examiner conclusions, and scientific limitations disclaimers.

---

## 3. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v4, Lucide React, React Flow (`@xyflow/react`), Axios, React Router v6.
- **Backend**: Python 3.12, FastAPI, Uvicorn, SQLAlchemy 2.0, SQLite 3, Pydantic v2.
- **Forensics & Vision**: Pillow, OpenCV (Headless), ImageHash, SciPy, NumPy, Scikit-Image, ReportLab.
- **Testing**: Pytest, FastAPI TestClient.

---

## 4. Installation & Local Setup

### Prerequisites
- Python 3.12+
- Node.js v18+ (tested on v22.20.0)
- npm v9+

### 1. Clone & Enter Project Directory
```bash
cd c:\Users\hiten\PixelTrace
```

### 2. Backend Setup
```bash
# Create Python 3.12 virtual environment
py -3.12 -m venv backend/venv

# Activate virtual environment (Windows PowerShell)
.\backend\venv\Scripts\Activate.ps1

# Upgrade pip and install dependencies
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cd ..
```

---

## 5. Running the Application

### Start Backend API Server (Port 8000)
From the project root:
```bash
$env:PYTHONPATH="c:\Users\hiten\PixelTrace"
.\backend\venv\Scripts\python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
The FastAPI backend will start at `http://127.0.0.1:8000` (Swagger UI at `http://127.0.0.1:8000/docs`).

### Start Frontend Dev Server (Port 5173)
In a separate terminal:
```bash
cd frontend
npm run dev
```
Open your browser to `http://127.0.0.1:5173/` to enter the PixelTrace forensic workstation.

---

## 6. Running Automated Tests

To execute the test suite covering SHA-256 calculation, duplicate detection, perceptual hashing, ZIP extraction safety, integrity checks, and PDF report compilation:
```bash
$env:PYTHONPATH="c:\Users\hiten\PixelTrace"
.\backend\venv\Scripts\python -m pytest -v backend/tests
```

---

## 7. Investigation Workflow Guide

1. **Initialize Case**: Navigate to **New Investigation** (`/cases`) and create a case with a title, reference number, and examiner name.
2. **Acquire Evidence**: Go to **Evidence Collection** (`/evidence`) and drag-and-drop image files (JPEG, PNG, WebP, TIFF) or a ZIP archive.
3. **Verify Integrity**: In the Evidence Inventory table, click **Re-verify** to recalculate the SHA-256 hash on disk against the acquisition record.
4. **Detect Duplicates**: Switch to the **Exact Duplicate Groups** tab to inspect byte-for-byte duplicate clusters.
5. **Run Similarity Search**: Select an evidence file and open **Image Similarity Search** (`/similarity`). Choose pHash (or aHash/dHash), pick a preset (e.g. Balanced, $d \le 10$), and run the search. Click **Link Relationship** on candidate matches.
6. **Inspect Provenance Graph**: Open **Provenance Graph** (`/graph`) to view the interactive node-edge diagram. Click on any edge to review the relationship, confirm or reject the link, and record forensic notes.
7. **Analyze Transformations**: Select **Transformation Analysis** (`/transformation`) to run OpenCV SIFT feature matching and view the RANSAC inlier correspondence map.
8. **Correlate Metadata**: Select **Metadata Correlation** (`/metadata`) to compare EXIF tags side-by-side.
9. **Compile Report**: Go to **Reports** (`/reports`), input examiner summary remarks, and click **Generate ReportLab PDF** to download the investigation report.

---

## 8. College Viva & Examination Defense Reference

### Q1: Why is SHA-256 used alongside perceptual hashing?
> **Answer**: SHA-256 is an avalanche-sensitive cryptographic hash function designed to verify exact byte-for-byte consistency. If even one pixel is slightly recompressed, the SHA-256 changes completely. Perceptual hashing (pHash) solves the opposite problem: it maps high-dimensional visual content into a 64-bit frequency fingerprint that remains invariant to resizing, compression, and format transcoding. PixelTrace uses SHA-256 to prove file integrity and exact duplicate status, and pHash to discover visual similarity relationships.

### Q2: What is the difference between aHash, dHash, and pHash?
> **Answer**:
> - **aHash (Average Hash)**: Compares pixels against the mean image luminance. Fast, but vulnerable to gamma shifts.
> - **dHash (Difference Hash)**: Measures horizontal pixel gradients (relative luminance between neighboring pixels). Robust against brightness variations.
> - **pHash (Perceptual Hash)**: Applies a 2D Discrete Cosine Transform (DCT) and extracts the $8 \times 8$ low-frequency coefficients. Most robust against resizing, JPEG compression, and minor geometric adjustments.

### Q3: Why does perceptual similarity not prove common origin?
> **Answer**: Perceptual hashing calculates mathematical distance across frequency coefficients. Two completely unrelated photographs depicting the same generic subject (e.g. a brick wall, blue sky, or stock portrait) can yield low Hamming distances by coincidence. In forensics, algorithmic similarity is an investigative lead, not certified proof of ownership or common lineage.

### Q4: How does PixelTrace detect transformations between images?
> **Answer**: PixelTrace extracts invariant keypoints using OpenCV SIFT (or ORB), matches them using Lowe's ratio test ($0.75$), and fits a geometric homography matrix via RANSAC. By measuring the ratio of inlier points and checking whether aspect ratios match alongside pixel volume changes, it determines whether differences are consistent with scaling, recompression, or cropping.
