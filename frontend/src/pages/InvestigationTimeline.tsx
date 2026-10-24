import React, { useState, useEffect } from 'react';
import { useCase } from '../context/CaseContext';
import { forensicApi } from '../services/api';
import { TimelineEvent } from '../types';
import {
  Clock,
  ShieldCheck,
  FolderPlus,
  Layers,
  Search,
  Network,
  Cpu,
  FileText,
  AlertCircle,
  Filter,
  RefreshCw
} from 'lucide-react';

export const InvestigationTimeline: React.FC = () => {
  const { activeCase } = useCase();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadTimeline = async () => {
    if (!activeCase) return;
    setLoading(true);
    try {
      const data = await forensicApi.getCaseTimeline(activeCase.id);
      setEvents(data);
    } catch (err) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [activeCase]);

  if (!activeCase) {
    return (
      <div className="p-8 bg-[#0b0f19] border border-slate-800 rounded text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
        <h3 className="text-sm font-semibold text-slate-100">No Active Case Selected</h3>
        <p className="text-xs text-slate-300">
          Select or create an investigation case to view its chronological event audit trail.
        </p>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'case_creation':
        return <FolderPlus className="w-4 h-4 text-sky-400" />;
      case 'evidence_acquisition':
        return <Layers className="w-4 h-4 text-sky-400" />;
      case 'integrity_verified':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'similarity_analyzed':
      case 'similarity_search':
        return <Search className="w-4 h-4 text-purple-400" />;
      case 'relationship_created':
      case 'relationship_updated':
        return <Network className="w-4 h-4 text-cyan-400" />;
      case 'transformation_analyzed':
        return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'report_generated':
        return <FileText className="w-4 h-4 text-amber-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-300" />;
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchesType = typeFilter === 'all' || e.event_type === typeFilter;
    const matchesSearch =
      e.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.evidence_id && e.evidence_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.examiner_notes && e.examiner_notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center space-x-2">
              <Clock className="w-5 h-5 text-sky-400" />
              <span>Investigation Chronological Timeline</span>
            </h1>
            <span className="font-mono text-xs bg-sky-950/80 text-sky-400 border border-sky-800/60 px-2 py-0.5 rounded">
              {activeCase.case_number}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Immutable chronological audit log capturing all evidence acquisitions, cryptographic hash validations, and examiner decisions.
          </p>
        </div>

        <button
          onClick={loadTimeline}
          className="flex items-center space-x-1.5 text-xs bg-[#101726] hover:bg-slate-800 text-slate-200 px-3 py-1.5 rounded border border-slate-700 font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit</span>
        </button>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b0f19] p-3 rounded border border-slate-800 text-xs font-mono">
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Search audit trail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#101726] border border-slate-700 rounded px-3 py-1.5 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500 w-56"
          />

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-300">Filter Event:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#101726] border border-slate-700 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Events</option>
              <option value="case_creation">Case Creation</option>
              <option value="evidence_acquisition">Evidence Acquisition</option>
              <option value="integrity_verified">Integrity Verification</option>
              <option value="relationship_created">Relationship Created</option>
              <option value="relationship_updated">Relationship Review</option>
              <option value="report_generated">Report Generated</option>
            </select>
          </div>
        </div>

        <div className="text-[11px] text-slate-300">
          Showing {filteredEvents.length} of {events.length} audit records
        </div>
      </div>

      {/* Chronological Timeline Stream */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 bg-[#0b0f19] border border-slate-800 rounded text-xs text-slate-300">
            No investigation events recorded yet.
          </div>
        ) : (
          filteredEvents.map((ev) => (
            <div key={ev.id} className="relative group">
              {/* Event Dot */}
              <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-[#0b0f19] border-2 border-slate-700 group-hover:border-sky-400 flex items-center justify-center transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div>
              </div>

              {/* Event Content Card */}
              <div className="bg-[#0b0f19] border border-slate-800 hover:border-slate-700 rounded p-4 space-y-2 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-2 gap-1 text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    {getEventIcon(ev.event_type)}
                    <span className="font-bold text-slate-200 uppercase tracking-wider">
                      {ev.event_type.replace(/_/g, ' ')}
                    </span>
                    {ev.evidence_id && (
                      <span className="text-[10px] text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
                        {ev.evidence_id}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-300">
                    {new Date(ev.event_timestamp).toLocaleString()} UTC
                  </span>
                </div>

                {ev.examiner_notes && (
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {ev.examiner_notes}
                  </p>
                )}

                {ev.details && Object.keys(ev.details).length > 0 && (
                  <div className="p-2 bg-[#070a0f] rounded border border-slate-800/80 text-[10px] font-mono text-slate-300 space-y-0.5">
                    {Object.entries(ev.details).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-300 uppercase">{k}:</span>
                        <span className="text-sky-300 truncate max-w-[70%]">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
