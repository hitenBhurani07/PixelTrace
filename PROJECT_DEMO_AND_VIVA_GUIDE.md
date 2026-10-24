# PixelTrace: Complete Demonstration & Viva Defense Guide

---

## Part 1: Step-by-Step Live Demo Execution Guide

Follow this sequence when showing the live project on your laptop (`http://127.0.0.1:5173`).

All demo images are already pre-generated in your repository in the folder:  
📁 **`demo_evidence/`** (located at `c:\Users\hiten\PixelTrace\demo_evidence\`)

```
demo_evidence/
├── 01_original_evidence.png         <-- High contrast geometric evidence
├── 02_exact_duplicate.png          <-- Bit-for-bit identical byte copy
├── 03_resized_50pct.png            <-- Downscaled 50%
├── 04_recompressed_quality35.jpg   <-- JPEG compression artifact
├── 05_cropped_center.png           <-- Cropped central region
└── 06_unrelated_scene.png          <-- Distinct unrelated image
```

---

### Step 1: Create an Investigation Case
1. Navigate to **Cases** (`/cases`) in the sidebar.
2. Click **"+ New Case"**.
3. Enter:
   - **Case Title**: `Incident 402 - Image Provenance Analysis`
   - **Description**: `Investigation of manipulated digital image evidence across multiple social channels.`
   - **Lead Examiner**: `[Your Name]`
   - **Agency / Institution**: `Digital Forensics Lab`
4. Click **"Create Case"**.
5. *What to say*: *"PixelTrace enforces strict forensic case isolation. Every evidence file, hash calculation, relationship, and examiner decision is bound to a unique immutable case identifier (`CASE-YYYYMMDD-...`)."*

---

### Step 2: Evidence Acquisition & Cryptographic Hashing
1. Navigate to **Evidence Collection** (`/evidence`).
2. Drag and drop all 6 files from `demo_evidence/` into the upload dropzone.
3. Click **"Upload & Ingest Evidence"**.
4. *What to point out on screen*:
   - Point to the **SHA-256 column**:  
     `01_original_evidence.png` and `02_exact_duplicate.png` share the exact same 64-character SHA-256 hash (`9661ce3334f6...`).
   - Point to `03_resized_50pct.png`: Even though it looks visually identical to the human eye, its SHA-256 hash changed completely (`ecfa45a4...`) due to the avalanche effect of cryptographic hashing.
   - Point to the **Exact Duplicates Banner**: PixelTrace automatically detected and clustered the two identical files without manual intervention.
5. *What to say*: *"Cryptographic hashes like SHA-256 prove byte-level authenticity. If even one pixel value or header bit is modified, the SHA-256 changes completely. This is why cryptographic hashing alone cannot detect resized or reformatted images."*

---

### Step 3: Evidence Detail & Chain-of-Custody Verification
1. Click on `01_original_evidence.png` to open the **Evidence Detail** view (`/evidence/:id`).
2. Point out:
   - File dimensions (`400x400`), format (`PNG`), file size.
   - Perceptual hashes generated at ingestion: **aHash**, **dHash**, and **pHash** (DCT frequency hash).
3. Click the green **"Verify Integrity"** button at the top right.
4. *What to point out on screen*: The check returns **`PASS`**, verifying that the file bytes stored on disk have not undergone bit-rot, tampering, or modification since acquisition.

---

### Step 4: Perceptual Similarity Search (Solving the Forensic Gap)
1. Navigate to **Similarity Search** (`/similarity`).
2. Select Target: `01_original_evidence.png`.
3. Select Algorithm: **`pHash`** (Frequency domain DCT hash).
4. Select Preset: **Balanced ($d \le 10$)**.
5. Click **"Run Similarity Search"**.
6. *What to point out on screen*:
   - **Rank 1**: `02_exact_duplicate.png` — Hamming Distance **$d = 0$** (100% similarity).
   - **Rank 2**: `03_resized_50pct.png` — Hamming Distance **$d = 0$** (100% visual match in DCT frequency space).
   - **Rank 3**: `04_recompressed_quality35.jpg` — Hamming Distance **$d = 2$** (97% strong similarity).
   - **Crucial forensic observation**: `06_unrelated_scene.png` was **rejected and excluded** because its Hamming distance is $d = 32$.
7. *What to say*: *"This demonstrates perceptual hashing. While SHA-256 failed to link the resized and recompressed copies, pHash identified that they share the exact same low-frequency image structure, while successfully ignoring unrelated noise."*

---

### Step 5: Provenance Graph & Examiner Workflow
1. Navigate to **Provenance Graph** (`/graph`).
2. Show the interactive node-link graph (pan, zoom, drag nodes).
3. Click on the edge between the duplicates or click **"Add Relationship"**:
   - Source: `01_original_evidence.png`
   - Target: `03_resized_50pct.png`
   - Type: `perceptual_similarity`
   - Set Status: **"Confirmed by Examiner"**
   - Add Note: `Visual structure matches Exhibit 01. Dimensional reduction indicates scaling.`
4. Click **"Save Relationship"**.
5. *What to say*: *"In real court proceedings, algorithms only provide investigative leads. PixelTrace requires a human-in-the-loop examiner review. Algorithms propose relationships as 'Suggested', and only an accredited examiner can advance them to 'Confirmed' or 'Rejected'. Every decision is cryptographically logged."*

---

### Step 6: Computer Vision Geometric Transformation Analysis
1. Navigate to **Transformation Analysis** (`/transformation`).
2. Select:
   - **Reference**: `01_original_evidence.png`
   - **Candidate**: `03_resized_50pct.png`
3. Click **"Analyze Transformation"**.
4. *What to point out on screen*:
   - OpenCV extracted keypoint descriptors using SIFT/ORB.
   - Keypoints were matched using Lowe's ratio test ($0.75$) and geometric RANSAC homography.
   - Point to the **Inlier Match Visualization** showing green correspondence vectors between matching visual features.
   - Point to the inference badge: **Scaling / Resizing detected**.

---

### Step 7: Metadata Correlation Matrix
1. Navigate to **Metadata Correlation** (`/metadata`).
2. Show the comparison matrix comparing camera make, model, software, color space, and GPS tags across all files.
3. *What to say*: *"When photos are shared on WhatsApp or social media, EXIF metadata is stripped. PixelTrace correlates any remaining metadata tags and safely handles missing headers without application failure."*

---

### Step 8: Chronological Investigation Audit Trail
1. Navigate to **Timeline** (`/timeline`).
2. Show the audit event feed.
3. *What to point out*: Every action — case creation, evidence upload, hash generation, integrity verification, examiner confirmation, and CV analysis — has a UTC timestamp and immutable record in SQLite.

---

### Step 9: Court-Ready PDF Forensic Report
1. Navigate to **Reports** (`/reports`).
2. Enter Examiner Notes:  
   `Exhibits 01 and 02 are bit-level duplicates. Exhibits 03 and 04 represent derived transformations (rescaling and JPEG recompression). Exhibit 06 is an unrelated image with no structural connection.`
3. Click **"Generate Forensic PDF Report"**.
4. Click **"Download PDF"** and open the generated file.
5. *Show the examiner the PDF*:
   - Official Case Header with Case Number and Examiner Name.
   - Evidence Inventory Table with 64-character SHA-256 hashes and acquisition timestamps.
   - Exact Duplicate Cluster summary.
   - Perceptual Hash Correlation Matrix.
   - Examiner Findings and Chain of Custody signature blocks.
   - Documented scientific limitations (ISO/IEC 27037 forensic guidelines).

---

## Part 2: How to Explain PixelTrace to Faculty / External Examiner

Use this structured script when explaining the project to your teacher (Mam / Sir).

### 1. Elevator Pitch (30 Seconds)
> *"Respected Ma'am/Sir, our project is **PixelTrace — Digital Image Provenance & Evidence Relationship Analyzer**.*  
> *In modern cyber forensics, images spread across social media, messaging apps, and forums are constantly resized, cropped, converted between PNG and JPEG, or stripped of metadata. Traditional digital forensics relies solely on cryptographic hashes like SHA-256 or MD5. But if a suspect merely resizes an image by 1 pixel or re-saves it as a JPEG, the SHA-256 hash changes completely, breaking the chain of evidence.*  
> *PixelTrace solves this problem by combining **cryptographic integrity verification** with **perceptual hashing (aHash, dHash, pHash)**, **computer vision transformation analysis (OpenCV SIFT & RANSAC)**, and an **interactive visual provenance graph** that tracks how an image was copied, scaled, or derived."*

---

### 2. The Core Problem We Solve
| Traditional Forensics | PixelTrace Solution |
|---|---|
| **SHA-256 Only**: Resizing an image causes hash collision failure; the system thinks it's a completely new image. | **Dual-Layer Analysis**: Uses SHA-256 for bit-level integrity, and pHash (DCT frequency analysis) for visual similarity. |
| **Manual Tracking**: Investigators have to manually cross-reference hundreds of photos. | **Interactive Provenance Graph**: Automatically connects identical, resized, or derived images in a visual node graph. |
| **No Transformation Proof**: Hard to prove *how* an image was altered. | **OpenCV Feature Matching**: Uses SIFT keypoints and RANSAC homography to mathematically prove cropping, rotation, or scaling. |
| **Missing Chain of Custody**: Scripts output loose terminal text that is inadmissible in court. | **ISO 27037 Audit Trail & PDF**: Immutable event logging and automated PDF report generation. |

---

### 3. Key Concepts to Mention During Viva

1. **Cryptographic Hash (SHA-256)**:
   - *Formula/Method*: Computes a 256-bit digest over raw file bytes.
   - *Property*: High avalanche effect. Changing 1 bit completely randomizes the hash. Used to prove byte-level authenticity.
2. **Perceptual Hash (pHash)**:
   - *Formula/Method*: Reduces image to $32 \times 32$ grayscale, computes Discrete Cosine Transform (DCT), takes the top $8 \times 8$ low-frequency components, and generates a 64-bit fingerprint.
   - *Property*: Robust against resizing, recompression, and minor color adjustments because human perception relies on low spatial frequencies.
3. **Hamming Distance**:
   - The number of bit positions in which two binary hashes differ ($XOR$ followed by bit population count).
   - $d = 0$: Exact visual match.
   - $d \le 4$: High-confidence visual duplicate.
   - $d \le 10$: Probable transformation (resized/recompressed).
   - $d \ge 16$: Unrelated image.
4. **Human-in-the-Loop Principle**:
   - Algorithms never make final judicial decisions. The system marks links as *Suggested*, and an accredited examiner must review and stamp them as *Confirmed by Examiner* or *Rejected by Examiner*.

---

## Part 3: Technology Stack & Forensic Tools Summary

| Component | Technology | Role / Purpose |
|---|---|---|
| **Backend Framework** | **Python 3.12 + FastAPI** | High-performance asynchronous REST API with automatic OpenAPI documentation. |
| **Database** | **SQLite + SQLAlchemy ORM** | Relational persistence for cases, evidence files, relationships, and audit trails. |
| **Cryptographic Hashing** | **Python `hashlib` (SHA-256)** | Computes non-invertible cryptographic digests on raw byte streams. |
| **Perceptual Hashing** | **`imagehash` + Pillow (PIL)** | Computes DCT-based pHash, gradient dHash, and average aHash (64-bit). |
| **Computer Vision** | **OpenCV (`cv2`)** | SIFT/ORB feature detection, FLANN/BFMatcher with Lowe's ratio test, and RANSAC homography. |
| **Metadata Extraction** | **Pillow EXIF + ExifTool** | Extracts camera parameters, timestamps, geolocation, and lens data. |
| **Forensic PDF Engine** | **ReportLab** | Generates multi-page court-ready PDF forensic reports with dynamic tables. |
| **Frontend Framework** | **React 18 + Vite + TypeScript** | Type-safe, reactive single-page interface with component-driven architecture. |
| **Styling** | **Tailwind CSS v4 + Lucide Icons** | Sleek dark-mode forensic workstation aesthetic with responsive layout. |
| **Graph Visualization** | **`@xyflow/react` (React Flow)** | Interactive node-link canvas for visualizing digital image provenance. |
| **Testing Suite** | **Pytest + FastAPI TestClient** | Automated test suite validating all 10 forensic modules with synthetic test images. |

---

## Part 4: Frequently Asked Questions & Viva Defense

**Q1: Why can't we just use SHA-256 for all forensic image analysis?**  
> *Answer*: SHA-256 is designed for data integrity, not visual similarity. Because of the avalanche effect, changing a single pixel or saving a PNG as a JPEG alters almost 50% of the hash bits. It cannot identify that two visually identical images share the same source if compression or scaling occurred.

**Q2: What is the difference between aHash, dHash, and pHash?**  
> *Answer*: 
> - **aHash (Average Hash)**: Compares each pixel to the average luminance. Fast, but sensitive to lighting variations.
> - **dHash (Difference Hash)**: Compares adjacent pixels along rows to measure gradients. Resilient to brightness changes.
> - **pHash (Perceptual Hash)**: Applies Discrete Cosine Transform (DCT) to isolate low-frequency components. Highly robust against scaling, compression, and contrast changes.

**Q3: Can perceptual hashing be used as direct proof in a court of law?**  
> *Answer*: No. Perceptual hashing is an investigative heuristic, not mathematical proof. It generates candidate leads for the forensic examiner. In our system, the examiner uses OpenCV feature matching and manual side-by-side inspection to confirm or reject relationships, maintaining the legal chain of custody.

**Q4: How does PixelTrace handle security risks like malicious archive uploads?**  
> *Answer*: We implemented Zip-Slip protection. When a ZIP evidence archive is uploaded, every extracted path is resolved against the target directory to reject path traversal attempts (e.g. `../../etc/passwd`). We also enforce decompression size limits to prevent zip bombs.

**Q5: What happens if an evidence file is altered on disk after ingestion?**  
> *Answer*: When the examiner clicks "Verify Integrity", PixelTrace recalculates the SHA-256 directly from disk and compares it to the original hash stored at ingestion. If any byte was altered, the status immediately triggers **`FAIL`** (Tamper Alert) and logs an event in the audit trail.
