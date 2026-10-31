import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GitCompare,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Inbox,
  Brain,
  Layers,
  FileCode,
  Activity,
} from "lucide-react";
import { api } from "../services/api";
import { useProject } from "../context/ProjectContext";
import socket from "../services/socket";

export default function CompareRuns() {
  const { selectedProject } = useProject();
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [run1, setRun1] = useState("");
  const [run2, setRun2] = useState("");
  const [comparison, setComparison] = useState(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState(null);

  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const data = await api.getRuns({
        projectId: selectedProject !== "all" ? selectedProject : undefined,
        limit: 50,
      });
      const runList = data || [];
      setRuns(runList);
      if (runList.length >= 2) {
        setRun1((prev) => (prev && runList.some((r) => r.runId === prev) ? prev : runList[0].runId));
        setRun2((prev) => (prev && runList.some((r) => r.runId === prev) ? prev : runList[1].runId));
      } else if (runList.length === 1) {
        setRun1(runList[0].runId);
        setRun2("");
      } else {
        setRun1("");
        setRun2("");
      }
    } catch (err) {
      console.error("[CompareRuns] Failed to load runs:", err);
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [selectedProject]);

  // Real-time socket updates when new audit or execution runs complete
  useEffect(() => {
    const handleRunUpdate = (newOrUpdatedRun) => {
      if (!newOrUpdatedRun || !newOrUpdatedRun.runId) return;
      if (selectedProject !== "all" && newOrUpdatedRun.projectId !== selectedProject) return;

      setRuns((prev) => {
        const index = prev.findIndex((r) => r.runId === newOrUpdatedRun.runId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...newOrUpdatedRun };
          return updated;
        }
        return [newOrUpdatedRun, ...prev];
      });
    };

    socket.on("run_created", handleRunUpdate);
    socket.on("run_updated", handleRunUpdate);
    socket.on("code_analyzed", fetchRuns);

    return () => {
      socket.off("run_created", handleRunUpdate);
      socket.off("run_updated", handleRunUpdate);
      socket.off("code_analyzed", fetchRuns);
    };
  }, [selectedProject]);

  const handleCompare = async () => {
    if (!run1 || !run2 || run1 === run2) return;
    setComparing(true);
    setError(null);
    try {
      const result = await api.compareRuns(run1, run2);
      setComparison(result);
    } catch (err) {
      console.error("[CompareRuns] Comparison failed:", err);
      setError("Failed to generate differential comparison between selected runs.");
    } finally {
      setComparing(false);
    }
  };

  useEffect(() => {
    if (run1 && run2 && run1 !== run2) {
      handleCompare();
    }
  }, [run1, run2]);

  const getStatusBadge = (status) => {
    const isSuccess = status === "success" || status === "completed";
    if (isSuccess) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle size={13} />
          SUCCESS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <XCircle size={13} />
        FAILED
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <GitCompare className="text-purple-400" /> Releases & Run Comparison
          </h1>
          <p className="text-slate-400 mt-1">
            Differential trace comparison across execution runs and static audits. Select baseline and target to analyze divergences.
          </p>
        </div>
        <button
          onClick={fetchRuns}
          disabled={loadingRuns}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#241738] border border-[#302345] text-sm text-slate-300 hover:text-white hover:border-purple-500/50 transition self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loadingRuns ? "animate-spin text-purple-400" : ""} />
          Refresh Runs
        </button>
      </div>

      {/* Comparison Selector Section */}
      <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-300 flex items-center justify-between">
              <span>Select Baseline (Run 1)</span>
              {run1 && <span className="text-xs text-purple-400 font-mono">{run1}</span>}
            </label>
            <select
              value={run1}
              onChange={(e) => setRun1(e.target.value)}
              className="w-full p-3 rounded-lg border border-[#302345] bg-[#241738] text-white outline-none focus:border-purple-500 font-mono text-sm"
            >
              <option value="">Choose Baseline Run</option>
              {runs.map((r) => (
                <option key={r.runId} value={r.runId}>
                  [{r.status.toUpperCase()}] {r.runId} — {r.name} ({r.durationMs || 0}ms)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-300 flex items-center justify-between">
              <span>Select Target (Run 2)</span>
              {run2 && <span className="text-xs text-blue-400 font-mono">{run2}</span>}
            </label>
            <select
              value={run2}
              onChange={(e) => setRun2(e.target.value)}
              className="w-full p-3 rounded-lg border border-[#302345] bg-[#241738] text-white outline-none focus:border-purple-500 font-mono text-sm"
            >
              <option value="">Choose Target Run</option>
              {runs.map((r) => (
                <option key={r.runId} value={r.runId}>
                  [{r.status.toUpperCase()}] {r.runId} — {r.name} ({r.durationMs || 0}ms)
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingRuns ? (
          <div className="flex items-center justify-center p-8 text-slate-400 gap-2">
            <RefreshCw className="animate-spin text-purple-400" size={16} />
            Loading runs from database...
          </div>
        ) : runs.length < 2 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
            <Inbox size={28} className="text-slate-500 mb-2" />
            <p className="text-sm font-medium text-slate-300">Need at least 2 runs in database to compare</p>
            <p className="text-xs text-slate-500 mt-1">
              Currently {runs.length} run(s) recorded in MongoDB. Execute another scenario or run code analysis to enable differential comparison.
            </p>
          </div>
        ) : comparing ? (
          <div className="flex items-center justify-center p-8 text-slate-400 gap-2">
            <RefreshCw className="animate-spin text-purple-400" size={16} />
            Computing differential event comparison...
          </div>
        ) : comparison ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg bg-[#241738] border border-[#302345] p-4">
                <span className="text-xs text-slate-400">Duration Difference</span>
                <p className="mt-1 text-lg font-bold text-white">
                  {comparison.summary?.durationDifferenceMs !== undefined
                    ? `${comparison.summary.durationDifferenceMs} ms`
                    : "0 ms"}
                </p>
              </div>

              <div className="rounded-lg bg-[#241738] border border-[#302345] p-4">
                <span className="text-xs text-slate-400">Event Count Delta</span>
                <p className="mt-1 text-lg font-bold text-white">
                  {comparison.summary?.eventCountDifference || 0} events
                </p>
              </div>

              <div className="rounded-lg bg-[#241738] border border-[#302345] p-4">
                <span className="text-xs text-slate-400">Failure Divergence</span>
                <p className={`mt-1 text-lg font-bold ${comparison.summary?.hasFailureDivergence ? "text-rose-400" : "text-emerald-400"}`}>
                  {comparison.summary?.hasFailureDivergence ? "Divergence Detected" : "No Divergence"}
                </p>
              </div>
            </div>

            {/* Step-by-Step Sequence Comparison Table */}
            <div className="overflow-x-auto rounded-lg border border-[#302345]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#241738] text-xs uppercase text-slate-400">
                  <tr>
                    <th className="p-4 w-16">Step</th>
                    <th className="p-4 text-purple-300">Run 1: {comparison.run1?.runId}</th>
                    <th className="p-4 text-blue-300">Run 2: {comparison.run2?.runId}</th>
                    <th className="p-4">Divergence Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#302345] text-slate-200">
                  {(comparison.sequenceComparison || []).map((step, idx) => (
                    <tr
                      key={idx}
                      className={!step.match ? "bg-red-500/5" : "hover:bg-[#281d3e]"}
                    >
                      <td className="p-4 font-mono text-xs text-slate-500">
                        #{step.stepIndex || idx + 1}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-white">
                          {step.run1Event?.type || "None"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {step.run1Event ? `Status: ${step.run1Event.status}` : "Missing"}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-white">
                          {step.run2Event?.type || "None"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {step.run2Event ? `Status: ${step.run2Event.status}` : "Missing"}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-mono">
                        {step.match ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle size={13} /> {step.difference || "Identical"}
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1">
                            <XCircle size={13} /> {step.difference || "Diverged"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">
            Select two distinct runs above to generate comparative sequence matrix.
          </p>
        )}
      </div>

      {/* List of Runs Performed (Release & Execution History) */}
      <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="text-indigo-400" size={20} />
            <h2 className="text-lg font-bold text-white">Runs & Release History</h2>
            <span className="px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-300 font-mono border border-purple-500/20">
              {runs.length} recorded
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Real-time runs performed (Success & Failure audits)
          </span>
        </div>

        {runs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No runs recorded yet. Perform a codebase analysis or trigger telemetry to record runs.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#302345]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#241738] text-xs uppercase text-slate-400">
                <tr>
                  <th className="p-4">Run ID & Name</th>
                  <th className="p-4">Project</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Events</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Execution Time</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#302345] text-slate-200">
                {runs.map((r) => {
                  const isAudit = r.runId?.startsWith("audit-") || r.metadata?.source === "codebase_audit";
                  return (
                    <tr key={r.runId} className="hover:bg-[#281d3e] transition">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {isAudit ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Audit
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              Trace
                            </span>
                          )}
                          <span className="font-mono text-xs text-purple-300 font-semibold">
                            {r.runId}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 mt-1 max-w-xs truncate" title={r.name}>
                          {r.name}
                        </div>
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-400">
                        {r.projectId}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(r.status)}
                      </td>
                      <td className="p-4 text-xs text-slate-300">
                        <span className="font-semibold text-white">{r.totalEvents || 0}</span> events
                        {r.errorCount > 0 && (
                          <span className="ml-1.5 text-rose-400 font-semibold">
                            ({r.errorCount} err)
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-300">
                        {r.durationMs || 0} ms
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {r.startedAt ? new Date(r.startedAt).toLocaleString() : "N/A"}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setRun1(r.runId)}
                            className="px-2 py-1 text-xs rounded bg-[#241738] border border-[#302345] text-purple-300 hover:bg-purple-600/20 transition"
                            title="Set as Run 1 baseline for comparison"
                          >
                            Set Baseline
                          </button>
                          <button
                            onClick={() => setRun2(r.runId)}
                            className="px-2 py-1 text-xs rounded bg-[#241738] border border-[#302345] text-blue-300 hover:bg-blue-600/20 transition"
                            title="Set as Run 2 target for comparison"
                          >
                            Set Target
                          </button>
                          <button
                            onClick={() => navigate(`/diagnosis?runId=${encodeURIComponent(r.runId)}`)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600/40 transition"
                            title="Open AI Root Cause Diagnosis for this run"
                          >
                            <Brain size={12} />
                            Diagnose
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
