import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { forensicApi } from '../services/api';
import { EvidenceFile, EvidenceRelationship } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  Copy,
  Check,
  Search,
  Cpu,
  Binary,
  RefreshCw,
  FileCode,
  Info
} from 'lucide-react';

export const EvidenceDetail: React.FC = () => {
  const { evidenceId } = useParams<{ evidenceId: string }>();
  const [evidence, setEvidence] = useState<EvidenceFile | null>(null);
  const [relationships, setRelationships] = useState<EvidenceRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [metadataSearch, setMetadataSearch] = useState('');

  const navigate = useNavigate();

  const loadData = async () => {
    if (!evidenceId) return;
    setLoading(true);
    try {
      const [evData, relData] = await Promise.all([
        forensicApi.getEvidenceDetail(evidenceId),
        forensicApi.getEvidenceRelationships(evidenceId)
      ]);
      setEvidence(evData);
      setRelationships(relData);
    } catch (err) {
      console.error('Failed to load evidence detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [evidenceId]);

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleVerify = async () => {
    if (!evidenceId) return;
    setVerifying(true);
    try {
      const res = await forensicApi.verifyIntegrity(evidenceId);
      setVerifyStatus(res.message);
      await loadData();
    } catch (err) {
      setVerifyStatus('Integrity verification check failed.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading || !evidence) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
        <span className="text-xs font-mono text-slate-300">RETRIEVING FORENSIC EVIDENCE RECORD...</span>
      </div>
    );
  }

  const rawTags = evidence.metadata?.raw_tags || {};
  const filteredRawTags = Object.entries(rawTags).filter(([k, v]) =>
    k.toLowerCase().includes(metadataSearch.toLowerCase()) ||
    String(v).toLowerCase().includes(metadataSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Navigation & Actions */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <button
          onClick={() => navigate('/evidence')}
          className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Evidence Collection</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate(`/similarity?query=${evidence.id}`)}
            className="flex items-center space-x-1.5 text-xs bg-sky-950/80 hover:bg-sky-900 text-sky-300 px-3 py-1.5 rounded border border-sky-800/60 font-mono"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Similarity Search</span>
          </button>
          <button
            onClick={() => navigate(`/transformation?ref=${evidence.id}`)}
            className="flex items-center space-x-1.5 text-xs bg-purple-950/80 hover:bg-purple-900 text-purple-300 px-3 py-1.5 rounded border border-purple-800/60 font-mono"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Transformation Analysis</span>
          </button>
          <button
            onClick={() => navigate(`/metadata?source=${evidence.id}`)}
            className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded border border-slate-700 font-mono"
          >
            <Binary className="w-3.5 h-3.5" />
            <span>Correlate Metadata</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Image & Hashes, Right Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Preview + Hashes */}
        <div className="lg:col-span-5 space-y-4">
          {/* Image Container */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded p-3 text-center space-y-2">
            <div className="relative group bg-[#070a0f] rounded overflow-hidden flex items-center justify-center p-2 min-h-[260px]">
              <img
                src={`/storage/evidence/${evidence.storage_reference}`}
                alt={evidence.original_filename}
                className="max-h-80 max-w-full object-contain rounded"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 px-1">
              <span>{evidence.width} x {evidence.height} px</span>
              <span>{evidence.image_format}</span>
              <span>{(evidence.file_size / 1024).toFixed(1)} KB</span>
            </div>
          </div>

          {/* Cryptographic Integrity Card */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Cryptographic Verification</span>
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  evidence.integrity_status === 'VERIFIED'
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                    : 'bg-red-950/80 text-red-400 border border-red-800/40'
                }`}
              >
                {evidence.integrity_status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="text-slate-300 text-[11px]">Recorded Acquisition SHA-256:</div>
              <div className="p-2 bg-[#101726] border border-slate-800 rounded break-all text-sky-300 text-[11px] flex items-center justify-between">
                <span>{evidence.sha256_hash}</span>
                <button
                  onClick={() => copyText('sha256', evidence.sha256_hash)}
                  className="text-slate-300 hover:text-white shrink-0 ml-2"
                >
                  {copiedKey === 'sha256' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-300">
                Last checked: {evidence.last_verified_at ? new Date(evidence.last_verified_at).toLocaleTimeString() : 'Never'}
              </span>
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded font-mono border border-slate-700"
              >
                {verifying ? 'Recalculating...' : 'Recalculate Hash'}
              </button>
            </div>

            {verifyStatus && (
              <div className="text-[11px] p-2 rounded bg-sky-950/40 text-sky-300 border border-sky-800/40 font-mono">
                {verifyStatus}
              </div>
            )}
          </div>

          {/* Perceptual Hashes Card */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded p-4 space-y-3">
            <div className="border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <Binary className="w-4 h-4 text-sky-400" />
                <span>Perceptual Hashes (64-bit)</span>
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {[
                { label: 'pHash (Perceptual)', val: evidence.phash, key: 'phash', note: 'DCT low-frequency representation (Default)' },
                { label: 'aHash (Average)', val: evidence.ahash, key: 'ahash', note: 'Mean luminance thresholding' },
                { label: 'dHash (Difference)', val: evidence.dhash, key: 'dhash', note: 'Adjacent horizontal pixel gradient' }
              ].map((item) => (
                <div key={item.key} className="p-2 bg-[#101726] border border-slate-800/80 rounded space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-semibold">{item.label}</span>
                    <button
                      onClick={() => item.val && copyText(item.key, item.val)}
                      className="text-slate-300 hover:text-white"
                    >
                      {copiedKey === item.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-sky-300 font-mono text-[11px]">{item.val || 'Not computed'}</div>
                  <div className="text-[9px] text-slate-300 font-sans">{item.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Metadata & Relationships */}
        <div className="lg:col-span-7 space-y-4">
          {/* Normalized Forensic Metadata */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <FileCode className="w-4 h-4 text-purple-400" />
                <span>Normalized Forensic Metadata</span>
              </span>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded">
                Parser: {evidence.metadata?.source_parser || 'Default'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {[
                { label: 'Camera Make', val: evidence.metadata?.make },
                { label: 'Camera Model', val: evidence.metadata?.model },
                { label: 'Lens Information', val: evidence.metadata?.lens },
                { label: 'Original Timestamp', val: evidence.metadata?.original_timestamp },
                { label: 'GPS Latitude', val: evidence.metadata?.gps_latitude },
                { label: 'GPS Longitude', val: evidence.metadata?.gps_longitude },
                { label: 'Software / Tool', val: evidence.metadata?.software },
                { label: 'Sensor Orientation', val: evidence.metadata?.orientation },
              ].map((m, idx) => {
                const isAvail = m.val && m.val !== 'Not available';
                return (
                  <div key={idx} className="p-2 bg-[#101726]/80 border border-slate-800/80 rounded">
                    <div className="text-[10px] text-slate-300 uppercase">{m.label}</div>
                    <div className={`text-xs mt-0.5 truncate ${isAvail ? 'text-slate-200 font-medium' : 'text-slate-300'}`}>
                      {m.val || 'Not available'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Raw Metadata Tag Browser */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2 gap-2">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Raw EXIF / Header Tags ({Object.keys(rawTags).length})
              </span>
              <input
                type="text"
                placeholder="Filter tags..."
                value={metadataSearch}
                onChange={(e) => setMetadataSearch(e.target.value)}
                className="bg-[#101726] border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-800/80 rounded divide-y divide-slate-800/60 font-mono text-xs">
              {filteredRawTags.length === 0 ? (
                <div className="p-4 text-center text-slate-300 text-xs">
                  {Object.keys(rawTags).length === 0 ? 'No raw EXIF tags embedded in file.' : 'No tags matched filter.'}
                </div>
              ) : (
                filteredRawTags.map(([k, v]) => (
                  <div key={k} className="p-2 flex items-start justify-between hover:bg-slate-800/30 text-[11px]">
                    <span className="text-slate-300 font-semibold max-w-[40%] break-all">{k}</span>
                    <span className="text-sky-300/90 text-right max-w-[58%] break-all">{String(v)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Known Relationships */}
          <div className="bg-[#0b0f19] border border-slate-800 rounded p-4 space-y-3">
            <div className="border-b border-slate-800 pb-2">
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Linked Evidence Relationships ({relationships.length})
              </span>
            </div>

            {relationships.length === 0 ? (
              <div className="text-xs text-slate-300 py-3 text-center">
                No active or suggested relationships linked to this image file.
              </div>
            ) : (
              <div className="space-y-2">
                {relationships.map((r) => {
                  const otherId = r.source_evidence_id === evidence.id ? r.target_evidence_id : r.source_evidence_id;
                  const otherName = r.source_evidence_id === evidence.id ? r.target_filename : r.source_filename;
                  return (
                    <div
                      key={r.id}
                      className="p-2.5 bg-[#101726] border border-slate-800 rounded flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-slate-200 flex items-center space-x-2">
                          <span className="font-mono text-sky-400">{r.relationship_type.replace('_', ' ').toUpperCase()}</span>
                          <span className="text-slate-300">↔</span>
                          <span>{otherName || otherId}</span>
                        </div>
                        <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                          Similarity: {r.similarity_value ? `${(r.similarity_value * 100).toFixed(1)}%` : 'N/A'} • Status: {r.status}
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/evidence/${otherId}`)}
                        className="text-xs text-sky-400 hover:underline font-mono"
                      >
                        Inspect Target
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
