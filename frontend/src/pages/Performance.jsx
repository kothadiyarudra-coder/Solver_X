import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Gauge,
  Clock,
  Zap,
  TrendingDown,
  TrendingUp,
  Search,
  Filter,
  Globe,
  Database,
  Cpu,
  RefreshCw,
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
} from "recharts";
import { api } from "../services/api";
import { useProject } from "../context/ProjectContext";
import { socket } from "../services/socket";

export default function Performance() {
  const navigate = useNavigate();
  const { selectedProject, selectedProjectObj } = useProject();
  const [filterType, setFilterType] = useState("all");
  const [interval, setInterval] = useState("5m");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [perfSummary, setPerfSummary] = useState({ p50: 0, p75: 0, p95: 0, avg: 0, totalEvents: 0 });
  const [transactions, setTransactions] = useState([]);
  const [latencyData, setLatencyData] = useState([]);

  const loadPerformance = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const pId = selectedProject !== "all" ? selectedProject : undefined;
      const perfData = await api.getPerformanceStats({ projectId: pId, interval });

      if (perfData.summary) {
        setPerfSummary(perfData.summary);
      }
      if (perfData.transactions) {
        setTransactions(perfData.transactions);
      }

      if (perfData.timeline && perfData.timeline.length > 0) {
        setLatencyData(perfData.timeline);
      } else {
        // Fallback calculation with granular minutes
        const eventsData = await api.getEvents({ projectId: pId, limit: 200 });
        const stepMin = interval === "1m" ? 1 : interval === "15m" ? 15 : interval === "1h" ? 60 : 5;
        const stepMs = stepMin * 60 * 1000;
        const buckets = {};

        (eventsData || []).forEach((ev) => {
          const date = ev.timestamp ? new Date(ev.timestamp) : new Date();
          const bucketTime = Math.floor(date.getTime() / stepMs) * stepMs;
          const d = new Date(bucketTime);
          const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
          if (!buckets[timeStr]) buckets[timeStr] = { durations: [], errors: 0 };
          buckets[timeStr].durations.push(ev.durationMs || 0);
          if (ev.status === "failed") buckets[timeStr].errors++;
        });

        const latencyPoints = Object.entries(buckets).map(([timeStr, b]) => {
          b.durations.sort((a, b) => a - b);
          const count = b.durations.length;
          return {
            time: timeStr,
            p50: b.durations[Math.floor(count * 0.5)] || 0,
            p75: b.durations[Math.floor(count * 0.75)] || 0,
            p95: b.durations[Math.floor(count * 0.95)] || 0,
            errors: b.errors || 0,
          };
        });

        setLatencyData(latencyPoints);
      }
    } catch (err) {
      console.error("[Performance] Load failed:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformance(false);

    // Real-time live update handler via Socket.IO
    const onLiveUpdate = () => {
      loadPerformance(true); // Silent real-time refresh
    };

    if (socket) {
      socket.on("new_event", onLiveUpdate);
      socket.on("batch_events", onLiveUpdate);
      socket.on("code_errors_synced", onLiveUpdate);
      socket.on("run_started", onLiveUpdate);
      socket.on("run_updated", onLiveUpdate);
    }

    return () => {
      if (socket) {
        socket.off("new_event", onLiveUpdate);
        socket.off("batch_events", onLiveUpdate);
        socket.off("code_errors_synced", onLiveUpdate);
        socket.off("run_started", onLiveUpdate);
        socket.off("run_updated", onLiveUpdate);
      }
    };
  }, [interval, selectedProject]);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesType =
      filterType === "all" ||
      tx.type?.toLowerCase().includes(filterType.toLowerCase());
    const matchesSearch =
      tx.name?.toLowerCase().includes(search.toLowerCase()) ||
      tx.type?.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const apdexScore = perfSummary.totalEvents > 0
    ? (perfSummary.p50 <= 200 ? 0.96 : perfSummary.p50 <= 500 ? 0.85 : 0.65).toFixed(2)
    : "1.00";

  return (
    <div className="min-h-screen w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#302345] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Gauge className="h-6 w-6 text-indigo-400" />
              Performance & Traces
            </h1>
            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
              Apdex: {apdexScore}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Real APM telemetry, latency distribution percentiles, and span performance from MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Interval Selector */}
          <div className="flex items-center bg-[#241738] rounded-lg p-0.5 border border-slate-700/60 text-[11px]">
            {["1m", "5m", "15m", "1h"].map((intVal) => (
              <button
                key={intVal}
                onClick={() => setInterval(intVal)}
                className={`px-2 py-1 rounded-md transition font-mono ${
                  interval === intVal
                    ? "bg-purple-600 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {intVal}
              </button>
            ))}
          </div>

          <button
            onClick={loadPerformance}
            className="flex items-center gap-1.5 rounded-md border border-[#302345] bg-[#1E1531] px-3.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-purple-500/40 hover:text-white"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => navigate("/compare")}
            className="flex items-center gap-1.5 rounded-md border border-[#302345] bg-[#241738] px-3.5 py-1.5 text-sm font-medium text-slate-300 transition hover:border-purple-500/40 hover:text-white"
          >
            Compare Runs
          </button>
        </div>
      </div>

      {/* APM Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            P50 Latency (Median)
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{perfSummary.p50} ms</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">50% of requests faster than this</p>
        </div>

        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            P95 Latency (Tail)
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400">{perfSummary.p95} ms</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">95th percentile worst-case response</p>
        </div>

        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Average Latency
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">{perfSummary.avg} ms</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Across {perfSummary.totalEvents} recorded events</p>
        </div>

        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Telemetry Events
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{perfSummary.totalEvents}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Ingested and indexed in MongoDB</p>
        </div>
      </div>

      {/* Latency & Error Timeline Chart */}
      <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Latency & Error Spikes Timeline</h2>
            <p className="text-xs text-slate-400">Real-time latency percentiles and failure events</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" /> P50 Median
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-indigo-400" /> P75
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> P95 Tail
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-rose-400">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Error Spikes
            </span>
          </div>
        </div>

        {latencyData.length === 0 ? (
          <div className="flex flex-col h-[260px] items-center justify-center text-center text-slate-400">
            <Inbox size={32} className="text-slate-500 mb-2" />
            <p className="text-xs">No span timeline data available yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={latencyData}>
              <defs>
                <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="p75Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818CF8" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="p50Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A855F7" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#A855F7" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="errorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.7} />
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
                dataKey="p95"
                name="P95 Latency (ms)"
                stroke="#F59E0B"
                strokeWidth={2}
                fill="url(#p95Grad)"
              />
              <Area
                type="monotone"
                dataKey="p75"
                name="P75 Latency (ms)"
                stroke="#818CF8"
                strokeWidth={2}
                fill="url(#p75Grad)"
              />
              <Area
                type="monotone"
                dataKey="p50"
                name="P50 Latency (ms)"
                stroke="#A855F7"
                strokeWidth={2}
                fill="url(#p50Grad)"
              />
              <Area
                type="monotone"
                dataKey="errors"
                name="Error Count"
                stroke="#F43F5E"
                strokeWidth={2.5}
                fill="url(#errorGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Key Transactions Table */}
      <div className="rounded-xl border border-[#302345] bg-[#1E1531] overflow-hidden">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-[#302345]">
          <div>
            <h2 className="text-base font-semibold text-white">Operations & Spans</h2>
            <p className="text-xs text-slate-400">Aggregated from MongoDB event records</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-[#302345] bg-[#241738] px-3 py-1.5">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Filter operations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-xs text-white outline-none placeholder-slate-500 w-36"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#241738] text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3">Operation / Span</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Invocations</th>
                <th className="px-5 py-3">Avg Duration</th>
                <th className="px-5 py-3">Max Duration</th>
                <th className="px-5 py-3">Failure Rate</th>
                <th className="px-5 py-3 text-right">Run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#302345]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    Loading telemetry operations...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    No span operations recorded yet.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr
                    key={idx}
                    onClick={() => tx.runId && navigate(`/runs/${tx.runId}`)}
                    className="hover:bg-[#281d3e] transition cursor-pointer"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-white">
                      {tx.name}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      {tx.type}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-300">
                      {tx.count}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-emerald-400">
                      {tx.avgDuration} ms
                    </td>
                    <td className="px-5 py-3.5 font-medium text-amber-400">
                      {tx.maxDuration} ms
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs font-medium ${
                          tx.failureRate === "0.0%"
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {tx.failureRate}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {tx.runId ? (
                        <span className="text-xs font-medium text-purple-400 hover:text-purple-300">
                          {tx.runId} →
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
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
