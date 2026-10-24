import React, { useState } from 'react';
import { useCase } from '../context/CaseContext';
import { forensicApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  FolderPlus,
  FolderArchive,
  Search,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  X,
  ArrowRight
} from 'lucide-react';

export const Cases: React.FC = () => {
  const { cases, activeCase, setActiveCaseId, refreshCases, loadingCases } = useCase();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Archived'>('All');
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Case Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examiner, setExaminer] = useState('');
  const [customCaseNum, setCustomCaseNum] = useState('');

  const navigate = useNavigate();

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const newCase = await forensicApi.createCase({
        title: title.trim(),
        description: description.trim() || undefined,
        examiner: examiner.trim() || undefined,
        case_number: customCaseNum.trim() || undefined,
      });

      await refreshCases();
      setActiveCaseId(newCase.id);
      setShowModal(false);
      setTitle('');
      setDescription('');
      setExaminer('');
      setCustomCaseNum('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to create investigation case.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.examiner && c.examiner.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">Investigation Cases</h1>
          <p className="text-xs text-slate-300 mt-0.5">
            Create, manage, and inspect forensic digital image investigation cases.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3.5 py-2 rounded transition-colors shadow"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Investigation Case</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0b0f19] p-3 rounded border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-300 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by title, case ID, examiner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#101726] border border-slate-700 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-[11px] text-slate-300 uppercase font-mono">Status:</span>
          {(['All', 'Active', 'Archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 text-xs rounded font-mono transition-colors ${
                statusFilter === s
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'bg-slate-800/60 text-slate-200 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCases.map((c) => {
          const isActive = activeCase?.id === c.id;
          return (
            <div
              key={c.id}
              className={`bg-[#0b0f19] border rounded p-4 flex flex-col justify-between transition-all ${
                isActive
                  ? 'border-sky-500/80 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/30'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
                    {c.case_number}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      c.status === 'Active'
                        ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                        : 'text-slate-300 bg-slate-800/60'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{c.title}</h3>
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                    {c.description || 'No detailed case scope provided.'}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-[11px] text-slate-300 font-mono">
                  <div className="flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-slate-300" />
                    <span>Examiner: {c.examiner || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-300" />
                    <span>Created: {new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Layers className="w-3.5 h-3.5 text-slate-300" />
                    <span>Evidence Files: {c.evidence_count}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setActiveCaseId(c.id)}
                  className={`text-xs px-2.5 py-1 rounded font-mono transition-colors ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {isActive ? '✓ Active Context' : 'Set Active'}
                </button>

                <button
                  onClick={() => {
                    setActiveCaseId(c.id);
                    navigate('/evidence');
                  }}
                  className="flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 font-medium"
                >
                  <span>Open Collection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCases.length === 0 && (
        <div className="text-center py-12 bg-[#0b0f19] border border-slate-800 rounded text-xs text-slate-300">
          No investigation cases matched the selected criteria.
        </div>
      )}

      {/* New Case Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-700 rounded-lg max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-100">Initialize New Investigation Case</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-red-950/40 border border-red-800/60 rounded text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCase} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Case Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Provenance Analysis of Acquired Incident Photographs"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#101726] border border-slate-700 rounded p-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Case Reference Number (Optional, auto-generated if blank)
                </label>
                <input
                  type="text"
                  placeholder="e.g., CASE-2026-0042"
                  value={customCaseNum}
                  onChange={(e) => setCustomCaseNum(e.target.value)}
                  className="w-full bg-[#101726] border border-slate-700 rounded p-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Examiner Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Det. J. Smith / Forensic Analyst"
                  value={examiner}
                  onChange={(e) => setExaminer(e.target.value)}
                  className="w-full bg-[#101726] border border-slate-700 rounded p-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Investigation Description / Scope
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the background, objective, and acquired evidence context..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#101726] border border-slate-700 rounded p-2 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Case...' : 'Create Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
