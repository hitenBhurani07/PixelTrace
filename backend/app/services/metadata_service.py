import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from PIL import Image, ExifTags
import math

class MetadataService:
    def __init__(self):
        # Check if exiftool binary is accessible in system PATH
        self.exiftool_available = shutil.which("exiftool") is not None

    def extract_metadata(self, file_path: Path) -> Dict[str, Any]:
        """
        Extracts structured metadata using ExifTool if available,
        otherwise safely falls back to Pillow EXIF parser.
        """
        if self.exiftool_available:
            try:
                return self._extract_with_exiftool(file_path)
            except Exception:
                pass
        
        return self._extract_with_pillow(file_path)

    def _extract_with_exiftool(self, file_path: Path) -> Dict[str, Any]:
        cmd = ["exiftool", "-j", "-G", str(file_path)]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=10)
        if res.returncode == 0:
            data = json.loads(res.stdout)
            if data and isinstance(data, list):
                raw = data[0]
                return self._normalize_exiftool_metadata(raw)
        return self._extract_with_pillow(file_path)

    def _normalize_exiftool_metadata(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        def get_field(*keys):
            for k in keys:
                for raw_k, v in raw.items():
                    if raw_k.endswith(k) or raw_k == k:
                        return v
            return "Not available"

        return {
            "source_parser": "ExifTool",
            "make": str(get_field("Make")),
            "model": str(get_field("Model")),
            "lens": str(get_field("LensModel", "LensInfo", "Lens")),
            "original_timestamp": str(get_field("DateTimeOriginal", "CreateDate")),
            "digitized_timestamp": str(get_field("CreateDate", "ModifyDate")),
            "gps_latitude": str(get_field("GPSLatitude")),
            "gps_longitude": str(get_field("GPSLongitude")),
            "software": str(get_field("Software")),
            "orientation": str(get_field("Orientation")),
            "color_space": str(get_field("ColorSpace")),
            "image_width": str(get_field("ImageWidth")),
            "image_height": str(get_field("ImageHeight")),
            "raw_tags": {k: str(v) for k, v in list(raw.items())[:60]}
        }

    def _extract_with_pillow(self, file_path: Path) -> Dict[str, Any]:
        result = {
            "source_parser": "Pillow (Fallback)",
            "make": "Not available",
            "model": "Not available",
            "lens": "Not available",
            "original_timestamp": "Not available",
            "digitized_timestamp": "Not available",
            "gps_latitude": "Not available",
            "gps_longitude": "Not available",
            "software": "Not available",
            "orientation": "Not available",
            "color_space": "Not available",
            "image_width": "Not available",
            "image_height": "Not available",
            "raw_tags": {}
        }

        try:
            with Image.open(file_path) as img:
                result["image_width"] = str(img.width)
                result["image_height"] = str(img.height)
                result["color_space"] = img.mode

                exif = img.getexif()
                if not exif:
                    return result

                raw_tags = {}
                for tag_id, val in exif.items():
                    tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                    # Convert bytes to string if needed
                    if isinstance(val, bytes):
                        try:
                            val_str = val.decode("utf-8", errors="ignore").strip("\x00")
                        except Exception:
                            val_str = str(val)
                    else:
                        val_str = str(val)
                    raw_tags[tag_name] = val_str

                result["raw_tags"] = raw_tags
                if "Make" in raw_tags:
                    result["make"] = raw_tags["Make"]
                if "Model" in raw_tags:
                    result["model"] = raw_tags["Model"]
                if "Software" in raw_tags:
                    result["software"] = raw_tags["Software"]
                if "DateTimeOriginal" in raw_tags:
                    result["original_timestamp"] = raw_tags["DateTimeOriginal"]
                elif "DateTime" in raw_tags:
                    result["original_timestamp"] = raw_tags["DateTime"]
                if "Orientation" in raw_tags:
                    result["orientation"] = raw_tags["Orientation"]

                # Check GPS if available in IFD
                try:
                    from PIL.ExifTags import IFD
                    gps_ifd = exif.get_ifd(IFD.GPSInfo)
                    if gps_ifd:
                        gps_tags = {}
                        for k, v in gps_ifd.items():
                            sub_tag = ExifTags.GPSTAGS.get(k, str(k))
                            gps_tags[sub_tag] = str(v)
                        result["raw_tags"].update({f"GPS_{k}": v for k, v in gps_tags.items()})
                        if "GPSLatitude" in gps_tags and "GPSLongitude" in gps_tags:
                            result["gps_latitude"] = f"{gps_tags.get('GPSLatitudeRef', '')} {gps_tags['GPSLatitude']}"
                            result["gps_longitude"] = f"{gps_tags.get('GPSLongitudeRef', '')} {gps_tags['GPSLongitude']}"
                except Exception:
                    pass

        except Exception as e:
            result["extraction_error"] = str(e)

        return result

    def correlate_metadata(
        self,
        meta1: Dict[str, Any],
        meta2: Dict[str, Any],
        name1: str = "Evidence A",
        name2: str = "Evidence B"
    ) -> Dict[str, Any]:
        """
        Performs field-by-field correlation between two extracted metadata sets.
        Avoids arbitrary confidence scores and highlights matching/conflicting forensic fields.
        """
        comparisons = []
        matching_fields = 0
        total_assessed = 0

        fields_to_check = [
            ("Make", "make", "Indicates hardware manufacturer."),
            ("Model", "model", "Indicates specific device model."),
            ("Lens Information", "lens", "Identifies optical hardware."),
            ("Original Timestamp", "original_timestamp", "Capture date/time recorded by camera clock."),
            ("GPS Coordinates", "gps_latitude", "Geographic capture location."),
            ("Software / Processing", "software", "Post-processing editor or firmware signature."),
            ("Resolution / Dimensions", "image_width", "Original capture pixel geometry."),
            ("Orientation", "orientation", "Camera sensor orientation at capture.")
        ]

        shared_camera = False
        shared_time = False
        shared_gps = False
        shared_soft = False

        for label, key, note in fields_to_check:
            val1 = meta1.get(key, "Not available")
            val2 = meta2.get(key, "Not available")

            is_avail = val1 not in ("Not available", "", "None") and val2 not in ("Not available", "", "None")
            matches = is_avail and (str(val1).strip().lower() == str(val2).strip().lower())

            if is_avail:
                total_assessed += 1
                if matches:
                    matching_fields += 1

            if matches:
                if key == "model":
                    shared_camera = True
                elif key == "original_timestamp":
                    shared_time = True
                elif key == "gps_latitude":
                    shared_gps = True
                elif key == "software":
                    shared_soft = True

            comparisons.append({
                "field_name": label,
                "source_value": val1,
                "target_value": val2,
                "matches": matches,
                "forensic_significance": note
            })

        # Summary note with cautious forensic language
        summary_points = []
        if shared_camera:
            summary_points.append("Both files record an identical camera model.")
        if shared_time:
            summary_points.append("Both files share an exact capture timestamp.")
        if shared_gps:
            summary_points.append("Both files share matching GPS coordinates.")
        if shared_soft:
            summary_points.append("Both files record an identical software tag.")
        
        if not summary_points:
            summary = "No decisive metadata correlation was identified. Metadata may have been stripped, modified, or recorded under different device configurations."
        else:
            summary = "Observed correlation: " + " ".join(summary_points) + " Note: Metadata can be easily duplicated or manipulated; findings must be corroborated with visual and cryptographic evidence."

        return {
            "source_filename": name1,
            "target_filename": name2,
            "shared_camera_model": shared_camera,
            "shared_capture_date": shared_time,
            "shared_gps_location": shared_gps,
            "shared_software": shared_soft,
            "fields": comparisons,
            "correlation_summary": summary
        }

metadata_service = MetadataService()
