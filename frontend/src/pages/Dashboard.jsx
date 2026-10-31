import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Layers,
  Inbox,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api } from "../services/api";

const PIE_COLORS = ["#9333EA", "#3B82F6", "#EC4899", "#10B981", "#F59E0B"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [runs, setRuns] = useState([]);
  const [trendData, setTrendData] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsData, runsData, timeseries] = await Promise.all([
        api.getAnalytics(),
        api.getRuns({ limit: 8 }),
        api.getEventTimeseries(),
      ]);

      setAnalytics(analyticsData);
      setRuns(runsData);

      // Group timeseries for execution trend chart
      const hourMap = {};
      (timeseries || []).forEach((item) => {
        const hour = item._id?.hour || "00:00";
        if (!hourMap[hour]) hourMap[hour] = { time: hour, success: 0, failed: 0 };
        const errors = item.errors || 0;
        const total = item.count || 0;
        hourMap[hour].failed += errors;
        hourMap[hour].success += Math.max(0, total - errors);
      });
      setTrendData(Object.values(hourMap));
    } catch (err) {
      console.error("[Dashboard] Load failed:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const totalRuns = analytics?.totalRuns ?? runs.length;
  const successfulRuns = analytics?.successfulRuns ?? runs.filter((r) => r.status === "success").length;
  const failedRuns = analytics?.failedRuns ?? runs.filter((r) => r.status === "failed").length;
  const successRate = analytics?.successRate ?? (totalRuns > 0 ? ((successfulRuns / totalRuns) * 100).toFixed(1) : 0);
  const avgDurationMs = analytics?.avgDurationMs ?? 0;

  const eventDistribution = (analytics?.failuresByEventType || []).map((f, i) => ({
    name: f.eventType,
    value: f.count,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <div className="min-h-screen w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#302345] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-purple-400" />
              Observability Overview
            </h1>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
              Live MongoDB Data
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real-time telemetry, failure frequency, and execution diagnostics from MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            title="Refresh dashboard"
            className="flex items-center gap-1.5 rounded-md border border-[#302345] bg-[#1E1531] px-3.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-purple-500/40 hover:text-white"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => navigate("/discover")}
            className="flex items-center gap-1.5 rounded-md border border-[#302345] bg-[#241738] px-3.5 py-1.5 text-sm font-medium text-slate-300 transition hover:border-purple-500/40 hover:text-white"
          >
            <Layers size={15} />
            Discover
          </button>
          <button
            onClick={() => navigate("/diagnosis")}
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Sparkles size={15} />
            AI Diagnosis
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Executions
            </span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <Activity size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{totalRuns}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Recorded across all project runs</p>
        </div>

        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Success Rate
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{successRate}%</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">{successfulRuns} successful out of {totalRuns}</p>
        </div>

        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Failed Runs
            </span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
              <XCircle size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-400">{failedRuns}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Requires investigation or diagnosis</p>
        </div>

        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Avg Duration
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{avgDurationMs} ms</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Aggregated execution time</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Execution Trends Chart */}
        <div className="lg:col-span-2 rounded-xl border border-[#302345] bg-[#1E1531] p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Execution Volume & Errors</h2>
              <p className="text-xs text-slate-400">Hourly events breakdown</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" /> Success
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Failed
              </span>
            </div>
          </div>

          {trendData.length === 0 ? (
            <div className="flex flex-col h-[260px] items-center justify-center text-center text-slate-400">
              <Inbox size={28} className="text-slate-500 mb-2" />
              <p className="text-xs">No execution trends recorded yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9333EA" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#9333EA" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="roseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#302345" />
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#241738",
                    borderColor: "#302345",
                    borderRadius: "8px",
                    color: "#f8fafc",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="success"
                  stroke="#A855F7"
                  strokeWidth={2}
                  fill="url(#purpleGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stroke="#F43F5E"
                  strokeWidth={2}
                  fill="url(#roseGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Event Breakdown */}
        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-white">Failures by Event Type</h2>
            <p className="text-xs text-slate-400">From MongoDB aggregation pipeline</p>
          </div>

          {eventDistribution.length === 0 ? (
            <div className="flex flex-col h-[210px] items-center justify-center text-center text-slate-400">
              <CheckCircle size={28} className="text-emerald-500 mb-2" />
              <p className="text-xs font-medium text-slate-300">No failures recorded!</p>
              <p className="text-[11px] text-slate-500 mt-1">All events succeeded.</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={eventDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {eventDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#241738",
                      borderColor: "#302345",
                      borderRadius: "8px",
                      color: "#f8fafc",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-2 space-y-1.5">
                {eventDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </span>
                    <span className="font-semibold text-white">{item.value} failures</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Executions Table */}
      <div className="rounded-xl border border-[#302345] bg-[#1E1531] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#302345] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">Recent Execution Runs</h2>
            <p className="text-xs text-slate-400">Live runs from MongoDB</p>
          </div>
          <button
            onClick={() => navigate("/runs")}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition"
          >
            View All Runs →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#241738] text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-3">Run ID</th>
                <th className="px-6 py-3">Workflow Name</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Duration</th>
                <th className="px-6 py-3">Events</th>
                <th className="px-6 py-3">Started</th>
                <th className="px-6 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#302345]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    Loading runs from database...
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    No runs recorded yet in MongoDB. Run `node sample-app/success.js` to see real runs here.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr
                    key={run.runId || run._id}
                    onClick={() => navigate(`/runs/${run.runId}`)}
                    className="hover:bg-[#281d3e] transition cursor-pointer"
                  >
                    <td className="whitespace-nowrap px-6 py-3.5 font-medium text-purple-400">
                      {run.runId}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-white">
                      {run.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      {run.status === "success" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                          <CheckCircle size={13} />
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20">
                          <XCircle size={13} />
                          {run.status}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-slate-300">
                      {run.durationMs ? `${run.durationMs}ms` : "0ms"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-slate-400">
                      {run.totalEvents || 0} events
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-slate-400">
                      {run.startedAt ? new Date(run.startedAt).toLocaleString() : "N/A"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-right">
                      <span className="text-xs font-medium text-purple-400 hover:text-purple-300">
                        View Trace →
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
