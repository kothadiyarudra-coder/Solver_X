import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  ChevronDown,
  Save,
  Zap,
  Columns,
  Download,
  Tag,
  RefreshCw,
  AlertCircle,
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

const AREA_COLORS = [
  "#E1567C",
  "#F5A623",
  "#F8D66D",
  "#E8849A",
  "#F47B60",
  "#FAE8A0",
];

export default function Discover() {
  const { selectedProject, selectedProjectObj } = useProject();
  const [query, setQuery] = useState("event.type:error");
  const [interval, setInterval] = useState("5m");
  const [loading, setLoading] = useState(true);
  const [errorList, setErrorList] = useState([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [errorCategories, setErrorCategories] = useState([]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const pId = selectedProject !== "all" ? selectedProject : undefined;
      const [errorData, timeseriesRes] = await Promise.all([
        api.getErrorEvents({ projectId: pId }),
        api.getEventTimeseries({ projectId: pId, interval }),
      ]);

      const errors = errorData.errors || [];
      setErrorList(errors);
      setTotalEvents(errorData.totalErrors || 0);

      // Handle new structured response or legacy array
      let points = [];
      let categories = [];

      if (timeseriesRes && Array.isArray(timeseriesRes.points)) {
        points = timeseriesRes.points;
        categories = (timeseriesRes.categories || []).filter((c) => typeof c === "string" && c !== "_id");
      } else if (Array.isArray(timeseriesRes)) {
        // Fallback for legacy format
        const typesSet = new Set();
        const hourMap = {};
        timeseriesRes.forEach((item) => {
          if (!item) return;
          const hour = (typeof item._id === "object" && item._id?.hour) || (typeof item.time === "string" ? item.time : "00:00");
          if (!hourMap[hour]) hourMap[hour] = { time: hour, failed: 0 };
          const rawKey = typeof item._id === "object" ? item._id?.type : item.type;
          const key = typeof rawKey === "string" ? rawKey : "error";
          typesSet.add(key);
          const errCount = item.errors || item.count || 0;
          hourMap[hour][key] = (hourMap[hour][key] || 0) + errCount;
          hourMap[hour].failed = (hourMap[hour].failed || 0) + errCount;
        });
        points = Object.values(hourMap);
        categories = Array.from(typesSet);
      }

      // Ensure every point has a failed / error count
      points = points.map((pt) => ({
        ...pt,
        failed: Number(pt.failed || pt.errors || 0),
      }));

      // If categories is empty, extract primitive keys from points or fallback to 'failed'
      if (categories.length === 0 && points.length > 0) {
        const catSet = new Set();
        points.forEach((p) => {
          if (!p || typeof p !== "object") return;
          Object.keys(p).forEach((k) => {
            if (
              typeof k === "string" &&
              k !== "_id" &&
              k !== "id" &&
              k !== "time" &&
              k !== "timestamp" &&
              k !== "success" &&
              k !== "total" &&
              !k.endsWith("_errors") &&
              typeof p[k] !== "object"
            ) {
              catSet.add(k);
            }
          });
        });
        categories = Array.from(catSet);
      }

      let cleanCategories = categories.filter((c) => typeof c === "string" && c !== "_id");
      if (cleanCategories.length === 0) {
        cleanCategories = ["failed"];
      }

      setErrorCategories(cleanCategories);
      setChartData(points);
    } catch (err) {
      console.error("[Discover] Failed to fetch telemetry:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);

    // Real-time live update handler via Socket.IO
    const onLiveUpdate = () => {
      fetchData(true); // Silent real-time refresh
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

  const filteredErrors = errorList.filter((item) => {
    if (!query.trim() || query === "event.type:error") return true;
    const cleanQ = query.replace("event.type:error", "").trim().toLowerCase();
    if (!cleanQ) return true;
    const itemTitle = typeof item.title === "object" && item.title !== null
      ? (item.title.hour ? `${item.title.hour}: ${item.title.type || "error"}` : JSON.stringify(item.title))
      : String(item.title || "");
    const itemProj = typeof item.projectId === "object" && item.projectId !== null
      ? JSON.stringify(item.projectId)
      : String(item.projectId || "");
    return (
      itemTitle.toLowerCase().includes(cleanQ) ||
      itemProj.toLowerCase().includes(cleanQ)
    );
  });

  return (
    <div className="min-h-screen w-full px-6 py-4 space-y-4">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Discover</span>
          <span className="text-slate-500">&gt;</span>
          <span className="font-bold text-white">Errors by Title</span>
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
            onClick={fetchData}
            title="Refresh telemetry"
            className="flex items-center gap-1.5 rounded-md border border-slate-700/60 bg-[#1E1531] px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-white">Errors by Title</h1>
      </div>

      {/* Query / Search bar */}
      <div className="relative flex items-center">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 text-slate-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by event.type, error title, or project..."
          className="w-full rounded-md border border-slate-700/60 bg-[#1E1531] py-2 pl-9 pr-9 text-sm text-slate-200 outline-none transition focus:border-purple-500/70"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 text-slate-400 hover:text-white transition"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Stacked Area Chart */}
      <div className="rounded-lg border border-slate-700/60 bg-[#1E1531] p-4">
        {loading ? (
          <div className="flex h-[220px] items-center justify-center text-xs text-slate-400">
            <RefreshCw className="mr-2 animate-spin text-purple-400" size={16} />
            Loading real telemetry from MongoDB...
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col h-[220px] items-center justify-center text-center text-slate-400">
            <Inbox className="mb-2 text-slate-500" size={32} />
            <p className="text-sm font-semibold text-slate-300">No telemetry events recorded yet</p>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              Use the DevTrace SDK or run sample scripts to ingest events into MongoDB.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                {errorCategories.map((cat, idx) => (
                  <linearGradient key={cat} id={`grad-${cat}`} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={AREA_COLORS[idx % AREA_COLORS.length]}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="100%"
                      stopColor={AREA_COLORS[idx % AREA_COLORS.length]}
                      stopOpacity={0.2}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A203C" />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#241738",
                  borderColor: "#302345",
                  borderRadius: "6px",
                  fontSize: 12,
                  color: "#f8fafc",
                }}
              />
              {errorCategories.map((cat, idx) => (
                <Area
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stackId="1"
                  stroke={AREA_COLORS[idx % AREA_COLORS.length]}
                  fill={`url(#grad-${cat})`}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Total Events & Display Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/60 pb-3 pt-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Total Events</span>
          <span className="font-bold text-white">
            {totalEvents.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="rounded bg-[#241738] px-2.5 py-1 text-slate-300 border border-slate-700/50">
            Grouped by: error.title
          </span>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-hidden rounded-lg border border-slate-700/60 bg-[#1E1531]">
        <div className="flex items-center justify-between border-b border-slate-700/60 bg-[#241738] px-4 py-2.5">
          <span className="text-sm font-semibold text-white">Results</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-700/60 bg-[#241738]/60 uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2.5">Title</th>
                <th className="px-4 py-2.5 text-right">Count</th>
                <th className="px-4 py-2.5 text-right">Unique Runs</th>
                <th className="px-4 py-2.5">Project</th>
                <th className="px-4 py-2.5">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading records from database...
                  </td>
                </tr>
              ) : filteredErrors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No error records found matching query.
                  </td>
                </tr>
              ) : (
                filteredErrors.map((row, idx) => {
                  const displayTitle = typeof row.title === "object" && row.title !== null
                    ? (row.title.hour ? `${row.title.hour}: ${row.title.type || "error"}` : JSON.stringify(row.title))
                    : String(row.title || "Unknown Error");
                  const displayProject = typeof row.projectId === "object" && row.projectId !== null
                    ? JSON.stringify(row.projectId)
                    : String(row.projectId || "devtrace");
                  const displayCount = typeof row.count === "number" ? row.count : String(row.count ?? 0);
                  const displayUsers = typeof row.uniqueUsers === "number" ? row.uniqueUsers : String(row.uniqueUsers ?? 1);

                  return (
                    <tr key={idx} className="hover:bg-[#281d3e] transition">
                      <td className="px-4 py-3 font-mono text-slate-200">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: AREA_COLORS[idx % AREA_COLORS.length],
                            }}
                          />
                          <span className="truncate max-w-xl">{displayTitle}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-white">
                        {displayCount}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-300">
                        {displayUsers}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="rounded bg-purple-500/10 px-2 py-0.5 text-purple-300 border border-purple-500/20">
                          {displayProject}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                        {row.lastSeen ? new Date(row.lastSeen).toLocaleTimeString() : "N/A"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
