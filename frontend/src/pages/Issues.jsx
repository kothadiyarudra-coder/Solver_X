import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Search,
  CheckCircle2,
  EyeOff,
  Clock,
  Tag,
  RefreshCw,
  Flame,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { api } from "../services/api";
import { useProject } from "../context/ProjectContext";

export default function Issues() {
  const navigate = useNavigate();
  const { selectedProject, setSelectedProject, selectedProjectObj } = useProject();
  const [filterTab, setFilterTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const errorData = await api.getErrorEvents({
        projectId: selectedProject !== "all" ? selectedProject : undefined,
      });
      const rawErrors = errorData.errors || [];

      // Transform raw errors into issue objects
      const formatted = rawErrors.map((err, idx) => {
        const titleStr = typeof err.title === 'object' && err.title !== null
          ? (err.title.hour ? `${err.title.hour}: ${err.title.type || 'error'}` : JSON.stringify(err.title))
          : String(err.title || `Error in ${err.types?.[0] || 'execution'}`);

        const culpritRaw = err.sampleEvent?.payload?.endpoint || err.sampleEvent?.payload?.operation || `Type: ${err.types?.[0] || 'Unknown'}`;
        const culpritStr = typeof culpritRaw === 'object' && culpritRaw !== null
          ? JSON.stringify(culpritRaw)
          : String(culpritRaw || 'Unknown');

        const projStr = typeof err.projectId === 'object' && err.projectId !== null
          ? JSON.stringify(err.projectId)
          : String(err.projectId || 'devtrace');

        const rawTypes = Array.isArray(err.types) ? err.types : [];
        const cleanTags = [
          `env:${projStr}`,
          ...rawTypes.map((t) => typeof t === 'object' && t !== null ? (t.type || JSON.stringify(t)) : String(t)),
        ];

        return {
          id: `ISSUE-${100 + idx}`,
          title: titleStr,
          culprit: culpritStr,
          status: "unresolved",
          severity: err.count > 5 ? "fatal" : "error",
          events: typeof err.count === 'number' ? err.count : Number(err.count) || 1,
          users: err.uniqueUsers || 1,
          lastSeen: err.lastSeen ? new Date(err.lastSeen).toLocaleTimeString() : "Just now",
          project: projStr,
          runId: err.sampleEvent?.runId,
          source: err.sampleEvent?.payload?.source || 'runtime',
          suggestedFix: err.sampleEvent?.payload?.suggestedFix || null,
          file: err.sampleEvent?.payload?.file || null,
          tags: cleanTags,
        };
      });

      setIssues(formatted);
    } catch (err) {
      console.error("[Issues] Failed to fetch issues:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [selectedProject]);

  const filteredIssues = issues.filter((issue) => {
    if (filterTab !== "all" && issue.status !== filterTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        issue.title.toLowerCase().includes(q) ||
        issue.culprit.toLowerCase().includes(q) ||
        issue.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleResolve = (id, e) => {
    e.stopPropagation();
    setIssues((prev) =>
      prev.map((iss) => (iss.id === id ? { ...iss, status: "resolved" } : iss))
    );
  };

  const handleIgnore = (id, e) => {
    e.stopPropagation();
    setIssues((prev) =>
      prev.map((iss) => (iss.id === id ? { ...iss, status: "ignored" } : iss))
    );
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "fatal":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-[11px] font-bold uppercase text-red-400 border border-red-500/30">
            <Flame size={12} /> Fatal
          </span>
        );
      case "error":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[11px] font-bold uppercase text-rose-400 border border-rose-500/30">
            <AlertCircle size={12} /> Error
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen w-full space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#302345] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-rose-400" />
              Issues
            </h1>
            <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-400">
              {issues.filter((i) => i.status === "unresolved").length} Active
            </span>

            {selectedProject !== "all" ? (
              <div className="flex items-center gap-1.5 ml-2">
                <span className="rounded-md bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 text-xs font-semibold text-purple-300">
                  Project: {selectedProjectObj?.name || selectedProject}
                </span>
                <button
                  onClick={() => setSelectedProject("all")}
                  className="text-[11px] text-slate-400 hover:text-white underline"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              <span className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs text-slate-400">
                All Projects
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Grouped error occurrences and crash diagnostics from MongoDB events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchIssues}
            className="flex items-center gap-1.5 rounded-md border border-[#302345] bg-[#1E1531] px-3.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-purple-500/40 hover:text-white"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => navigate("/diagnosis")}
            className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-500"
          >
            Diagnose with AI
          </button>
        </div>
      </div>

      {/* Search & Query Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search error messages or culprit endpoints..."
            className="w-full rounded-lg border border-[#302345] bg-[#1E1531] py-2 pl-10 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-purple-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex rounded-lg border border-[#302345] bg-[#1E1531] p-1 text-xs font-medium">
          {["all", "unresolved", "resolved", "ignored"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`rounded-md px-3 py-1.5 capitalize transition ${
                filterTab === tab
                  ? "bg-purple-600 text-white font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Issues Table / List */}
      <div className="rounded-xl border border-[#302345] bg-[#1E1531] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#302345] bg-[#241738] px-5 py-3 text-xs uppercase tracking-wider text-slate-400">
          <div className="flex items-center gap-3">
            <span>Issue Details</span>
          </div>
          <div className="flex items-center gap-12 pr-4">
            <span className="w-16 text-right">Events</span>
            <span className="w-16 text-right">Runs</span>
            <span className="w-24 text-right">Last Seen</span>
            <span className="w-20 text-right">Actions</span>
          </div>
        </div>

        <div className="divide-y divide-[#302345]">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin text-purple-400" size={16} />
              Loading real issues from database...
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center text-slate-400">
              <Inbox size={32} className="text-slate-500 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No issues detected</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                No error events currently match this filter in MongoDB.
              </p>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => issue.runId && navigate(`/runs/${issue.runId}`)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-[#281d3e] transition cursor-pointer gap-4"
              >
                <div className="flex items-start gap-3.5 max-w-2xl">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getSeverityBadge(issue.severity)}
                      <span className="font-semibold text-white group-hover:text-purple-300 transition">
                        {issue.title}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-slate-400 font-mono">
                      {issue.culprit}
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded bg-[#241738] px-2 py-0.5 text-[11px] text-purple-300 border border-[#302345]">
                        <Tag size={10} /> {issue.project}
                      </span>
                      {issue.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-300 border border-slate-700/50"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-12 sm:pr-4">
                  <div className="w-16 text-right">
                    <span className="text-sm font-bold text-white">{issue.events}</span>
                    <span className="block text-[11px] text-slate-500">events</span>
                  </div>

                  <div className="w-16 text-right">
                    <span className="text-sm font-bold text-white">{issue.users}</span>
                    <span className="block text-[11px] text-slate-500">runs</span>
                  </div>

                  <div className="w-24 text-right">
                    <span className="text-xs text-slate-400 flex items-center justify-end gap-1">
                      <Clock size={11} /> {issue.lastSeen}
                    </span>
                  </div>

                  <div
                    className="flex w-20 items-center justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      title="Mark Resolved"
                      onClick={(e) => handleResolve(issue.id, e)}
                      className="rounded p-1.5 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition"
                    >
                      <CheckCircle2 size={17} />
                    </button>
                    <button
                      title="Ignore"
                      onClick={(e) => handleIgnore(issue.id, e)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition"
                    >
                      <EyeOff size={17} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
