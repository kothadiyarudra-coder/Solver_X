import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, GitCompare, Sparkles, FolderGit2 } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Run History', path: '/runs', icon: History },
  { name: 'Compare Runs', path: '/compare', icon: GitCompare },
  { name: 'AI Diagnosis', path: '/diagnosis', icon: Sparkles },
];

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 flex flex-col p-4 space-y-6">
      <div className="space-y-1">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Navigation</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="mt-auto pt-4 border-t border-slate-800">
        <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-800 text-xs text-slate-400">
          <p className="font-medium text-slate-300 flex items-center gap-1.5 mb-1">
            <FolderGit2 className="w-3.5 h-3.5 text-sky-400" />
            Track 3 Developer Tool
          </p>
          <p className="text-[11px] text-slate-500">
            Evidence-based failure diagnosis & execution tracing with Gemini API.
          </p>
        </div>
      </div>
    </aside>
  );
}

