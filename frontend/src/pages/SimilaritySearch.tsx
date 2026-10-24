import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import { forensicApi } from '../services/api';
import { EvidenceFile, SimilaritySearchResult, SimilaritySearchResultItem } from '../types';
import {
  Search,
  Sliders,
  GitCompare,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Binary,
  RefreshCw
} from 'lucide-react';

export const SimilaritySearch: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQueryId = searchParams.get('query') || '';
  const { activeCase, cases } = useCase();

  const [evidenceList, setEvidenceList] = useState<EvidenceFile[]>([]);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>(initialQueryId);
  const [algorithm, setAlgorithm] = useState<'phash' | 'ahash' | 'dhash'>('phash');
  const [preset, setPreset] = useState<'strict' | 'balanced' | 'broad' | 'custom'>('balanced');
  const [customDistance, setCustomDistance] = useState<number>(10);
  const [scopeCaseId, setScopeCaseId] = useState<number | undefined>(activeCase?.id);

  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SimilaritySearchResult | null>(null);
  const [linkingCandidateId, setLinkingCandidateId] = useState<string | null>(null);
  const [linkSuccessMsg, setLinkSuccessMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  // Load available evidence pool
  useEffect(() => {
    const fetchEvidence = async () => {
      setLoadingEvidence(true);
      try {
        if (activeCase) {
          const list = await forensicApi.getCaseEvidence(activeCase.id);
          setEvidenceList(list);
          if (!selectedEvidenceId && list.length > 0) {
            setSelectedEvidenceId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load candidate pool:', err);
      } finally {
        setLoadingEvidence(false);
      }
    };
    fetchEvidence();
  }, [activeCase]);

  // Sync initial query param
  useEffect(() => {
    if (initialQueryId) {
      setSelectedEvidenceId(initialQueryId);
    }
  }, [initialQueryId]);

  const handleRunSearch = async () => {
    if (!selectedEvidenceId) return;

    setSearching(true);
    setLinkSuccessMsg(null);
    try {
      const maxDistance = preset === 'custom' ? customDistance : undefined;
      const res = await forensicApi.searchSimilarity(selectedEvidenceId, {
        algorithm,
        threshold_preset: preset,
        max_hamming_distance: maxDistance,
        scope_case_id: scopeCaseId
      });
      setSearchResults(res);
    } catch (err: any) {
      console.error('Similarity search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateRelationship = async (candidate: SimilaritySearchResultItem) => {
    if (!selectedEvidenceId) return;
    setLinkingCandidateId(candidate.candidate_id);
    try {
      await forensicApi.createRelationship({
        source_evidence_id: selectedEvidenceId,
        target_evidence_id: candidate.candidate_id,
        relationship_type: candidate.hamming_distance === 0 ? 'exact_duplicate' : 'perceptual_similarity',
        algorithm: candidate.algorithm,
        similarity_value: candidate.normalized_similarity,
        confidence_category: candidate.confidence_category,
        status: 'Suggested',
        examiner_notes: `Algorithmically suggested by ${candidate.algorithm.toUpperCase()} (Hamming distance ${candidate.hamming_distance}/64, ${(candidate.normalized_similarity * 100).toFixed(1)}%).`
      });
      setLinkSuccessMsg(`Relationship created with ${candidate.candidate_filename} (Status: Suggested).`);
      // Update result state locally
      setSearchResults(prev => {
        if (!prev) return null;
        return {
          ...prev,
          results: prev.results.map(r =>
            r.candidate_id === candidate.candidate_id
              ? { ...r, has_existing_relationship: true, existing_relationship_status: 'Suggested' }
              : r
          )
        };
      });
    } catch (err) {
      console.error('Failed to link relationship:', err);
    } finally {
      setLinkingCandidateId(null);
    }
  };

  const selectedEvidence = evidenceList.find(e => e.id === selectedEvidenceId);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100 tracking-tight">Perceptual Image Similarity Search</h1>
        <p className="text-xs text-slate-300 mt-0.5">
          Locate visually related digital images using bitwise Hamming distance across frequency (pHash), luminance (aHash), and gradient (dHash) hashes.
        </p>
      </div>

      {/* Control Panel: Query Image, Algorithm, Presets */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Select Query Image */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              1. Query Evidence Image
            </label>
            {evidenceList.length === 0 ? (
              <div className="text-xs text-slate-300 py-2">No evidence files available in case.</div>
            ) : (
              <select
                value={selectedEvidenceId}
                onChange={(e) => setSelectedEvidenceId(e.target.value)}
                className="w-full bg-[#101726] border border-slate-700 text-xs text-slate-200 rounded p-2 focus:outline-none focus:border-sky-500 font-mono"
              >
                {evidenceList.map((e) => (
                  <option key={e.id} value={e.id}>
                    [{e.id.substring(0, 14)}...] {e.original_filename} ({e.width}x{e.height})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Algorithm Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              2. Perceptual Algorithm
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'phash', label: 'pHash', desc: 'DCT (Default)' },
                { id: 'ahash', label: 'aHash', desc: 'Luminance' },
                { id: 'dhash', label: 'dHash', desc: 'Gradient' },
              ].map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAlgorithm(a.id as any)}
                  className={`p-2 rounded text-center border transition-all ${
                    algorithm === a.id
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/60 font-semibold'
                      : 'bg-[#101726] text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-mono">{a.label}</div>
                  <div className="text-[9px] text-slate-300">{a.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Threshold Preset */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              3. Hamming Distance Preset
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'strict', label: 'Strict', d: 'd ≤ 4' },
                { id: 'balanced', label: 'Balanced', d: 'd ≤ 10' },
                { id: 'broad', label: 'Broad', d: 'd ≤ 16' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id as any)}
                  className={`p-2 rounded text-center border transition-all ${
                    preset === p.id
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/60 font-semibold'
                      : 'bg-[#101726] text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs">{p.label}</div>
                  <div className="text-[9px] font-mono text-slate-300">{p.d}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Query Image Preview Strip & Execute Action */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {selectedEvidence ? (
            <div className="flex items-center space-x-3 text-xs font-mono">
              <img
                src={`/storage/evidence/${selectedEvidence.storage_reference}`}
                alt={selectedEvidence.original_filename}
                className="w-10 h-10 object-cover rounded border border-slate-700"
              />
              <div>
                <span className="text-slate-200 font-semibold">{selectedEvidence.original_filename}</span>
                <div className="text-[10px] text-sky-400">
                  {algorithm.toUpperCase()}: {selectedEvidence[algorithm] || 'Computed on demand'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-300">Select an evidence file above.</div>
          )}

          <button
            onClick={handleRunSearch}
            disabled={searching || !selectedEvidenceId}
            className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs px-5 py-2.5 rounded shadow transition-colors disabled:opacity-50"
          >
            {searching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Computing Hamming Distances...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Execute Similarity Search</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Forensic Disclaimer Alert */}
      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded flex items-start space-x-2 text-[11px] text-slate-300">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-200 font-semibold">Forensic Methodology Note:</strong> Perceptual hashing calculates bitwise distance across image frequency spectra. A match indicates algorithmic visual similarity, but does NOT establish common origin, authentic ownership, or chain-of-custody without corroborating metadata and feature analysis.
        </p>
      </div>

      {linkSuccessMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded text-xs text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{linkSuccessMsg}</span>
        </div>
      )}

      {/* Search Results Display */}
      {searchResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <GitCompare className="w-4 h-4 text-sky-400" />
              <span>
                Search Results ({searchResults.total_matches} candidate match{searchResults.total_matches === 1 ? '' : 'es'})
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-300">
              Cutoff: Hamming distance ≤ {searchResults.max_distance_applied} bits
            </span>
          </div>

          {searchResults.results.length === 0 ? (
            <div className="text-center py-12 bg-[#0b0f19] border border-slate-800 rounded text-xs text-slate-300">
              No images in candidate pool met the threshold (Hamming distance ≤ {searchResults.max_distance_applied}). Try expanding to the "Broad" preset.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.results.map((res) => {
                const isExact = res.hamming_distance === 0;
                return (
                  <div
                    key={res.candidate_id}
                    className={`bg-[#0b0f19] border rounded p-4 flex flex-col justify-between space-y-3 ${
                      isExact ? 'border-emerald-700/60' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Comparison Badges */}
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            isExact
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                              : 'bg-sky-950/80 text-sky-300 border border-sky-800/40'
                          }`}
                        >
                          {res.confidence_category}
                        </span>

                        <div className="flex items-center space-x-2 font-mono text-xs">
                          <span className="text-slate-300">Distance:</span>
                          <span className="font-bold text-sky-400">{res.hamming_distance} / 64</span>
                          <span className="text-slate-600">|</span>
                          <span className="font-bold text-emerald-400">
                            {(res.normalized_similarity * 100).toFixed(1)}% Sim
                          </span>
                        </div>
                      </div>

                      {/* Side by Side Preview */}
                      <div className="grid grid-cols-2 gap-2 p-2 bg-[#070a0f] rounded border border-slate-800/80">
                        {/* Query Side */}
                        <div className="space-y-1 text-center">
                          <div className="text-[10px] text-slate-300 uppercase font-mono">Query Image</div>
                          {selectedEvidence && (
                            <img
                              src={`/storage/evidence/${selectedEvidence.storage_reference}`}
                              alt="Query"
                              className="w-full h-24 object-contain rounded bg-slate-900"
                            />
                          )}
                          <div className="text-[10px] font-mono text-slate-300 truncate">
                            {selectedEvidence?.original_filename}
                          </div>
                        </div>

                        {/* Candidate Side */}
                        <div className="space-y-1 text-center">
                          <div className="text-[10px] text-sky-400 uppercase font-mono">Candidate Match</div>
                          {/* Use thumbnail URL */}
                          <img
                            src={`/storage/evidence/${evidenceList.find(e => e.id === res.candidate_id)?.storage_reference}`}
                            alt="Candidate"
                            className="w-full h-24 object-contain rounded bg-slate-900"
                          />
                          <div className="text-[10px] font-mono text-slate-300 truncate">
                            {res.candidate_filename}
                          </div>
                        </div>
                      </div>

                      {/* Hash Detail */}
                      <div className="mt-2 space-y-1 text-[11px] font-mono text-slate-300">
                        <div className="flex justify-between">
                          <span>Dimensions:</span>
                          <span className="text-slate-300">{res.candidate_dimensions} ({res.candidate_format})</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Candidate Hash:</span>
                          <span className="text-sky-300">{res.candidate_hash}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/transformation?ref=${selectedEvidenceId}&cand=${res.candidate_id}`)}
                          className="flex items-center space-x-1 text-purple-400 hover:text-purple-300 text-[11px]"
                        >
                          <Cpu className="w-3.5 h-3.5" />
                          <span>CV Transform</span>
                        </button>
                        <button
                          onClick={() => navigate(`/metadata?source=${selectedEvidenceId}&target=${res.candidate_id}`)}
                          className="flex items-center space-x-1 text-slate-300 hover:text-white text-[11px]"
                        >
                          <Binary className="w-3.5 h-3.5" />
                          <span>EXIF Diff</span>
                        </button>
                      </div>

                      {res.has_existing_relationship ? (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/40">
                          Linked ({res.existing_relationship_status})
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCreateRelationship(res)}
                          disabled={linkingCandidateId === res.candidate_id}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-[11px] font-medium font-sans"
                        >
                          {linkingCandidateId === res.candidate_id ? 'Proposing...' : 'Link Relationship'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
