# Scientific Limitations & Forensic Disclaimers

## 1. Visual Similarity Is Not Proof of Common Origin
- **False Positives**: Images depicting identical architectural landmarks, generic stock backgrounds, synthetic textures, or repetitive geometric patterns may yield low Hamming distances and high perceptual similarity scores despite having completely unrelated origins and distinct creators.
- **Algorithmic Nature**: Perceptual hashing (aHash, dHash, pHash) measures frequency-domain mathematical proximity. It does not possess semantic comprehension of artistic authorship or authentic capture history.

---

## 2. False Negatives in Perceptual Matching
- **Severe Cropping**: When an image is heavily cropped (&gt;30% boundary removal), the global Discrete Cosine Transform coefficients change substantially, resulting in high Hamming distances even though the subregion was copied.
- **Non-Linear Warping**: Extreme perspective shifts, curved surface projections, or local fish-eye distortions can defeat rigid geometric homography models.

---

## 3. Metadata Reliability & Vulnerability to Tampering
- **Metadata Fragility**: Standard EXIF, IPTC, and XMP metadata headers are stored as unencrypted text tags within image file headers. Any user or basic software tool can alter timestamps, inject fabricated GPS coordinates, or forge camera make and model strings.
- **Social Media Scrubbing**: Mainstream social networks and messaging applications (e.g. WhatsApp, Instagram, X/Twitter, Facebook) automatically strip all EXIF metadata upon upload to conserve bandwidth and protect user privacy. The absence of metadata is normal for web-sourced images and does not imply intentional forensic wiping.

---

## 4. Scope of Cryptographic Hash Verification
- **Acquisition Boundary**: A passing SHA-256 integrity check certifies solely that the file currently stored on disk is byte-for-byte identical to the file received by PixelTrace at the moment of acquisition.
- **Prior History**: SHA-256 cannot certify what occurred to the image file prior to acquisition (e.g. prior edits, metadata tampering, or synthetic generation).

---

## 5. Educational and Academic Research Disclaimer
PixelTrace is engineered as an educational digital forensics tool for academic coursework, demonstrations, and research into image lineage algorithms. It is **not** a certified law enforcement evidentiary tool and does not claim compliance with statutory judicial chain-of-custody standards (such as ISO/IEC 17025 or ISO/IEC 27037).
