import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import uuid
from backend.app.core.config import settings
from backend.app.services.hashing_service import hashing_service

class TransformationService:
    def analyze_transformation(
        self,
        ref_path: Path,
        cand_path: Path,
        ref_id: str,
        cand_id: str
    ) -> Dict[str, Any]:
        """
        Performs computer vision-based transformation analysis using SIFT/ORB feature matching,
        Lowe's ratio test, and RANSAC homography estimation.
        """
        # Load images with OpenCV
        img1 = cv2.imread(str(ref_path))
        img2 = cv2.imread(str(cand_path))

        if img1 is None or img2 is None:
            raise ValueError("Unable to decode one or both image files for transformation analysis.")

        h1, w1 = img1.shape[:2]
        h2, w2 = img2.shape[:2]

        aspect_ratio_1 = round(w1 / float(h1), 4)
        aspect_ratio_2 = round(w2 / float(h2), 4)
        ar_diff = abs(aspect_ratio_1 - aspect_ratio_2)
        ar_match = ar_diff < 0.02

        dim_change_pct = round(((w2 * h2) - (w1 * h1)) / float(w1 * h1) * 100.0, 2)

        # Perceptual hash comparison
        hashes1 = hashing_service.calculate_perceptual_hashes(ref_path)
        hashes2 = hashing_service.calculate_perceptual_hashes(cand_path)
        phash_dist, phash_sim, _ = hashing_service.calculate_similarity(hashes1["phash"], hashes2["phash"])

        # Feature matching (SIFT default, ORB fallback)
        gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
        gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

        feature_method = "SIFT"
        try:
            detector = cv2.SIFT_create()
            kp1, des1 = detector.detectAndCompute(gray1, None)
            kp2, des2 = detector.detectAndCompute(gray2, None)
            matcher = cv2.BFMatcher(cv2.NORM_L2)
        except Exception:
            feature_method = "ORB"
            detector = cv2.ORB_create(nfeatures=2000)
            kp1, des1 = detector.detectAndCompute(gray1, None)
            kp2, des2 = detector.detectAndCompute(gray2, None)
            matcher = cv2.BFMatcher(cv2.NORM_HAMMING)

        good_matches = []
        if des1 is not None and des2 is not None and len(des1) >= 4 and len(des2) >= 4:
            try:
                knn_matches = matcher.knnMatch(des1, des2, k=2)
                # Lowe's ratio test
                for m_pair in knn_matches:
                    if len(m_pair) == 2:
                        m, n = m_pair
                        if m.distance < 0.75 * n.distance:
                            good_matches.append(m)
            except Exception:
                pass

        inliers_count = 0
        inlier_ratio = 0.0
        geometric_fitted = False
        inlier_matches = []

        if len(good_matches) >= 8:
            src_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
            dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

            # Find homography with RANSAC
            H, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
            if mask is not None:
                matches_mask = mask.ravel().tolist()
                inliers_count = int(np.sum(matches_mask))
                inlier_ratio = round(inliers_count / float(len(good_matches)), 4)
                geometric_fitted = inliers_count >= 10
                inlier_matches = [m for idx, m in enumerate(good_matches) if matches_mask[idx]]

        # Generate side-by-side feature match visualization
        vis_filename = f"match_{ref_id}_{cand_id}_{uuid.uuid4().hex[:8]}.jpg"
        vis_path = settings.DERIVED_DIR / vis_filename
        
        matches_to_draw = inlier_matches[:50] if inlier_matches else good_matches[:50]
        vis_img = cv2.drawMatches(
            img1, kp1, img2, kp2, matches_to_draw, None,
            flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS
        )
        # Limit visualization resolution for fast network transport
        if vis_img.shape[1] > 1600:
            scale = 1600.0 / vis_img.shape[1]
            vis_img = cv2.resize(vis_img, (1600, int(vis_img.shape[0] * scale)))
        cv2.imwrite(str(vis_path), vis_img)

        # Infer transformation hypothesis
        transformation_type, confidence_level, narrative = self._infer_transformation(
            w1=w1, h1=h1, w2=w2, h2=h2,
            ar_match=ar_match, dim_change_pct=dim_change_pct,
            phash_dist=phash_dist, phash_sim=phash_sim,
            inliers_count=inliers_count, inlier_ratio=inlier_ratio,
            geometric_fitted=geometric_fitted, total_good=len(good_matches)
        )

        return {
            "reference_id": ref_id,
            "candidate_id": cand_id,
            "reference_dimensions": f"{w1}x{h1}",
            "candidate_dimensions": f"{w2}x{h2}",
            "aspect_ratio_match": ar_match,
            "aspect_ratio_ref": aspect_ratio_1,
            "aspect_ratio_cand": aspect_ratio_2,
            "dimension_change_percentage": dim_change_pct,
            "perceptual_hash_distance": phash_dist,
            "perceptual_similarity": phash_sim,
            "feature_method": feature_method,
            "total_keypoints_ref": len(kp1),
            "total_keypoints_cand": len(kp2),
            "good_matches_count": len(good_matches),
            "inliers_count": inliers_count,
            "inlier_ratio": inlier_ratio,
            "geometric_model_fitted": geometric_fitted,
            "transformation_type_inferred": transformation_type,
            "confidence_level": confidence_level,
            "forensic_narrative": narrative,
            "visualization_image_url": f"/storage/derived/{vis_filename}"
        }

    def _infer_transformation(
        self,
        w1: int, h1: int, w2: int, h2: int,
        ar_match: bool, dim_change_pct: float,
        phash_dist: int, phash_sim: float,
        inliers_count: int, inlier_ratio: float,
        geometric_fitted: bool, total_good: int
    ) -> Tuple[str, str, str]:
        """Formulates cautious, forensically conservative transformation hypotheses."""
        if phash_dist == 0 and w1 == w2 and h1 == h2:
            return (
                "Exact Visual Match",
                "High",
                "Observed visual content and pixel dimensions are identical. Consistent with duplicate rendering or lossless recompression."
            )

        if ar_match and abs(dim_change_pct) > 2.0 and (geometric_fitted or phash_sim > 0.85):
            scale_dir = "downscaling" if dim_change_pct < 0 else "upscaling"
            confidence = "High" if inliers_count > 25 else "Moderate"
            return (
                "Resizing / Scaling",
                confidence,
                f"Observed visual similarity (pHash {phash_sim*100:.1f}%) and preserved aspect ratio are consistent with possible {scale_dir} ({dim_change_pct:+.1f}% pixel volume change)."
            )

        if geometric_fitted and ar_match and abs(dim_change_pct) <= 2.0 and phash_dist <= 6:
            return (
                "Recompression / Format Conversion",
                "High" if inliers_count > 20 else "Moderate",
                f"Image dimensions are virtually identical, with high geometric feature consensus ({inliers_count} inliers). Differences are consistent with lossy JPEG/WebP recompression or format transcoding."
            )

        if geometric_fitted and not ar_match and inliers_count >= 15:
            return (
                "Cropping / Aspect Ratio Alteration",
                "Moderate",
                f"Strong local feature correspondence ({inliers_count} inliers) alongside differing aspect ratios ({w1}:{h1} vs {w2}:{h2}) is consistent with potential cropping, border padding, or non-uniform scaling."
            )

        if geometric_fitted and inliers_count >= 10:
            return (
                "Geometric / Affine Transformation",
                "Moderate",
                f"Feature alignment succeeded via RANSAC ({inliers_count} inliers), suggesting possible planar rotation, perspective adjustment, or compound transformation."
            )

        if phash_sim > 0.85:
            return (
                "Probable Transformation (Uncertain Mode)",
                "Low",
                "High perceptual hash similarity detected, but geometric feature matching yielded insufficient consensus to reliably establish the specific transformation pathway."
            )

        return (
            "Undetermined",
            "Inconclusive",
            "Insufficient evidence or feature correspondence to establish an algorithmic transformation relationship between these evidence files."
        )

transformation_service = TransformationService()
