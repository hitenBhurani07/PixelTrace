import React, { useState, useEffect, useRef } from 'react';
import { useCase } from '../context/CaseContext';
import { forensicApi } from '../services/api';
import { EvidenceFile, ExactDuplicatesResult } from '../types';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Layers,
  CopyCheck,
  ShieldCheck,
  ShieldAlert,
  Search,
  Cpu,
  Eye,
  Copy,
  Check,
  RefreshCw,
  FileArchive,
  AlertCircle
} from 'lucide-react';

export const EvidenceCollection: React.FC = () => {
  const { activeCase } = useCase();
  const [evidenceList, setEvidenceList] = useState<EvidenceFile[]>([]);
  const [duplicates, setDuplicates] = useState<ExactDuplicatesResult | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'duplicates'>('inventory');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const loadCaseEvidence = async () => {
    if (!activeCase) return;
    setLoading(true);
    try {
      const [evData, dupData] = await Promise.all([
        forensicApi.getCaseEvidence(activeCase.id),
        forensicApi.getCaseDuplicates(activeCase.id)
      ]);
      setEvidenceList(evData);
      setDuplicates(dupData);
    } catch (err) {
      console.error('Failed to load evidence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseEvidence();
  }, [activeCase]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeCase) return;

    setUploading(true);
    setUploadError(null);
    try {
      const fileArr = Array.from(files);
      await forensicApi.uploadEvidence(activeCase.id, fileArr);
      await loadCaseEvidence();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to acquire and process uploaded file(s).');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleVerifyIntegrity = async (evidenceId: string) => {
    setVerifyingId(evidenceId);
    try {
      const result = await forensicApi.verifyIntegrity(evidenceId);
      setVerificationFeedback(prev => ({
        ...prev,
        [evidenceId]: result.status === 'PASS' ? 'INTEGRITY PASS: SHA-256 matches recorded bytes' : `INTEGRITY ${result.status}`
      }));
      await loadCaseEvidence();
    } catch (err: any) {
      setVerificationFeedback(prev => ({
        ...prev,
        [evidenceId]: 'Verification failed'
      }));
    } finally {
      setVerifyingId(null);
    }
  };

  if (!activeCase) {
    return (
      <div className="p-8 bg-[#0b0f19] border border-slate-800 rounded text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
        <h3 className="text-sm font-semibold text-slate-100">No Active Case Selected</h3>
        <p className="text-xs text-slate-300">
          Please select or create an investigation case from the header to view or acquire evidence.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Case Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">Evidence Acquisition & Preservation</h1>
            <span className="font-mono text-xs bg-sky-950/80 text-sky-400 border border-sky-800/60 px-2 py-0.5 rounded">
              {activeCase.case_number}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Immutable forensic preservation with SHA-256 cryptographic hashing and perceptual fingerprinting.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadCaseEvidence}
            className="flex items-center space-x-1 text-xs bg-[#101726] hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded border border-slate-700 font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Acquisition Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        className="border-2 border-dashed border-slate-700 hover:border-sky-500/80 bg-[#0b0f19]/80 rounded-lg p-6 text-center space-y-3 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".jpg,.jpeg,.png,.webp,.tif,.tiff,.zip"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />

        <div className="w-12 h-12 mx-auto rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
          <UploadCloud className="w-6 h-6" />
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-200">
            {uploading ? 'Processing & Preserving Evidence...' : 'Acquire Evidence Images or ZIP Archive'}
          </div>
          <p className="text-[11px] text-slate-300 mt-1 max-w-md mx-auto">
            Drop images (JPEG, PNG, WebP, TIFF) or a ZIP collection. File bytes are preserved verbatim, SHA-256 computed on raw bytes, and perceptual hashes generated.
          </p>
        </div>

        <div className="flex items-center justify-center space-x-3 text-[10px] font-mono text-slate-300 pt-1">
          <span>Max 20MB / Image</span>
          <span>•</span>
          <span>Max 150MB / ZIP</span>
          <span>•</span>
          <span className="text-emerald-400 font-medium">Safe Zip Extraction Enforced</span>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded text-xs text-red-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Tabs: Evidence Inventory vs Exact Duplicates */}
      <div className="flex items-center space-x-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-2.5 text-xs font-semibold flex items-center space-x-2 transition-colors border-b-2 ${
            activeTab === 'inventory'
              ? 'border-sky-400 text-sky-300'
              : 'border-transparent text-slate-300 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Evidence Inventory ({evidenceList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('duplicates')}
          className={`pb-2.5 text-xs font-semibold flex items-center space-x-2 transition-colors border-b-2 ${
            activeTab === 'duplicates'
              ? 'border-emerald-400 text-emerald-300'
              : 'border-transparent text-slate-300 hover:text-slate-200'
          }`}
        >
          <CopyCheck className="w-4 h-4" />
          <span>Exact Duplicate Groups ({duplicates?.total_groups || 0})</span>
        </button>
      </div>

      {/* TAB 1: Evidence Inventory Table */}
      {activeTab === 'inventory' && (
        <div className="bg-[#0b0f19] border border-slate-800 rounded overflow-hidden">
          {evidenceList.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-300">
              No evidence acquired for this case yet. Upload image files above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#101726] border-b border-slate-800 text-slate-300 text-[11px] font-mono uppercase">
                    <th className="py-2.5 px-3">Preview</th>
                    <th className="py-2.5 px-3">Evidence ID & Filename</th>
                    <th className="py-2.5 px-3">Resolution & Format</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">SHA-256 Hash</th>
                    <th className="py-2.5 px-3">Integrity</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {evidenceList.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <img
                          src={`/storage/evidence/${ev.storage_reference}`}
                          alt={ev.original_filename}
                          className="w-12 h-12 object-cover rounded bg-slate-900 border border-slate-800"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-200 font-medium font-sans">{ev.original_filename}</div>
                        <div className="text-[10px] text-sky-400/90">{ev.id}</div>
                        <div className="text-[10px] text-slate-300 font-sans">
                          Acquired: {new Date(ev.acquisition_timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        <div>{ev.width} x {ev.height} px</div>
                        <div className="text-[10px] text-slate-300">{ev.image_format}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {(ev.file_size / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] text-slate-300">
                            {ev.sha256_hash.substring(0, 16)}...{ev.sha256_hash.substring(48)}
                          </span>
                          <button
                            onClick={() => copyToClipboard(ev.sha256_hash)}
                            title="Copy full SHA-256"
                            className="text-slate-300 hover:text-sky-300"
                          >
                            {copiedHash === ev.sha256_hash ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              ev.integrity_status === 'VERIFIED'
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                : 'bg-red-950/60 text-red-400 border border-red-800/40'
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>{ev.integrity_status}</span>
                          </span>

                          <button
                            onClick={() => handleVerifyIntegrity(ev.id)}
                            disabled={verifyingId === ev.id}
                            className="block text-[10px] text-slate-300 hover:text-sky-300 underline"
                          >
                            {verifyingId === ev.id ? 'Checking...' : 'Re-verify'}
                          </button>

                          {verificationFeedback[ev.id] && (
                            <div className="text-[9px] text-sky-300 font-sans">
                              {verificationFeedback[ev.id]}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-2 font-sans">
                          <button
                            onClick={() => navigate(`/evidence/${ev.id}`)}
                            title="Deep Metadata & Inspection"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/similarity?query=${ev.id}`)}
                            title="Search Perceptually Similar Images"
                            className="p-1.5 bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 rounded border border-sky-800/50"
                          >
                            <Search className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/transformation?ref=${ev.id}`)}
                            title="Transformation Analysis"
                            className="p-1.5 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 rounded border border-purple-800/50"
                          >
                            <Cpu className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Exact Duplicate Groups */}
      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-slate-200">Cryptographic Duplicate Identification:</span> Exact duplicates are grouped exclusively by identical SHA-256 hashes calculated directly from the original file bytes, regardless of filenames or timestamps.
          </div>

          {!duplicates || duplicates.groups.length === 0 ? (
            <div className="text-center py-12 bg-[#0b0f19] border border-slate-800 rounded text-xs text-slate-300">
              No exact byte-level duplicates identified in this case.
            </div>
          ) : (
            <div className="space-y-4">
              {duplicates.groups.map((group, idx) => (
                <div key={group.sha256_hash} className="bg-[#0b0f19] border border-emerald-800/40 rounded p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2 gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 font-mono text-xs font-bold border border-emerald-800/60">
                        Duplicate Group #{idx + 1}
                      </span>
                      <span className="text-xs text-slate-200 font-medium font-mono">
                        {group.file_count} identical files ({(group.total_size / 1024).toFixed(1)} KB total)
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-300">
                      <span>SHA-256:</span>
                      <span className="text-slate-300">{group.sha256_hash.substring(0, 24)}...</span>
                      <button
                        onClick={() => copyToClipboard(group.sha256_hash)}
                        className="text-sky-400 hover:text-sky-300 text-[10px] underline ml-1"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {group.files.map((f) => (
                      <div
                        key={f.id}
                        className="p-2.5 bg-[#101726]/80 border border-slate-800 rounded flex items-center space-x-3"
                      >
                        <img
                          src={`/storage/evidence/${f.storage_reference}`}
                          alt={f.original_filename}
                          className="w-12 h-12 object-cover rounded bg-slate-900 border border-slate-800 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-200 truncate font-sans">
                            {f.original_filename}
                          </div>
                          <div className="text-[10px] font-mono text-sky-400 truncate">{f.id}</div>
                          <div className="text-[10px] font-mono text-slate-300">
                            {f.width}x{f.height} • {(f.file_size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
