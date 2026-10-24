import React from 'react';
import { useCase } from '../context/CaseContext';
import { FolderGit2, PlusCircle, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { activeCase, cases, setActiveCaseId } = useCase();
  const navigate = useNavigate();

  return (
    <header className="h-14 bg-[#090d16] border-b border-slate-800 px-6 flex items-center justify-between z-10 shrink-0">
      {/* Active Case Selector */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
          <FolderGit2 className="w-4 h-4 text-sky-400" />
          <span>ACTIVE CASE:</span>
        </div>

        {cases.length > 0 ? (
          <div className="relative">
            <select
              value={activeCase?.id || ''}
              onChange={(e) => setActiveCaseId(e.target.value ? Number(e.target.value) : null)}
              className="bg-[#101726] border border-slate-700 text-xs text-sky-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-mono"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.case_number}] {c.title} ({c.evidence_count} evidence)
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className="text-xs text-amber-400/90 font-mono bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
            No active investigation case
          </span>
        )}

        <button
          onClick={() => navigate('/cases')}
          className="flex items-center space-x-1 text-xs text-slate-200 hover:text-sky-300 transition-colors bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1.5 rounded border border-slate-700"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Case</span>
        </button>
      </div>

      {/* Right status & examiner info */}
      <div className="flex items-center space-x-4">
        {activeCase && (
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1 text-slate-300">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Examiner:</span>
              <span className="text-slate-200 font-medium">{activeCase.examiner || 'Unassigned'}</span>
            </div>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded text-[11px]">
              {activeCase.evidence_count} Evidence Items
            </span>
          </div>
        )}

        <div className="flex items-center space-x-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>AUDIT SECURE</span>
        </div>
      </div>
    </header>
  );
};
