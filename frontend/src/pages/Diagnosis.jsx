import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Brain, Sparkles, RefreshCw, AlertCircle, Inbox, Layers } from "lucide-react";
import AIAnalysis from "../components/AIAnalysis";
import { api } from "../services/api";
import { useProject } from "../context/ProjectContext";
import socket from "../services/socket";

export default function Diagnosis() {
  const { selectedProject } = useProject();
  const [searchParams] = useSearchParams();
  const urlRunId = searchParams.get("runId");

  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [error, setError] = useState(null);

  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const allRuns = await api.getRuns({
        projectId: selectedProject !== "all" ? selectedProject : undefined,
        limit: 50,
      });
      const runList = allRuns || [];
      setRuns(runList);

      // Determine which run to select
      if (urlRunId && runList.some((r) => r.runId === urlRunId)) {
        setSelectedRunId(urlRunId);
      } else if (!selectedRunId || !runList.some((r) => r.runId === selectedRunId)) {
        const failed = runList.find((r) => r.status === "failed");
        if (failed) {
          setSelectedRunId(failed.runId);
        } else if (runList.length > 0) {
          setSelectedRunId(runList[0].runId);
        } else {
          setSelectedRunId("");
        }
      }
    } catch (err) {
      console.error("[Diagnosis] Failed to load runs:", err);
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [selectedProject]);

  // When urlRunId is present, auto-select it
  useEffect(() => {
    if (urlRunId && runs.some((r) => r.runId === urlRunId)) {
      setSelectedRunId(urlRunId);
    }
  }, [urlRunId, runs]);

  // When selectedRunId changes, auto-populate diagnosis if already present on run document
  useEffect(() => {
    if (!selectedRunId) {
      setDiagnosis(null);
      return;
    }
    const target = runs.find((r) => r.runId === selectedRunId);
    if (target && target.diagnosis) {
      setDiagnosis(target.diagnosis);
    } else {
      setDiagnosis(null);
    }
  }, [selectedRunId, runs]);

  // Real-time socket updates for new or diagnosed runs
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

      if (newOrUpdatedRun.runId === selectedRunId && newOrUpdatedRun.diagnosis) {
        setDiagnosis(newOrUpdatedRun.diagnosis);
      }
    };

    socket.on("run_created", handleRunUpdate);
    socket.on("run_updated", handleRunUpdate);
    socket.on("code_analyzed", fetchRuns);

    return () => {
      socket.off("run_created", handleRunUpdate);
      socket.off("run_updated", handleRunUpdate);
      socket.off("code_analyzed", fetchRuns);
    };
  }, [selectedProject, selectedRunId]);

  const handleRunDiagnosis = async () => {
    if (!selectedRunId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDiagnosis(selectedRunId);
      setDiagnosis(data);
    } catch (err) {
      console.error("[Diagnosis] Diagnosis failed:", err);
      setError("AI diagnosis failed to complete. Check backend logs and AI API key (GROK_API_KEY or GEMINI_API_KEY).");
    } finally {
      setLoading(false);
    }
  };

  const selectedRun = runs.find((r) => r.runId === selectedRunId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Brain className="text-purple-400" />
            AI Root Cause Diagnosis
          </h1>
          <p className="text-slate-400 mt-1">
            Automated failure analysis powered by AI and execution telemetry from MongoDB. Diagnoses runtime errors and static code defects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            disabled={runs.length === 0 || loading}
            className="rounded-lg border border-[#302345] bg-[#241738] px-3 py-2 text-sm text-white outline-none focus:border-purple-500 max-w-xs md:max-w-md font-mono"
          >
            {runs.length === 0 ? (
              <option value="">No runs available in database</option>
            ) : (
              runs.map((r) => (
                <option key={r.runId} value={r.runId}>
                  [{r.status.toUpperCase()}] {r.runId} — {r.name}
                </option>
              ))
            )}
          </select>

          <button
            onClick={handleRunDiagnosis}
            disabled={loading || !selectedRunId}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition shrink-0"
          >
            {loading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {diagnosis ? "Re-Run Diagnosis" : "Run Diagnosis"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loadingRuns ? (
        <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
          <RefreshCw className="animate-spin text-purple-400" size={20} />
          <span>Checking database for runs...</span>
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-12 text-center text-slate-400">
          <Inbox size={32} className="mx-auto text-slate-500 mb-2" />
          <p className="text-base font-semibold text-slate-300">No runs found in MongoDB</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Audit a codebase or execute a telemetry scenario to record runs and diagnose them here.
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="animate-spin text-purple-400" size={32} />
          <p className="text-sm font-medium">Analyzing telemetry events & code defects with AI...</p>
        </div>
      ) : diagnosis ? (
        <div className="space-y-4">
          {selectedRun && (
            <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-[#241738] border border-[#302345] text-xs">
              <span className="text-slate-400">
                Viewing AI Diagnosis for Run: <span className="text-purple-300 font-mono font-semibold">{selectedRun.runId}</span>
              </span>
              <span className={`px-2 py-0.5 rounded font-semibold uppercase text-[10px] ${
                selectedRun.status === 'failed' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {selectedRun.status}
              </span>
            </div>
          )}
          <AIAnalysis diagnosis={diagnosis} />
        </div>
      ) : (
        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-12 text-center text-slate-400">
          <Sparkles size={32} className="mx-auto text-purple-400 mb-3" />
          <p className="text-base font-semibold text-slate-200">Ready to diagnose {selectedRunId}</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Click "Run Diagnosis" to analyze this run's execution events, stack traces, and code defects.
          </p>
        </div>
      )}
    </div>
  );
}
