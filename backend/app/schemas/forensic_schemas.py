from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# --- Cases ---
class CaseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    examiner: Optional[str] = None
    case_number: Optional[str] = None

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    examiner: Optional[str] = None
    status: Optional[str] = None

class CaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_number: str
    title: str
    description: Optional[str] = None
    examiner: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    status: str
    evidence_count: int = 0

# --- Evidence ---
class EvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    case_id: int
    original_filename: str
    storage_reference: str
    sha256_hash: str
    file_size: int
    image_format: str
    width: int
    height: int
    acquisition_timestamp: datetime
    ahash: Optional[str] = None
    dhash: Optional[str] = None
    phash: Optional[str] = None
    integrity_status: str
    last_verified_at: Optional[datetime] = None

class EvidenceDetailResponse(EvidenceResponse):
    metadata: Optional[Dict[str, Any]] = None

# --- Integrity ---
class IntegrityVerificationResponse(BaseModel):
    evidence_id: str
    original_filename: str
    recorded_sha256: str
    calculated_sha256: Optional[str] = None
    status: str  # "PASS", "FAIL", "MISSING"
    verified_at: datetime
    message: str

# --- Exact Duplicates ---
class DuplicateGroup(BaseModel):
    sha256_hash: str
    file_count: int
    total_size: int
    files: List[EvidenceResponse]

class ExactDuplicatesResponse(BaseModel):
    total_groups: int
    total_duplicate_files: int
    groups: List[DuplicateGroup]

# --- Similarity Search ---
class SimilaritySearchRequest(BaseModel):
    scope_case_id: Optional[int] = None  # None = search across all cases
    algorithm: str = Field(default="phash", pattern="^(phash|ahash|dhash)$")
    threshold_preset: Optional[str] = "balanced"  # "strict", "balanced", "broad", "custom"
    max_hamming_distance: Optional[int] = 10  # default for balanced

class SimilaritySearchResultItem(BaseModel):
    candidate_id: str
    candidate_filename: str
    candidate_case_id: int
    candidate_dimensions: str
    candidate_format: str
    algorithm: str
    query_hash: str
    candidate_hash: str
    hamming_distance: int
    normalized_similarity: float
    confidence_category: str  # "Exact Duplicate", "Strong Visual Similarity", "Possible Visual Relationship", "Weak/No Similarity"
    has_existing_relationship: bool = False
    existing_relationship_status: Optional[str] = None

class SimilaritySearchResponse(BaseModel):
    query_evidence_id: str
    algorithm: str
    max_distance_applied: int
    total_matches: int
    results: List[SimilaritySearchResultItem]

# --- Relationships ---
class RelationshipCreate(BaseModel):
    source_evidence_id: str
    target_evidence_id: str
    relationship_type: str = "perceptual_similarity"
    algorithm: Optional[str] = None
    similarity_value: Optional[float] = None
    confidence_category: Optional[str] = None
    status: str = "Suggested"
    examiner_notes: Optional[str] = None

class RelationshipUpdate(BaseModel):
    status: Optional[str] = None  # "Suggested", "Under Review", "Confirmed by Examiner", "Rejected by Examiner"
    examiner_notes: Optional[str] = None

class RelationshipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_evidence_id: str
    target_evidence_id: str
    relationship_type: str
    algorithm: Optional[str] = None
    similarity_value: Optional[float] = None
    confidence_category: Optional[str] = None
    status: str
    examiner_notes: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    source_filename: Optional[str] = None
    target_filename: Optional[str] = None

# --- Graph ---
class GraphNode(BaseModel):
    id: str
    label: str
    case_id: int
    dimensions: str
    format: str
    file_size: int
    sha256_short: str
    thumbnail_url: str

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship_type: str
    algorithm: Optional[str] = None
    similarity_value: Optional[float] = None
    status: str
    confidence_category: Optional[str] = None
    examiner_notes: Optional[str] = None

class GraphDataResponse(BaseModel):
    case_id: Optional[int] = None
    nodes: List[GraphNode]
    edges: List[GraphEdge]

# --- Metadata Correlation ---
class MetadataComparisonField(BaseModel):
    field_name: str
    source_value: Optional[Any] = None
    target_value: Optional[Any] = None
    matches: bool
    forensic_significance: Optional[str] = None

class MetadataComparisonResponse(BaseModel):
    source_evidence_id: str
    target_evidence_id: str
    source_filename: str
    target_filename: str
    shared_camera_model: bool
    shared_capture_date: bool
    shared_gps_location: bool
    shared_software: bool
    fields: List[MetadataComparisonField]
    correlation_summary: str

# --- Transformation Analysis ---
class TransformationAnalysisRequest(BaseModel):
    reference_evidence_id: str
    candidate_evidence_id: str

class TransformationAnalysisResponse(BaseModel):
    reference_id: str
    candidate_id: str
    reference_dimensions: str
    candidate_dimensions: str
    aspect_ratio_match: bool
    aspect_ratio_ref: float
    aspect_ratio_cand: float
    dimension_change_percentage: float
    perceptual_hash_distance: int
    perceptual_similarity: float
    feature_method: str  # "SIFT" or "ORB"
    total_keypoints_ref: int
    total_keypoints_cand: int
    good_matches_count: int
    inliers_count: int
    inlier_ratio: float
    geometric_model_fitted: bool
    transformation_type_inferred: str  # "Resizing", "Recompression", "Rotation/Affine", "Crop/Partial", "Undetermined"
    confidence_level: str  # "High", "Moderate", "Inconclusive"
    forensic_narrative: str
    visualization_image_url: Optional[str] = None

# --- Timeline ---
class TimelineEventResponse(BaseModel):
    id: int
    case_id: Optional[int] = None
    evidence_id: Optional[str] = None
    event_type: str
    event_timestamp: datetime
    details: Optional[Dict[str, Any]] = None
    examiner_notes: Optional[str] = None

# --- Reports ---
class ReportGenerateRequest(BaseModel):
    examiner_notes: Optional[str] = None
    include_timeline: bool = True
    include_transformation_analyses: bool = True

class ReportResponse(BaseModel):
    id: int
    case_id: int
    report_reference: str
    generated_at: datetime
    file_size: int
    download_url: str

# --- Dashboard Stats ---
class DashboardStatsResponse(BaseModel):
    total_cases: int
    total_evidence_files: int
    total_exact_duplicate_groups: int
    total_near_duplicate_relationships: int
    total_images_with_metadata: int
    total_unresolved_relationships: int
    recent_cases: List[CaseResponse]
    recent_evidence: List[EvidenceResponse]
