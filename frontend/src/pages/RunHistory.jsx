import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Clock, CheckCircle, XCircle, Search, Eye, RefreshCw, Inbox } from "lucide-react";
import { api } from "../services/api";

export default function RunHistory() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const data = await api.getRuns({ status: filter !== "all" ? filter : undefined });
      setRuns(data || []);
    } catch (err) {
      console.error("[RunHistory] Failed to load runs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, [filter]);

  const filteredRuns = runs.filter((run) => {
    const id = (run.runId || run.id || "").toLowerCase();
    const name = (run.name || "").toLowerCase();
    const q = search.toLowerCase();
    return id.includes(q) || name.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Activity className="text-purple-400" />
            Run History
          </h1>
          <p className="text-slate-400 mt-1">
            Complete log of executed runs, event metrics, and status reports stored in MongoDB.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRuns}
            className="flex items-center gap-1.5 rounded-md border border-[#302345] bg-[#1E1531] px-3 py-2 text-xs font-medium text-slate-300 hover:text-white transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <div className="flex items-center gap-2 rounded-lg border border-[#302345] bg-[#241738] px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Filter by ID or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-white outline-none placeholder:text-slate-500 w-44"
            />
          </div>

          <div className="flex rounded-lg border border-[#302345] bg-[#241738] p-1 text-xs">
            {["all", "success", "failed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded px-3 py-1 font-medium capitalize transition ${
                  filter === f
                    ? "bg-purple-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#302345] bg-[#1E1531]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#241738] text-xs uppercase text-slate-400">
              <tr>
                <th className="px-5 py-4">Run ID</th>
                <th className="px-5 py-4">Execution Name</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Duration</th>
                <th className="px-5 py-4">Events</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#302345]">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin text-purple-400" size={16} />
                      Loading runs from database...
                    </div>
                  </td>
                </tr>
              ) : filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Inbox size={28} className="text-slate-500 mb-2" />
                      <p className="text-sm font-semibold text-slate-400">No runs found</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Start your first execution using the SDK (`devtrace.startRun()`) or run `node sample-app/success.js`.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => {
                  const runIdentifier = run.runId || run.id || run._id;
                  const isSuccess = run.status === "success";
                  return (
                    <tr
                      key={runIdentifier}
                      className="text-sm hover:bg-[#281d3e] transition cursor-pointer"
                      onClick={() => navigate(`/runs/${runIdentifier}`)}
                    >
                      <td className="px-5 py-4 font-medium text-purple-400">
                        {runIdentifier}
                      </td>
                      <td className="px-5 py-4 text-slate-200 font-medium">
                        {run.name}
                      </td>
                      <td className="px-5 py-4">
                        {isSuccess ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-xs">
                            <CheckCircle size={15} />
                            Success
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-400 font-medium text-xs">
                            <XCircle size={15} />
                            {run.status || "Failed"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {run.durationMs ? `${run.durationMs}ms` : "0ms"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {run.totalEvents || 0} events
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        {run.startedAt ? new Date(run.startedAt).toLocaleString() : "N/A"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/runs/${runIdentifier}`);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-medium bg-purple-500/10 px-2.5 py-1.5 rounded-md hover:bg-purple-500/20"
                        >
                          <Eye size={14} /> View
                        </button>
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
