import React, { useState, useEffect } from "react";
import { Brain, Sparkles, RefreshCw, AlertCircle, Inbox } from "lucide-react";
import AIAnalysis from "../components/AIAnalysis";
import { api } from "../services/api";

export default function Diagnosis() {
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRuns = async () => {
      setLoadingRuns(true);
      try {
        const allRuns = await api.getRuns({ limit: 50 });
        setRuns(allRuns || []);
        // Prefer a failed run if available
        const failed = (allRuns || []).find((r) => r.status === "failed");
        if (failed) {
          setSelectedRunId(failed.runId);
        } else if (allRuns && allRuns.length > 0) {
          setSelectedRunId(allRuns[0].runId);
        }
      } catch (err) {
        console.error("[Diagnosis] Failed to load runs:", err);
      } finally {
        setLoadingRuns(false);
      }
    };

    fetchRuns();
  }, []);

  const handleRunDiagnosis = async () => {
    if (!selectedRunId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDiagnosis(selectedRunId);
      setDiagnosis(data);
    } catch (err) {
      console.error("[Diagnosis] Diagnosis failed:", err);
      setError("AI diagnosis failed to complete. Check backend logs and GEMINI_API_KEY.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Brain className="text-purple-400" />
            AI Root Cause Diagnosis
          </h1>
          <p className="text-slate-400 mt-1">
            Automated failure analysis powered by Gemini AI and execution event telemetry from MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            disabled={runs.length === 0 || loading}
            className="rounded-lg border border-[#302345] bg-[#241738] px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
          >
            {runs.length === 0 ? (
              <option value="">No runs available in database</option>
            ) : (
              runs.map((r) => (
                <option key={r.runId} value={r.runId}>
                  {r.runId} — {r.name} ({r.status.toUpperCase()})
                </option>
              ))
            )}
          </select>

          <button
            onClick={handleRunDiagnosis}
            disabled={loading || !selectedRunId}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            Run Diagnosis
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
            Run `node sample-app/failure.js` to create a failing run and diagnose it with Gemini AI.
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="animate-spin text-purple-400" size={32} />
          <p className="text-sm font-medium">Analyzing telemetry events with Gemini AI...</p>
        </div>
      ) : diagnosis ? (
        <AIAnalysis diagnosis={diagnosis} />
      ) : (
        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-12 text-center text-slate-400">
          <Sparkles size={32} className="mx-auto text-purple-400 mb-3" />
          <p className="text-base font-semibold text-slate-200">Ready to diagnose {selectedRunId}</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Click "Run Diagnosis" to submit the run's event sequence and error payloads to Gemini for root cause explanation and suggested fixes.
          </p>
        </div>
      )}
    </div>
  );
}
