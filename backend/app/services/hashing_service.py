import hashlib
from typing import Tuple, Dict, Any, Optional
from pathlib import Path
from PIL import Image
import imagehash

class HashingService:
    HASH_SIZE = 8  # 8x8 -> 64 bits (16 hex chars)
    TOTAL_BITS = 64

    @staticmethod
    def calculate_sha256_bytes(data: bytes) -> str:
        """Calculates SHA-256 directly from raw file bytes."""
        hasher = hashlib.sha256()
        hasher.update(data)
        return hasher.hexdigest().lower()

    @staticmethod
    def calculate_sha256_file(file_path: Path) -> str:
        """Calculates SHA-256 directly from file on disk without decoding."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest().lower()

    @classmethod
    def calculate_perceptual_hashes(cls, image_path: Path) -> Dict[str, str]:
        """
        Calculates aHash, dHash, and pHash using ImageHash.
        Images are opened safely in memory with Pillow.
        """
        with Image.open(image_path) as img:
            # Convert to RGB to normalize transparency/palettes before hashing
            if img.mode not in ("RGB", "L"):
                rgb_img = img.convert("RGB")
            else:
                rgb_img = img

            ahash_val = str(imagehash.average_hash(rgb_img, hash_size=cls.HASH_SIZE))
            dhash_val = str(imagehash.dhash(rgb_img, hash_size=cls.HASH_SIZE))
            phash_val = str(imagehash.phash(rgb_img, hash_size=cls.HASH_SIZE))

        return {
            "ahash": ahash_val,
            "dhash": dhash_val,
            "phash": phash_val,
        }

    @classmethod
    def hamming_distance(cls, hash1_hex: str, hash2_hex: str) -> int:
        """Calculates bitwise Hamming distance between two hex hash representations."""
        h1 = imagehash.hex_to_hash(hash1_hex)
        h2 = imagehash.hex_to_hash(hash2_hex)
        return int(h1 - h2)

    @classmethod
    def calculate_similarity(cls, hash1_hex: str, hash2_hex: str) -> Tuple[int, float, str]:
        """
        Returns (hamming_distance, normalized_similarity, confidence_category).
        Normalized similarity = 1 - (hamming_distance / total_bits)
        """
        distance = cls.hamming_distance(hash1_hex, hash2_hex)
        norm_similarity = max(0.0, min(1.0, 1.0 - (distance / float(cls.TOTAL_BITS))))

        if distance == 0:
            category = "Exact Visual Match (Non-Cryptographic)"
        elif distance <= 4:
            category = "Strong Visual Similarity"
        elif distance <= 10:
            category = "Possible Visual Relationship"
        else:
            category = "Weak/No Similarity"

        return distance, round(norm_similarity, 4), category

hashing_service = HashingService()
