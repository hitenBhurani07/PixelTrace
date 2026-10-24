import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import { forensicApi } from '../services/api';
import { EvidenceFile, TransformationAnalysisResult } from '../types';
import {
  Cpu,
  RefreshCw,
  ArrowRightLeft,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Layers,
  ZoomIn
} from 'lucide-react';

export const TransformationAnalysis: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') || '';
  const initialCand = searchParams.get('cand') || '';

  const { activeCase } = useCase();
  const [evidenceList, setEvidenceList] = useState<EvidenceFile[]>([]);
  const [refId, setRefId] = useState<string>(initialRef);
  const [candId, setCandId] = useState<string>(initialCand);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<TransformationAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchList = async () => {
      if (!activeCase) return;
      try {
        const list = await forensicApi.getCaseEvidence(activeCase.id);
        setEvidenceList(list);
        if (!refId && list.length > 0) setRefId(list[0].id);
        if (!candId && list.length > 1) setCandId(list[1].id);
      } catch (err) {
        console.error('Failed to load evidence for transformation analysis:', err);
      }
    };
    fetchList();
  }, [activeCase]);

  useEffect(() => {
    if (initialRef) setRefId(initialRef);
    if (initialCand) setCandId(initialCand);
  }, [initialRef, initialCand]);

  const handleRunAnalysis = async () => {
    if (!refId || !candId || refId === candId) return;

    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const data = await forensicApi.analyzeTransformation(refId, candId);
      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Transformation analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSwap = () => {
    const temp = refId;
    setRefId(candId);
    setCandId(temp);
  };

  const refEv = evidenceList.find(e => e.id === refId);
  const candEv = evidenceList.find(e => e.id === candId);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-purple-400" />
          <span>Image Transformation Analysis</span>
        </h1>
        <p className="text-xs text-slate-300 mt-0.5">
          Investigate resizing, recompression, geometric affine transformations, or cropping via OpenCV SIFT/ORB feature consensus and RANSAC homography.
        </p>
      </div>

      {/* Selector Strip */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
          {/* Reference Selector */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Reference Baseline Evidence
            </label>
            <select
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
              className="w-full bg-[#101726] border border-slate-700 text-xs text-slate-200 rounded p-2 focus:outline-none focus:border-sky-500 font-mono"
            >
              {evidenceList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.original_filename} ({e.width}x{e.height}, {e.image_format})
                </option>
              ))}
            </select>
          </div>

          {/* Swap */}
          <div className="md:col-span-1 flex justify-center pt-5">
            <button
              onClick={handleSwap}
              title="Swap reference and candidate"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Candidate Selector */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Candidate Transformed Evidence
            </label>
            <select
              value={candId}
              onChange={(e) => setCandId(e.target.value)}
              className="w-full bg-[#101726] border border-slate-700 text-xs text-slate-200 rounded p-2 focus:outline-none focus:border-sky-500 font-mono"
            >
              {evidenceList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.original_filename} ({e.width}x{e.height}, {e.image_format})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Thumbnail Comparison */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800">
          <div className="flex items-center space-x-3 p-2 bg-[#070a0f] rounded border border-slate-800 text-xs font-mono">
            {refEv ? (
              <>
                <img
                  src={`/storage/evidence/${refEv.storage_reference}`}
                  alt="Reference"
                  className="w-12 h-12 object-cover rounded bg-slate-900 border border-slate-800"
                />
                <div className="truncate">
                  <div className="text-slate-200 font-bold truncate">{refEv.original_filename}</div>
                  <div className="text-[10px] text-slate-300">{refEv.width}x{refEv.height} • {refEv.image_format}</div>
                </div>
              </>
            ) : <span className="text-slate-300">Select reference</span>}
          </div>

          <div className="flex items-center space-x-3 p-2 bg-[#070a0f] rounded border border-slate-800 text-xs font-mono">
            {candEv ? (
              <>
                <img
                  src={`/storage/evidence/${candEv.storage_reference}`}
                  alt="Candidate"
                  className="w-12 h-12 object-cover rounded bg-slate-900 border border-slate-800"
                />
                <div className="truncate">
                  <div className="text-slate-200 font-bold truncate">{candEv.original_filename}</div>
                  <div className="text-[10px] text-slate-300">{candEv.width}x{candEv.height} • {candEv.image_format}</div>
                </div>
              </>
            ) : <span className="text-slate-300">Select candidate</span>}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing || !refId || !candId || refId === candId}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs px-5 py-2 rounded transition-colors disabled:opacity-50 font-sans shadow"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Extracting Features & RANSAC Inliers...</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4" />
                <span>Execute Transformation Comparison</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-xs text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Forensic Cautious Disclaimer */}
      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded flex items-start space-x-2 text-[11px] text-slate-300">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-200 font-semibold">Forensic Methodology Rule:</strong> Computer vision feature matching (SIFT/ORB) establishes local invariant correspondence. Inferred transformations (such as resizing, recompression, or cropping) represent algorithmic hypotheses consistent with the observed data, not absolute legal certitude.
        </p>
      </div>

      {/* Results Display */}
      {result && (
        <div className="space-y-5">
          {/* Findings & Inferred Transformation Box */}
          <div className="p-4 bg-[#0b0f19] border border-purple-900/40 rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-purple-300 uppercase font-mono">
                Algorithmic Transformation Hypothesis
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  result.confidence_level === 'High'
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                    : result.confidence_level === 'Moderate'
                    ? 'bg-sky-950/80 text-sky-400 border border-sky-800/40'
                    : 'bg-amber-950/80 text-amber-400 border border-amber-800/40'
                }`}
              >
                Confidence: {result.confidence_level}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-sm font-bold text-slate-100 font-mono">
                {result.transformation_type_inferred}
              </div>
            </div>

            <p className="text-xs text-slate-200 font-sans leading-relaxed bg-[#070a0f] p-3 rounded border border-slate-800">
              {result.forensic_narrative}
            </p>
          </div>

          {/* Computer Vision Feature Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#0b0f19] border border-slate-800 p-3 rounded text-xs font-mono">
              <div className="text-[10px] text-slate-300 uppercase">Feature Detector</div>
              <div className="text-base font-bold text-purple-400 mt-1">{result.feature_method}</div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                Keypoints: {result.total_keypoints_ref} vs {result.total_keypoints_cand}
              </div>
            </div>

            <div className="bg-[#0b0f19] border border-slate-800 p-3 rounded text-xs font-mono">
              <div className="text-[10px] text-slate-300 uppercase">RANSAC Inliers</div>
              <div className="text-base font-bold text-emerald-400 mt-1">
                {result.inliers_count} points
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                Consensus Ratio: {(result.inlier_ratio * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-[#0b0f19] border border-slate-800 p-3 rounded text-xs font-mono">
              <div className="text-[10px] text-slate-300 uppercase">Dimension Change</div>
              <div className={`text-base font-bold mt-1 ${result.dimension_change_percentage === 0 ? 'text-slate-200' : 'text-sky-400'}`}>
                {result.dimension_change_percentage > 0 ? `+${result.dimension_change_percentage}%` : `${result.dimension_change_percentage}%`}
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                {result.reference_dimensions} → {result.candidate_dimensions}
              </div>
            </div>

            <div className="bg-[#0b0f19] border border-slate-800 p-3 rounded text-xs font-mono">
              <div className="text-[10px] text-slate-300 uppercase">Perceptual pHash Distance</div>
              <div className="text-base font-bold text-sky-400 mt-1">
                {result.perceptual_hash_distance} / 64 bits
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5">
                Similarity: {(result.perceptual_similarity * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* SIFT / ORB Inlier Matches Visualization */}
          {result.visualization_image_url && (
            <div className="bg-[#0b0f19] border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                  <ZoomIn className="w-4 h-4 text-purple-400" />
                  <span>Geometric Feature Correspondence & Inliers Map</span>
                </span>
                <span className="text-[10px] font-mono text-slate-300">
                  Lowe's Ratio 0.75 + RANSAC Filtered
                </span>
              </div>

              <div className="bg-[#070a0f] p-2 rounded border border-slate-800 text-center">
                <img
                  src={result.visualization_image_url}
                  alt="Feature Match Alignment"
                  className="max-h-[480px] w-auto mx-auto object-contain rounded"
                />
              </div>

              <div className="text-[11px] text-slate-300 font-mono text-center">
                Lines indicate verified geometric point correspondences connecting local scale-invariant descriptors between the reference image (left) and candidate (right).
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
