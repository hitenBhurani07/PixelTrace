import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderArchive,
  Layers,
  CopyCheck,
  GitCompare,
  FileCode,
  AlertCircle,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Clock
} from 'lucide-react';
import { forensicApi } from '../services/api';
import { DashboardStats } from '../types';
import { useCase } from '../context/CaseContext';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setActiveCaseId } = useCase();

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await forensicApi.getStats();
      setStats(data);
    } catch (err: any) {
      setError('Unable to connect to forensic engine backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-3">
        <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
        <span className="text-xs font-mono text-slate-300">QUERYING FORENSIC DATABASE RECORDS...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-800/40 rounded-lg text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
        <div className="text-sm font-semibold text-red-200">Backend Communication Error</div>
        <p className="text-xs text-slate-300">{error || 'Failed to retrieve database statistics.'}</p>
        <button
          onClick={loadStats}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded border border-slate-700 font-mono"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Empty state if database is completely fresh
  if (stats.total_cases === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-[#0b0f19] border border-slate-800 rounded-lg text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
          <FolderArchive className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-slate-100">No Forensic Investigations Found</h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            The local forensic database contains no active or archived cases. Initialize your first case to begin acquiring evidence, calculating cryptographic hashes, and mapping image relationships.
          </p>
        </div>
        <div>
          <button
            onClick={() => navigate('/cases')}
            className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-4 py-2.5 rounded shadow transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First Investigation Case</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Forensic Investigation Dashboard</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Cryptographic provenance metrics, similarity relationships, and evidence inventory summary.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadStats}
            className="flex items-center space-x-1.5 text-xs bg-[#101726] hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded border border-slate-700 font-mono transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => navigate('/cases')}
            className="flex items-center space-x-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white font-medium px-3 py-1.5 rounded transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Case</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid (Derived from actual SQLite rows) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#0b0f19] border border-slate-800 p-3.5 rounded">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Cases</span>
            <FolderArchive className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{stats.total_cases}</div>
          <div className="text-[10px] text-slate-300 mt-1">Total investigations</div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800 p-3.5 rounded">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Evidence</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100">{stats.total_evidence_files}</div>
          <div className="text-[10px] text-slate-300 mt-1">Acquired image files</div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800 p-3.5 rounded">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Duplicates</span>
            <CopyCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{stats.total_exact_duplicate_groups}</div>
          <div className="text-[10px] text-slate-300 mt-1">Exact SHA-256 groups</div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800 p-3.5 rounded">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Similarity</span>
            <GitCompare className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400">{stats.total_near_duplicate_relationships}</div>
          <div className="text-[10px] text-slate-300 mt-1">pHash relationships</div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800 p-3.5 rounded">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Metadata</span>
            <FileCode className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">{stats.total_images_with_metadata}</div>
          <div className="text-[10px] text-slate-300 mt-1">EXIF/IPTC available</div>
        </div>

        <div className="bg-[#0b0f19] border border-slate-800 p-3.5 rounded">
          <div className="flex items-center justify-between text-slate-300 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Unresolved</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{stats.total_unresolved_relationships}</div>
          <div className="text-[10px] text-slate-300 mt-1">Pending review</div>
        </div>
      </div>

      {/* Two Column Layout: Recent Cases & Recent Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <FolderArchive className="w-4 h-4 text-sky-400" />
              <span>Recent Investigation Cases</span>
            </span>
            <button
              onClick={() => navigate('/cases')}
              className="text-[11px] text-sky-400 hover:underline flex items-center space-x-1"
            >
              <span>View All</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {stats.recent_cases.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setActiveCaseId(c.id);
                  navigate('/evidence');
                }}
                className="py-2.5 px-2 hover:bg-slate-800/40 rounded cursor-pointer transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-medium text-slate-200 flex items-center space-x-2">
                    <span className="font-mono text-sky-400">[{c.case_number}]</span>
                    <span>{c.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5">
                    Examiner: {c.examiner || 'Unassigned'} • Created: {new Date(c.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                    {c.evidence_count} evidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Evidence Acquisitions */}
        <div className="bg-[#0b0f19] border border-slate-800 rounded p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Recent Evidence Acquisitions</span>
            </span>
            <button
              onClick={() => navigate('/evidence')}
              className="text-[11px] text-sky-400 hover:underline flex items-center space-x-1"
            >
              <span>Manage Evidence</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {stats.recent_evidence.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-300">
              No evidence files acquired yet.
            </div>
          ) : (
            <div className="space-y-2">
              {stats.recent_evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="p-2 bg-[#101726]/60 border border-slate-800/80 rounded flex items-center space-x-3 hover:border-slate-700 transition-colors"
                >
                  <img
                    src={`/storage/evidence/${ev.storage_reference}`}
                    alt={ev.original_filename}
                    className="w-11 h-11 object-cover rounded bg-slate-900 border border-slate-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {ev.original_filename}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded shrink-0">
                        {ev.integrity_status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-300 mt-0.5">
                      <span>{ev.width}x{ev.height}</span>
                      <span>•</span>
                      <span>{ev.image_format}</span>
                      <span>•</span>
                      <span>{(ev.file_size / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-300 mt-1">
                      <span>SHA256:</span>
                      <span className="truncate">{ev.sha256_hash.substring(0, 16)}...</span>
                      <button
                        onClick={() => copyHash(ev.sha256_hash)}
                        className="text-sky-400 hover:text-sky-300 text-[9px] underline"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
