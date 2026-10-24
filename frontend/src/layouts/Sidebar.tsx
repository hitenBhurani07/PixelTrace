import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderPlus,
  Layers,
  Search,
  Network,
  Binary,
  Clock,
  FileText,
  Settings,
  ShieldAlert,
  Cpu
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Investigation Overview', icon: LayoutDashboard },
  { path: '/cases', label: 'New Investigation', icon: FolderPlus },
  { path: '/evidence', label: 'Evidence Collection', icon: Layers },
  { path: '/similarity', label: 'Image Similarity Search', icon: Search },
  { path: '/graph', label: 'Provenance Graph', icon: Network },
  { path: '/metadata', label: 'Metadata Correlation', icon: Binary },
  { path: '/transformation', label: 'Transformation Analysis', icon: Cpu },
  { path: '/timeline', label: 'Investigation Timeline', icon: Clock },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/settings', label: 'Settings / About', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-[#090d16] border-r border-slate-800 flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center space-x-3 bg-[#070a10]">
        <div className="w-9 h-9 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold tracking-wider text-slate-100 text-sm">PIXEL</span>
            <span className="font-bold tracking-wider text-sky-400 text-sm">TRACE</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono tracking-tight">FORENSIC ANALYZER</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
          Forensic Workstation
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-xs font-medium rounded transition-colors group ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-300 border-l-2 border-sky-400 font-semibold'
                    : 'text-slate-200 hover:bg-slate-800/60 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 mr-3 shrink-0 text-slate-300 group-hover:text-sky-300 transition-colors" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* System Integrity & Engine Status Footer */}
      <div className="p-3 border-t border-slate-800 bg-[#070a10] text-[11px]">
        <div className="flex items-center justify-between text-slate-200 mb-1">
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[10px]">ENGINE ONLINE</span>
          </span>
          <span className="text-[10px] font-mono text-slate-300">LOCAL:8000</span>
        </div>
        <div className="text-[10px] text-slate-300 flex justify-between">
          <span>SHA-256 / pHash</span>
          <span className="text-slate-300">SQLite Active</span>
        </div>
      </div>
    </aside>
  );
};
