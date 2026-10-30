import React, { useEffect, useState } from 'react';
import { History, Filter, RefreshCw } from 'lucide-react';
import RunTable from '../components/RunTable';
import { api } from '../services/api';

export default function RunHistory() {
  const [runs, setRuns] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchRuns = async () => {
    setLoading(true);
    const data = await api.getRuns('demo-project');
    setRuns(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const filteredRuns = runs.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-sky-400" />
            Run History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete log of executed runs, event metrics, and completion statuses.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filter === 'all' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('success')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filter === 'success' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Success
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                filter === 'failed' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Failed
            </button>
          </div>

          <button
            onClick={fetchRuns}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition"
            title="Refresh Runs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-6">
        {loading ? (
          <div className="py-16 text-center text-slate-500 animate-pulse">Loading execution runs...</div>
        ) : (
          <RunTable runs={filteredRuns} />
        )}
      </div>
    </div>
  );
}

