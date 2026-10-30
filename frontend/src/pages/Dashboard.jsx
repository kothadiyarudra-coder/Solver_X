import React, { useEffect, useState, useCallback } from 'react';
import { Activity, CheckCircle2, XCircle, Clock, ArrowUpRight, BarChart2, Radio } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import StatCard from '../components/StatCard';
import RunTable from '../components/RunTable';
import { api } from '../services/api';
import { socket } from '../services/socket';

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const data = await api.getAnalytics('demo-project');
    setAnalytics(data);
    if (!isSilent) setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Real-time live update handlers via Socket.IO
    const onLiveUpdate = () => {
      loadData(true); // silent refresh
    };

    socket.on('run_started', onLiveUpdate);
    socket.on('run_updated', onLiveUpdate);
    socket.on('new_event', onLiveUpdate);

    return () => {
      socket.off('run_started', onLiveUpdate);
      socket.off('run_updated', onLiveUpdate);
      socket.off('new_event', onLiveUpdate);
    };
  }, [loadData]);

  if (loading || !analytics) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-800 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const chartData = analytics.failuresByEventType || [];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Project Overview
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Radio className="w-2.5 h-2.5 animate-pulse" /> Live
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time observability and evidence-based diagnosis for application workflows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg font-mono">
            Project: demo-project
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Runs"
          value={analytics.totalRuns}
          subtitle="Monitored execution workflows"
          icon={Activity}
          color="sky"
        />
        <StatCard
          title="Success Rate"
          value={`${analytics.successRate}%`}
          subtitle={`${analytics.successfulRuns} successful`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Failed Runs"
          value={analytics.failedRuns}
          subtitle="Requires diagnosis or fixes"
          icon={XCircle}
          color="rose"
        />
        <StatCard
          title="Avg Duration"
          value={`${analytics.avgDurationMs}ms`}
          subtitle="Average workflow execution time"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Analytics Chart & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/40 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-sky-400" />
                Failures by Event Type
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Identifies recurrent failure hotspots in the pipeline</p>
            </div>
          </div>

          {chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="eventType" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#f43f5e' : '#38bdf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
              No failure data recorded yet.
            </div>
          )}
        </div>

        <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Quick Actions & Scenarios</h2>
            <p className="text-xs text-slate-400 mt-1">Run test scenarios via SDK to simulate production events</p>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs">
                <p className="font-semibold text-emerald-400">Scenario A: Normal Flow</p>
                <code className="text-[11px] text-slate-400 block mt-1">node sample-app/success.js</code>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs">
                <p className="font-semibold text-rose-400">Scenario B: Failure Simulation</p>
                <code className="text-[11px] text-slate-400 block mt-1">node sample-app/failure.js</code>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs">
                <p className="font-semibold text-sky-400">Scenario C: Duplicate Check</p>
                <code className="text-[11px] text-slate-400 block mt-1">node sample-app/duplicate-event.js</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Runs Table */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Execution Runs</h2>
            <p className="text-xs text-slate-400">Latest activity tracked by DevTrace SDK</p>
          </div>
        </div>
        <RunTable runs={analytics.recentRuns || []} />
      </div>
    </div>
  );
}
