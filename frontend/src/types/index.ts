export interface InvestigationCase {
  id: number;
  case_number: string;
  title: string;
  description?: string;
  examiner?: string;
  created_at: string;
  updated_at: string;
  status: 'Active' | 'Archived';
  evidence_count: number;
}

export interface EvidenceFile {
  id: string;
  case_id: number;
  original_filename: string;
  storage_reference: string;
  sha256_hash: string;
  file_size: number;
  image_format: string;
  width: number;
  height: number;
  acquisition_timestamp: string;
  ahash?: string;
  dhash?: string;
  phash?: string;
  integrity_status: 'VERIFIED' | 'CORRUPTED' | 'MISSING' | 'UNVERIFIED';
  last_verified_at?: string;
  metadata?: Record<string, any>;
}

export interface IntegrityVerificationResult {
  evidence_id: string;
  original_filename: string;
  recorded_sha256: string;
  calculated_sha256?: string;
  status: 'PASS' | 'FAIL' | 'MISSING';
  verified_at: string;
  message: string;
}

export interface DuplicateGroup {
  sha256_hash: string;
  file_count: number;
  total_size: number;
  files: EvidenceFile[];
}

export interface ExactDuplicatesResult {
  total_groups: number;
  total_duplicate_files: number;
  groups: DuplicateGroup[];
}

export interface SimilaritySearchResultItem {
  candidate_id: string;
  candidate_filename: string;
  candidate_case_id: number;
  candidate_dimensions: string;
  candidate_format: string;
  algorithm: string;
  query_hash: string;
  candidate_hash: string;
  hamming_distance: number;
  normalized_similarity: number;
  confidence_category: string;
  has_existing_relationship: boolean;
  existing_relationship_status?: string;
}

export interface SimilaritySearchResult {
  query_evidence_id: string;
  algorithm: string;
  max_distance_applied: number;
  total_matches: number;
  results: SimilaritySearchResultItem[];
}

export interface EvidenceRelationship {
  id: number;
  source_evidence_id: string;
  target_evidence_id: string;
  relationship_type: 'exact_duplicate' | 'perceptual_similarity' | 'metadata_correlation' | 'examiner_confirmed' | 'examiner_rejected';
  algorithm?: string;
  similarity_value?: number;
  confidence_category?: string;
  status: 'Suggested' | 'Under Review' | 'Confirmed by Examiner' | 'Rejected by Examiner';
  examiner_notes?: string;
  created_at: string;
  reviewed_at?: string;
  source_filename?: string;
  target_filename?: string;
}

export interface GraphNode extends Record<string, unknown> {
  id: string;
  label: string;
  case_id: number;
  dimensions: string;
  format: string;
  file_size: number;
  sha256_short: string;
  thumbnail_url: string;
}

export interface GraphEdge extends Record<string, unknown> {
  id: string;
  source: string;
  target: string;
  relationship_type: string;
  algorithm?: string;
  similarity_value?: number;
  status: string;
  confidence_category?: string;
  examiner_notes?: string;
}

export interface GraphData {
  case_id?: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface MetadataComparisonField {
  field_name: string;
  source_value?: any;
  target_value?: any;
  matches: boolean;
  forensic_significance?: string;
}

export interface MetadataComparisonResult {
  source_evidence_id: string;
  target_evidence_id: string;
  source_filename: string;
  target_filename: string;
  shared_camera_model: boolean;
  shared_capture_date: boolean;
  shared_gps_location: boolean;
  shared_software: boolean;
  fields: MetadataComparisonField[];
  correlation_summary: string;
}

export interface TransformationAnalysisResult {
  reference_id: string;
  candidate_id: string;
  reference_dimensions: string;
  candidate_dimensions: string;
  aspect_ratio_match: boolean;
  aspect_ratio_ref: number;
  aspect_ratio_cand: number;
  dimension_change_percentage: number;
  perceptual_hash_distance: number;
  perceptual_similarity: number;
  feature_method: string;
  total_keypoints_ref: number;
  total_keypoints_cand: number;
  good_matches_count: number;
  inliers_count: number;
  inlier_ratio: number;
  geometric_model_fitted: boolean;
  transformation_type_inferred: string;
  confidence_level: string;
  forensic_narrative: string;
  visualization_image_url?: string;
}

export interface TimelineEvent {
  id: number;
  case_id?: number;
  evidence_id?: string;
  event_type: string;
  event_timestamp: string;
  details?: Record<string, any>;
  examiner_notes?: string;
}

export interface InvestigationReport {
  id: number;
  case_id: number;
  report_reference: string;
  generated_at: string;
  file_size: number;
  download_url: string;
}

export interface DashboardStats {
  total_cases: number;
  total_evidence_files: number;
  total_exact_duplicate_groups: number;
  total_near_duplicate_relationships: number;
  total_images_with_metadata: number;
  total_unresolved_relationships: number;
  recent_cases: InvestigationCase[];
  recent_evidence: EvidenceFile[];
}
