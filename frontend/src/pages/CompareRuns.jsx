import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GitCompare, CheckCircle2, XCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export default function CompareRuns() {
  const [searchParams] = useSearchParams();
  const [runId1, setRunId1] = useState(searchParams.get('run1') || 'run-success-01');
  const [runId2, setRunId2] = useState(searchParams.get('run2') || 'run-fail-02');
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchComparison = async () => {
    if (!runId1 || !runId2) return;
    setLoading(true);
    const data = await api.compareRuns(runId1, runId2);
    setComparison(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchComparison();
  }, [runId1, runId2]);

  return (
    <div className="p-8 space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <GitCompare className="w-6 h-6 text-sky-400" />
          Compare Runs
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Detect exact divergence points, status mismatches, and timing differences between two runs.
        </p>
      </div>

      {/* Selectors Bar */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Baseline Run (e.g. Success)
          </label>
          <input
            type="text"
            value={runId1}
            onChange={(e) => setRunId1(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-sky-400 font-mono focus:outline-none focus:border-sky-500"
            placeholder="Run ID 1"
          />
        </div>

        <div className="hidden md:flex items-center justify-center p-2 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
          <ArrowRight className="w-4 h-4" />
        </div>

        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Target Run (e.g. Failure)
          </label>
          <input
            type="text"
            value={runId2}
            onChange={(e) => setRunId2(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-rose-400 font-mono focus:outline-none focus:border-rose-500"
            placeholder="Run ID 2"
          />
        </div>

        <button
          onClick={fetchComparison}
          className="w-full md:w-auto mt-auto px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-sm font-semibold transition"
        >
          Compare
        </button>
      </div>

      {loading && (
        <div className="py-16 text-center text-slate-500 animate-pulse">Comparing run executions...</div>
      )}

      {comparison && !loading && (
        <div className="space-y-6">
          {/* Comparison Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Baseline: {runId1}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-semibold text-slate-200">{comparison.run1?.name || runId1}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {comparison.run1?.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-mono">{comparison.run1?.durationMs || 0}ms</p>
            </div>

            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Target: {runId2}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-semibold text-slate-200">{comparison.run2?.name || runId2}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                  {comparison.run2?.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-mono">{comparison.run2?.durationMs || 0}ms</p>
            </div>

            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Divergence Summary</p>
              <div className="mt-2 text-xs space-y-1 text-slate-300">
                <p>
                  Duration delta: <span className="font-mono text-amber-400">{comparison.summary?.durationDifferenceMs > 0 ? `+${comparison.summary?.durationDifferenceMs}` : comparison.summary?.durationDifferenceMs}ms</span>
                </p>
                <p>
                  Event count difference: <span className="font-mono text-sky-400">{comparison.summary?.eventCountDifference}</span>
                </p>
                {comparison.summary?.hasFailureDivergence && (
                  <p className="text-rose-400 font-semibold flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Status Diverged (Success vs Failed)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Side-by-Side Steps Comparison */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-4">Step-by-Step Sequence Comparison</h2>

            <div className="space-y-3">
              {comparison.sequenceComparison?.map((step) => {
                const isDiverged = !step.match;
                return (
                  <div
                    key={step.stepIndex}
                    className={`border rounded-xl p-4 transition ${
                      isDiverged
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 border-b border-slate-800/60 pb-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                        Step #{step.stepIndex}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                          step.match
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {step.difference}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      {/* Run 1 Event */}
                      <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                        <p className="text-slate-500 text-[11px] mb-1 font-sans">{runId1}:</p>
                        {step.run1Event ? (
                          <div className="space-y-1">
                            <p className="text-sky-400">{step.run1Event.eventId} ({step.run1Event.type})</p>
                            <p className="text-emerald-400">Status: {step.run1Event.status}</p>
                            {step.run1Event.durationMs && <p className="text-slate-400">{step.run1Event.durationMs}ms</p>}
                          </div>
                        ) : (
                          <p className="text-slate-600 italic">No corresponding event</p>
                        )}
                      </div>

                      {/* Run 2 Event */}
                      <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                        <p className="text-slate-500 text-[11px] mb-1 font-sans">{runId2}:</p>
                        {step.run2Event ? (
                          <div className="space-y-1">
                            <p className="text-rose-400">{step.run2Event.eventId} ({step.run2Event.type})</p>
                            <p className={step.run2Event.status === 'failed' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                              Status: {step.run2Event.status}
                            </p>
                            {step.run2Event.durationMs && <p className="text-slate-400">{step.run2Event.durationMs}ms</p>}
                          </div>
                        ) : (
                          <p className="text-slate-600 italic">No corresponding event</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

