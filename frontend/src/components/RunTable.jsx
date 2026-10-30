import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, ArrowRight, Zap } from 'lucide-react';

export default function RunTable({ runs = [] }) {
  if (runs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-slate-800/20 rounded-xl border border-slate-800">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No execution runs recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-800/60 text-xs uppercase text-slate-400 border-b border-slate-700/60">
          <tr>
            <th className="py-3 px-4 font-semibold">Run ID</th>
            <th className="py-3 px-4 font-semibold">Workflow Name</th>
            <th className="py-3 px-4 font-semibold">Status</th>
            <th className="py-3 px-4 font-semibold">Events</th>
            <th className="py-3 px-4 font-semibold">Duration</th>
            <th className="py-3 px-4 font-semibold">Started At</th>
            <th className="py-3 px-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {runs.map((run) => (
            <tr key={run.runId} className="hover:bg-slate-800/30 transition-colors">
              <td className="py-3.5 px-4 font-mono text-xs text-sky-400 font-medium">
                {run.runId}
              </td>
              <td className="py-3.5 px-4 font-medium text-slate-200">
                {run.name}
              </td>
              <td className="py-3.5 px-4">
                {run.status === 'success' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Success
                  </span>
                ) : run.status === 'failed' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <XCircle className="w-3.5 h-3.5" />
                    Failed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Zap className="w-3.5 h-3.5 animate-spin" />
                    Running
                  </span>
                )}
              </td>
              <td className="py-3.5 px-4 text-slate-400">
                {run.totalEvents || 0} events
                {run.errorCount > 0 && (
                  <span className="ml-1 text-xs text-rose-400 font-medium">({run.errorCount} failed)</span>
                )}
              </td>
              <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                {run.durationMs ? `${run.durationMs}ms` : '--'}
              </td>
              <td className="py-3.5 px-4 text-xs text-slate-400">
                {run.startedAt ? new Date(run.startedAt).toLocaleTimeString() : '--'}
              </td>
              <td className="py-3.5 px-4 text-right">
                <Link
                  to={`/runs/${run.runId}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300 transition"
                >
                  Details
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

