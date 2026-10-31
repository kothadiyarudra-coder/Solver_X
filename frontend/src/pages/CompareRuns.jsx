import React, { useState, useEffect } from "react";
import {
  GitCompare,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { api } from "../services/api";

export default function CompareRuns() {
  const [runs, setRuns] = useState([]);
  const [run1, setRun1] = useState("");
  const [run2, setRun2] = useState("");
  const [comparison, setComparison] = useState(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRuns = async () => {
      setLoadingRuns(true);
      try {
        const data = await api.getRuns({ limit: 50 });
        setRuns(data || []);
        if (data && data.length >= 2) {
          setRun1(data[0].runId);
          setRun2(data[1].runId);
        } else if (data && data.length === 1) {
          setRun1(data[0].runId);
        }
      } catch (err) {
        console.error("[CompareRuns] Failed to load runs:", err);
      } finally {
        setLoadingRuns(false);
      }
    };

    fetchRuns();
  }, []);

  const handleCompare = async () => {
    if (!run1 || !run2) return;
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

  const getStatusIcon = (status) => {
    if (status === "success") {
      return <CheckCircle className="text-emerald-400 inline mr-1.5" size={16} />;
    }
    if (status === "failed") {
      return <XCircle className="text-red-400 inline mr-1.5" size={16} />;
    }
    return <AlertTriangle className="text-yellow-400 inline mr-1.5" size={16} />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <GitCompare className="text-purple-400" /> Compare Execution Runs
        </h1>
        <p className="text-slate-400 mt-1">
          Perform differential trace analysis between baseline and failing runs to identify root divergences.
        </p>
      </div>

      <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-300">
              Select Baseline (Run 1)
            </label>
            <select
              value={run1}
              onChange={(e) => setRun1(e.target.value)}
              className="w-full p-3 rounded-lg border border-[#302345] bg-[#241738] text-white outline-none focus:border-purple-500"
            >
              <option value="">Choose Run</option>
              {runs.map((r) => (
                <option key={r.runId} value={r.runId}>
                  {r.runId} — {r.name} ({r.status.toUpperCase()}, {r.durationMs || 0}ms)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold text-slate-300">
              Select Target (Run 2)
            </label>
            <select
              value={run2}
              onChange={(e) => setRun2(e.target.value)}
              className="w-full p-3 rounded-lg border border-[#302345] bg-[#241738] text-white outline-none focus:border-purple-500"
            >
              <option value="">Choose Run</option>
              {runs.map((r) => (
                <option key={r.runId} value={r.runId}>
                  {r.runId} — {r.name} ({r.status.toUpperCase()}, {r.durationMs || 0}ms)
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
              Currently {runs.length} run(s) recorded in MongoDB. Execute another scenario to enable differential matrix.
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
    </div>
  );
}
