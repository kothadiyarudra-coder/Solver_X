import React, { useState, useEffect } from "react";
import { ChevronDown, LayoutGrid, Monitor, Calendar } from "lucide-react";
import { api } from "../services/api";

export default function Navbar() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("all");

  useEffect(() => {
    api.getProjects().then((data) => {
      setProjects(data || []);
    });
  }, []);

  const todayStr = new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="flex h-12 items-center justify-between border-b border-slate-700/50 bg-[#1B1124] px-4">
      {/* Left controls */}
      <div className="flex items-center gap-2">
        {/* Real Projects dropdown */}
        <div className="relative flex items-center">
          <LayoutGrid className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="appearance-none rounded-md border border-slate-700/70 bg-white/[0.04] py-1 pl-8 pr-7 text-xs text-slate-300 outline-none hover:bg-white/[0.07] cursor-pointer"
          >
            <option value="all" className="bg-[#1E1531]">All Projects ({projects.length})</option>
            {projects.map((p) => (
              <option key={p.projectId || p._id} value={p.projectId} className="bg-[#1E1531]">
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
        </div>

        {/* Environments */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-slate-700/70 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
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
