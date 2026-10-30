import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Terminal, Play, AlertCircle } from 'lucide-react';
import DiagnosisCard from '../components/DiagnosisCard';
import { api } from '../services/api';

export default function Diagnosis() {
  const [searchParams] = useSearchParams();
  const [targetRunId, setTargetRunId] = useState(searchParams.get('runId') || 'run-fail-02');
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    async function loadInitial() {
      const data = await api.getRuns('demo-project');
      setRuns(data);
      // Auto diagnose current target
      setLoading(true);
      const diag = await api.getDiagnosis(targetRunId);
      setDiagnosis(diag);
      setLoading(false);
    }
    loadInitial();
  }, []);

  const handleDiagnose = async () => {
    if (!targetRunId) return;
    setLoading(true);
    const diag = await api.getDiagnosis(targetRunId);
    setDiagnosis(diag);
    setLoading(false);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-sky-400" />
          AI Failure Diagnosis
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Automated root-cause analysis powered by Google Gemini API with verifiable evidence citations.
        </p>
      </div>

      {/* Selector */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Select Run to Diagnose
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={targetRunId}
              onChange={(e) => setTargetRunId(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-sky-400 font-mono focus:outline-none focus:border-sky-500"
              placeholder="e.g. run-fail-02"
            />
            {runs.length > 0 && (
              <select
                onChange={(e) => setTargetRunId(e.target.value)}
                value={targetRunId}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none"
              >
                {runs.map((r) => (
                  <option key={r.runId} value={r.runId}>
                    {r.runId} ({r.status})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <button
          onClick={handleDiagnose}
          disabled={loading}
          className="w-full sm:w-auto mt-auto px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-white" />
          {loading ? 'Analyzing...' : 'Diagnose Run'}
        </button>
      </div>

      {/* Diagnosis Presentation */}
      <DiagnosisCard diagnosis={diagnosis} loading={loading} />

      {/* Prompt Design Info Card */}
      <div className="bg-slate-800/20 border border-slate-800 rounded-xl p-5 text-xs text-slate-400">
        <h4 className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          Gemini LLM Prompting & Privacy Architecture
        </h4>
        <p>
          DevTrace backend extracts the failure sequence and sanitizes sensitive fields (tokens, passwords, API keys)
          before dispatching to Gemini. Gemini identifies the root cause and quotes verifiable event IDs as concrete evidence,
          preventing hallucinations.
        </p>
      </div>
    </div>
  );
}

