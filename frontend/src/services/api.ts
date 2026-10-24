import axios from 'axios';
import {
  InvestigationCase, EvidenceFile, ExactDuplicatesResult,
  SimilaritySearchResult, EvidenceRelationship, GraphData,
  MetadataComparisonResult, TransformationAnalysisResult,
  TimelineEvent, InvestigationReport, DashboardStats,
  IntegrityVerificationResult
} from '../types';

const api = axios.create({
  baseURL: '/api',
});

export const forensicApi = {
  // System & Stats
  getHealth: () => api.get('/health').then(r => r.data),
  getStats: (): Promise<DashboardStats> => api.get('/stats').then(r => r.data),
  compareMetadata: (sourceId: string, targetId: string): Promise<MetadataComparisonResult> =>
    api.get('/metadata/compare', { params: { source_id: sourceId, target_id: targetId } }).then(r => r.data),

  // Cases
  getCases: (params?: { status?: string; search?: string }): Promise<InvestigationCase[]> =>
    api.get('/cases', { params }).then(r => r.data),
  getCase: (id: number): Promise<InvestigationCase> =>
    api.get(`/cases/${id}`).then(r => r.data),
  createCase: (data: { title: string; description?: string; examiner?: string; case_number?: string }): Promise<InvestigationCase> =>
    api.post('/cases', data).then(r => r.data),
  updateCase: (id: number, data: { title?: string; description?: string; examiner?: string; status?: string }): Promise<InvestigationCase> =>
    api.patch(`/cases/${id}`, data).then(r => r.data),
  
  // Case Evidence
  getCaseEvidence: (caseId: number): Promise<EvidenceFile[]> =>
    api.get(`/cases/${caseId}/evidence`).then(r => r.data),
  uploadEvidence: (caseId: number, files: File[]): Promise<EvidenceFile[]> => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return api.post(`/cases/${caseId}/evidence`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  getCaseDuplicates: (caseId: number): Promise<ExactDuplicatesResult> =>
    api.get(`/cases/${caseId}/duplicates`).then(r => r.data),
  getCaseGraph: (caseId: number): Promise<GraphData> =>
    api.get(`/cases/${caseId}/graph`).then(r => r.data),
  getCaseTimeline: (caseId: number): Promise<TimelineEvent[]> =>
    api.get(`/cases/${caseId}/timeline`).then(r => r.data),
  generateCaseReport: (caseId: number, data: { examiner_notes?: string; include_timeline?: boolean; include_transformation_analyses?: boolean }): Promise<InvestigationReport> =>
    api.post(`/cases/${caseId}/reports`, data).then(r => r.data),
  getCaseReports: (caseId: number): Promise<InvestigationReport[]> =>
    api.get(`/cases/${caseId}/reports`).then(r => r.data),

  // Evidence Deep Inspection
  getEvidenceDetail: (evidenceId: string): Promise<EvidenceFile> =>
    api.get(`/evidence/${evidenceId}`).then(r => r.data),
  getEvidenceMetadata: (evidenceId: string) =>
    api.get(`/evidence/${evidenceId}/metadata`).then(r => r.data),
  verifyIntegrity: (evidenceId: string): Promise<IntegrityVerificationResult> =>
    api.post(`/evidence/${evidenceId}/verify-integrity`).then(r => r.data),
  searchSimilarity: (evidenceId: string, params: {
    algorithm?: string;
    threshold_preset?: string;
    max_hamming_distance?: number;
    scope_case_id?: number;
  }): Promise<SimilaritySearchResult> =>
    api.post(`/evidence/${evidenceId}/similarity-search`, params).then(r => r.data),
  getEvidenceRelationships: (evidenceId: string): Promise<EvidenceRelationship[]> =>
    api.get(`/evidence/${evidenceId}/relationships`).then(r => r.data),
  analyzeTransformation: (evidenceId: string, candidateId: string): Promise<TransformationAnalysisResult> =>
    api.post(`/evidence/${evidenceId}/transformation-analysis`, {
      reference_evidence_id: evidenceId,
      candidate_evidence_id: candidateId
    }).then(r => r.data),

  // Relationships
  getRelationships: (params?: { status?: string; relationship_type?: string }): Promise<EvidenceRelationship[]> =>
    api.get('/relationships', { params }).then(r => r.data),
  createRelationship: (data: {
    source_evidence_id: string;
    target_evidence_id: string;
    relationship_type?: string;
    algorithm?: string;
    similarity_value?: number;
    confidence_category?: string;
    status?: string;
    examiner_notes?: string;
  }): Promise<EvidenceRelationship> =>
    api.post('/relationships', data).then(r => r.data),
  updateRelationship: (id: number, data: { status?: string; examiner_notes?: string }): Promise<EvidenceRelationship> =>
    api.patch(`/relationships/${id}`, data).then(r => r.data),
};
