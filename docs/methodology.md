# PixelTrace Forensic Methodology & Scientific Algorithms

## 1. Cryptographic Integrity: SHA-256

PixelTrace uses the SHA-256 (Secure Hash Algorithm 256-bit) cryptographic hash function to establish byte-level integrity:
- **Input**: The exact raw binary byte sequence of the acquired image file on disk.
- **Output**: A 64-character hexadecimal string representing the 256-bit digest.
- **Forensic Principle**: Even a 1-bit alteration anywhere in the file produces an avalanche effect resulting in a completely different digest.
- **Exact Duplicate Identification**: Images sharing identical SHA-256 digests are mathematically certain to be byte-for-byte identical, regardless of filename or filesystem timestamps.

---

## 2. Perceptual Hashing & Hamming Distance

Unlike cryptographic hashes which fail upon minor recompression or format changes, perceptual hashing extracts scale- and frequency-invariant visual fingerprints.

PixelTrace supports three perceptual hashing algorithms:
1. **pHash (Perceptual Hash - Default)**:
   - Resizes image to $32 \times 32$ pixels and converts to grayscale.
   - Computes the 2D Discrete Cosine Transform (DCT).
   - Extracts the $8 \times 8$ low-frequency sub-matrix (which captures human visual structure while ignoring fine noise).
   - Computes the median frequency value and generates a 64-bit binary hash based on whether each coefficient is above or below the median.
2. **aHash (Average Hash)**:
   - Resizes to $8 \times 8$ grayscale and compares each pixel to the mean pixel luminance.
3. **dHash (Difference Hash)**:
   - Resizes to $9 \times 8$ grayscale and computes gradients between adjacent horizontal pixels.

### Hamming Distance Calculation
Given two 64-bit perceptual hashes $H_1$ and $H_2$, the Hamming distance $d(H_1, H_2)$ counts the number of bit positions in which the two values differ:
$$d(H_1, H_2) = \sum_{i=1}^{64} (H_1[i] \oplus H_2[i])$$

### Normalized Similarity Formula
$$\text{Normalized Similarity} = 1.0 - \left(\frac{d(H_1, H_2)}{64}\right)$$

### Forensic Preset Thresholds
- **Strict ($d \le 4$)**: Normalized similarity $\ge 93.75\%$. Indicates near-identical visual rendering (lossless or high-quality lossy transcoding).
- **Balanced ($d \le 10$)**: Normalized similarity $\ge 84.38\%$. Tolerates moderate JPEG recompression, minor downscaling, or color profile shifts.
- **Broad ($d \le 16$)**: Normalized similarity $\ge 75.0\%$. Flags potential heavy transformations, severe downsampling, or cropping.

---

## 3. Computer Vision Transformation Analysis

To investigate *how* an image was transformed, PixelTrace performs invariant feature analysis:
1. **Detector & Descriptor**:
   - SIFT (Scale-Invariant Feature Transform) detects scale-space extrema across Gaussian octaves.
   - Fallback to ORB (Oriented FAST and Rotated BRIEF) when SIFT is restricted.
2. **Descriptor Matching & Lowe's Ratio Test**:
   - Compares descriptors using $k$-nearest neighbors ($k=2$).
   - Rejects ambiguous matches using Lowe's ratio test:
     $$\text{Match accepted if } d(m_1) < 0.75 \times d(m_2)$$
3. **RANSAC Geometric Homography**:
   - Applies Random Sample Consensus (RANSAC) with a reprojection threshold of 5.0 pixels to fit a planar homography matrix $H$:
     $$\mathbf{x}' \sim H \mathbf{x}$$
   - Counts geometric *inliers* (points conforming to the transformation model) versus outliers.
4. **Hypothesis Formulation**:
   - Preserved aspect ratio with high inliers and volume change $\rightarrow$ **Resizing / Scaling**.
   - Preserved aspect ratio with minimal volume change and high pHash $\rightarrow$ **Recompression / Transcoding**.
   - Altered aspect ratio with local inliers $\rightarrow$ **Cropping / Aspect Ratio Alteration**.
   - Geometric matrix convergence $\rightarrow$ **Affine / Planar Perspective Transformation**.

---

## 4. Metadata Correlation Engine

Extracted fields are analyzed across multiple forensic dimensions:
- **Hardware Profile**: Make, Model, Lens Serial.
- **Temporal Alignment**: `DateTimeOriginal` vs `CreateDate` (with explicit UTC normalization).
- **Geospatial Proximity**: GPS Latitude / Longitude coordinates.
- **Software Signatures**: Post-capture editor signatures (e.g. Adobe Photoshop, GIMP, firmware build).

---

## 5. Examiner Adjudication Workflow

To avoid deceptive automated assumptions, relationships follow an explicit adjudicative lifecycle:
1. **Suggested**: Generated algorithmically (e.g. perceptual match or duplicate hash).
2. **Under Review**: Flagged by investigator for detailed examination.
3. **Confirmed by Examiner**: Examiner validates common provenance with recorded forensic notes.
4. **Rejected by Examiner**: Examiner rules out common lineage (e.g. visually similar stock photos or unrelated repetitive scenes).
