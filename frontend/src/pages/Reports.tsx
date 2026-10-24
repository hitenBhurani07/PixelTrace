import React, { useState, useEffect } from 'react';
import { useCase } from '../context/CaseContext';
import { forensicApi } from '../services/api';
import { InvestigationReport } from '../types';
import {
  FileText,
  Download,
  PlusCircle,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Calendar,
  CheckCircle2,
  FileCheck
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { activeCase } = useCase();
  const [reports, setReports] = useState<InvestigationReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [examinerNotes, setExaminerNotes] = useState('');
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeTransforms, setIncludeTransforms] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadReports = async () => {
    if (!activeCase) return;
    setLoading(true);
    try {
      const data = await forensicApi.getCaseReports(activeCase.id);
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [activeCase]);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;

    setGenerating(true);
    setSuccessMsg(null);
    try {
      const rep = await forensicApi.generateCaseReport(activeCase.id, {
        examiner_notes: examinerNotes.trim() || undefined,
        include_timeline: includeTimeline,
        include_transformation_analyses: includeTransforms
      });
      setSuccessMsg(`Report ${rep.report_reference} successfully compiled and saved.`);
      setExaminerNotes('');
      await loadReports();
    } catch (err: any) {
      console.error('Report compilation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (!activeCase) {
    return (
      <div className="p-8 bg-[#0b0f19] border border-slate-800 rounded text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
        <h3 className="text-sm font-semibold text-slate-100">No Active Case Selected</h3>
        <p className="text-xs text-slate-300">
          Select or initialize an investigation case to generate or download forensic PDF reports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center space-x-2">
              <FileText className="w-5 h-5 text-sky-400" />
              <span>Forensic Investigation Reports</span>
            </h1>
            <span className="font-mono text-xs bg-sky-950/80 text-sky-400 border border-sky-800/60 px-2 py-0.5 rounded">
              {activeCase.case_number}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Compile structured digital forensics PDF examination reports containing evidence inventories, cryptographic SHA-256 validation, and similarity networks.
          </p>
        </div>

        <button
          onClick={loadReports}
          className="flex items-center space-x-1.5 text-xs bg-[#101726] hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded border border-slate-700 font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Report Generation Configuration Form */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-lg p-5 space-y-4">
        <div className="border-b border-slate-800 pb-2">
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Compile New Investigation Report
          </span>
        </div>

        <form onSubmit={handleGenerateReport} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Examiner Synthesis & Final Assessment Notes
            </label>
            <textarea
              rows={3}
              value={examinerNotes}
              onChange={(e) => setExaminerNotes(e.target.value)}
              placeholder="Record final forensic conclusions, observations on visual similarity vs metadata consistency, and scope remarks..."
              className="w-full bg-[#101726] border border-slate-700 rounded p-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-sans"
            />
          </div>

          <div className="flex items-center space-x-6 text-slate-300 font-mono text-xs">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTimeline}
                onChange={(e) => setIncludeTimeline(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
              />
              <span>Include Chronological Audit Trail</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTransforms}
                onChange={(e) => setIncludeTransforms(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
              />
              <span>Include Methodology & Scientific Limitations</span>
            </label>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={generating}
              className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs px-5 py-2.5 rounded transition-colors disabled:opacity-50 font-sans shadow"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Compiling PDF Document via ReportLab...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Generate ReportLab PDF</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded text-xs text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Forensic Legal & Scientific Limitation Notice */}
      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded flex items-start space-x-2 text-[11px] text-slate-300">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-200 font-semibold">Scientific Reporting Standard:</strong> Reports generated by PixelTrace clearly differentiate empirical cryptographic measurements (SHA-256 exact byte equality) from algorithmic inferences (pHash similarity and OpenCV affine inliers). Reports do not claim statutory chain-of-custody compliance.
        </p>
      </div>

      {/* Previously Compiled Reports List */}
      <div className="bg-[#0b0f19] border border-slate-800 rounded-lg p-5 space-y-3">
        <div className="border-b border-slate-800 pb-2">
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Generated Report Archive ({reports.length})
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-300">
            No PDF reports have been generated for this case yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {reports.map((r) => (
              <div
                key={r.id}
                className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 rounded transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100 font-mono">
                      {r.report_reference}
                    </div>
                    <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                      Compiled: {new Date(r.generated_at).toLocaleString()} • Size: {(r.file_size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>

                <a
                  href={`http://127.0.0.1:8000/api/reports/${r.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white px-3 py-1.5 rounded font-mono border border-slate-700 transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
