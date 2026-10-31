import React from "react";
import { ChevronDown, LayoutGrid, Monitor, Calendar, Sparkles } from "lucide-react";
import { useProject } from "../context/ProjectContext";

export default function Navbar() {
  const { projects, selectedProject, setSelectedProject, selectedProjectObj } = useProject();

  const todayStr = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="flex h-12 items-center justify-between border-b border-slate-700/50 bg-[#1B1124] px-4 sticky top-0 z-30">
      {/* Left controls */}
      <div className="flex items-center gap-3">
        {/* Real Projects dropdown */}
        <div className="relative flex items-center">
          <LayoutGrid className="absolute left-2.5 h-3.5 w-3.5 text-purple-400 pointer-events-none" />
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="appearance-none rounded-md border border-purple-500/40 bg-[#241738] py-1 pl-8 pr-7 text-xs text-white font-medium outline-none hover:border-purple-400 cursor-pointer transition shadow-sm"
          >
            <option value="all" className="bg-[#1E1531]">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.projectId || p._id} value={p.projectId} className="bg-[#1E1531]">
                {p.name} ({p.projectId})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Selected Project Badge */}
        {selectedProject !== "all" && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-xs text-purple-300 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active: {selectedProjectObj?.name || selectedProject}
          </div>
        )}

        {/* Environments */}
        <div className="hidden md:flex items-center gap-1.5 rounded-md border border-slate-700/70 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
          <Monitor className="h-3.5 w-3.5 text-slate-400" />
          <span>Production</span>
        </div>
      </div>

      {/* Right side — dynamic date */}
      <div className="flex items-center gap-2 rounded-md border border-slate-700/70 bg-white/[0.04] px-3 py-1 text-xs text-slate-400">
        <Calendar className="h-3.5 w-3.5 text-slate-500" />
        <span>Today &ndash; {todayStr}</span>
      </div>
    </header>
  );
}
