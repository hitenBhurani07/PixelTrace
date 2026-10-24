import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import { forensicApi } from '../services/api';
import { EvidenceFile, MetadataComparisonResult } from '../types';
import {
  Binary,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRightLeft,
  FileCode,
  ShieldAlert
} from 'lucide-react';

export const MetadataCorrelation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialSource = searchParams.get('source') || '';
  const initialTarget = searchParams.get('target') || '';

  const { activeCase } = useCase();
  const [evidenceList, setEvidenceList] = useState<EvidenceFile[]>([]);
  const [sourceId, setSourceId] = useState<string>(initialSource);
  const [targetId, setTargetId] = useState<string>(initialTarget);
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<MetadataComparisonResult | null>(null);

  useEffect(() => {
    const fetchList = async () => {
      if (!activeCase) return;
      setLoadingEvidence(true);
      try {
        const list = await forensicApi.getCaseEvidence(activeCase.id);
        setEvidenceList(list);
        if (!sourceId && list.length > 0) setSourceId(list[0].id);
        if (!targetId && list.length > 1) setTargetId(list[1].id);
      } catch (err) {
        console.error('Failed to load evidence for metadata comparison:', err);
      } finally {
        setLoadingEvidence(false);
      }
    };
    fetchList();
  }, [activeCase]);

  // Sync search params
  useEffect(() => {
    if (initialSource) setSourceId(initialSource);
    if (initialTarget) setTargetId(initialTarget);
  }, [initialSource, initialTarget]);

  const handleRunComparison = async () => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    setComparing(true);
    try {
      const data = await forensicApi.compareMetadata(sourceId, targetId);
      setResult(data);
    } catch (err) {
      console.error('Metadata comparison failed:', err);
    } finally {
      setComparing(false);
    }
  };

  const handleSwap = () => {
    const temp = sourceId;
    setSourceId(targetId);
    setTargetId(temp);
  };

  const sourceEv = evidenceList.find(e => e.id === sourceId);
  const targetEv = evidenceList.find(e => e.id === targetId);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center space-x-2">
          <Binary className="w-5 h-5 text-purple-400" />
          <span>Metadata Correlation & EXIF Analysis</span>
        </h1>
        <p className="text-xs text-slate-300 mt-0.5">
          Side-by-side comparative inspection of embedded camera hardware, timestamps, GPS coordinates, and software tags.
        </p>
      </div>

      {/* Selector Strip */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
          {/* Source Selector */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Source Evidence
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full bg-[#101726] border border-slate-700 text-xs text-slate-200 rounded p-2 focus:outline-none focus:border-sky-500 font-mono"
            >
              {evidenceList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.original_filename} ({e.image_format}, {e.width}x{e.height})
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center pt-5">
            <button
              onClick={handleSwap}
              title="Swap source and candidate"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Target Selector */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Candidate Target Evidence
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-[#101726] border border-slate-700 text-xs text-slate-200 rounded p-2 focus:outline-none focus:border-sky-500 font-mono"
            >
              {evidenceList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.original_filename} ({e.image_format}, {e.width}x{e.height})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Thumbnail Preview Banner */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800">
          <div className="flex items-center space-x-3 p-2 bg-[#070a0f] rounded border border-slate-800 text-xs font-mono">
            {sourceEv ? (
              <>
                <img
                  src={`/storage/evidence/${sourceEv.storage_reference}`}
                  alt="Source"
                  className="w-11 h-11 object-cover rounded bg-slate-900 border border-slate-800"
                />
                <div className="truncate">
                  <div className="text-slate-200 font-bold truncate">{sourceEv.original_filename}</div>
                  <div className="text-[10px] text-slate-300">{sourceEv.id}</div>
                </div>
              </>
            ) : <span className="text-slate-300">Select source evidence</span>}
          </div>

          <div className="flex items-center space-x-3 p-2 bg-[#070a0f] rounded border border-slate-800 text-xs font-mono">
            {targetEv ? (
              <>
                <img
                  src={`/storage/evidence/${targetEv.storage_reference}`}
                  alt="Target"
                  className="w-11 h-11 object-cover rounded bg-slate-900 border border-slate-800"
                />
                <div className="truncate">
                  <div className="text-slate-200 font-bold truncate">{targetEv.original_filename}</div>
                  <div className="text-[10px] text-slate-300">{targetEv.id}</div>
                </div>
              </>
            ) : <span className="text-slate-300">Select candidate evidence</span>}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleRunComparison}
            disabled={comparing || !sourceId || !targetId || sourceId === targetId}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs px-5 py-2 rounded transition-colors disabled:opacity-50 font-sans shadow"
          >
            {comparing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Correlating Tags...</span>
              </>
            ) : (
              <>
                <Binary className="w-4 h-4" />
                <span>Compare Metadata Fields</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Forensic Disclaimer */}
      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded flex items-start space-x-2 text-[11px] text-slate-300">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-200 font-semibold">Forensic Evidentiary Disclaimer:</strong> Metadata tags can be trivially copied, altered, or stripped during transmission across web services. Matching metadata indicates hardware or temporal consistency, but cannot establish definitive proof of provenance without corroborating cryptographic and pixel-level evidence.
        </p>
      </div>

      {/* Results Comparison Table */}
      {result && (
        <div className="space-y-4">
          {/* Summary Box */}
          <div className="p-4 bg-[#0b0f19] border border-purple-900/40 rounded-lg space-y-2">
            <div className="text-xs font-semibold text-purple-300 uppercase tracking-wider font-mono">
              Correlation Finding Summary
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {result.correlation_summary}
            </p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80 font-mono text-[10px]">
              <span className={`px-2 py-0.5 rounded ${result.shared_camera_model ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-300'}`}>
                {result.shared_camera_model ? '✓ Camera Model Match' : '✗ Camera Model Discrepancy'}
              </span>
              <span className={`px-2 py-0.5 rounded ${result.shared_capture_date ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-300'}`}>
                {result.shared_capture_date ? '✓ Timestamp Match' : '✗ Different Capture Time'}
              </span>
              <span className={`px-2 py-0.5 rounded ${result.shared_gps_location ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-300'}`}>
                {result.shared_gps_location ? '✓ GPS Location Match' : '✗ No GPS Match'}
              </span>
              <span className={`px-2 py-0.5 rounded ${result.shared_software ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-300'}`}>
                {result.shared_software ? '✓ Software Tag Match' : '✗ Different Software'}
              </span>
            </div>
          </div>

          {/* Detailed Side-by-Side Table */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#101726] border-b border-slate-800 text-slate-300 text-[11px] font-mono uppercase">
                  <th className="py-2.5 px-3 w-1/4">Metadata Field</th>
                  <th className="py-2.5 px-3 w-1/3">Source Value ({result.source_filename})</th>
                  <th className="py-2.5 px-3 w-1/3">Target Value ({result.target_filename})</th>
                  <th className="py-2.5 px-3 text-right">Correlation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {result.fields.map((f, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-200">{f.field_name}</div>
                      <div className="text-[10px] text-slate-300 font-sans mt-0.5">{f.forensic_significance}</div>
                    </td>
                    <td className="py-2.5 px-3 break-all text-slate-300">
                      {String(f.source_value || 'Not available')}
                    </td>
                    <td className="py-2.5 px-3 break-all text-slate-300">
                      {String(f.target_value || 'Not available')}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {f.matches ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>MATCH</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-300 border border-slate-700/60">
                          <XCircle className="w-3 h-3 text-slate-300" />
                          <span>DIFF / N/A</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
