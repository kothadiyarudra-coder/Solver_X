import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Database,
  BrainCircuit,
  Code,
  FileText,
  RefreshCw,
  Sparkles,
  Inbox,
  Globe,
} from "lucide-react";
import { api } from "../services/api";

const getEventIcon = (type) => {
  switch (type) {
    case "database_query":
      return Database;
    case "llm_call":
    case "ai_execution":
      return BrainCircuit;
    case "api_request":
    case "response_send":
      return Globe;
    default:
      return Code;
  }
};

export default function RunDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRunData = async () => {
      setLoading(true);
      try {
        const [runData, eventList] = await Promise.all([
          api.getRun(id),
          api.getRunEvents(id),
        ]);
        setRun(runData);
        setEvents(eventList || []);
      } catch (err) {
        console.error("[RunDetails] Fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRunData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-slate-400 gap-2">
        <RefreshCw className="animate-spin text-purple-400" size={20} />
        <span>Loading run telemetry from database...</span>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate("/runs")}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <ArrowLeft size={17} />
          Back to Run History
        </button>
        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-12 text-center text-slate-400">
          <p className="text-lg font-semibold text-slate-200">Run '{id}' not found</p>
          <p className="text-xs text-slate-500 mt-1">This run identifier does not exist in MongoDB.</p>
        </div>
      </div>
    );
  }

  const isSuccess = run.status === "success";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/runs")}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <ArrowLeft size={17} />
          Back to Run History
        </button>

        <button
          onClick={() => navigate("/diagnosis")}
          className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-500"
        >
          <Sparkles size={14} /> Run AI Diagnosis
        </button>
      </div>

      {/* Run Header */}
      <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {run.runId}
            </span>
            <h1 className="mt-3 text-2xl font-bold text-white">{run.name}</h1>
            <p className="mt-1 text-sm text-slate-400">
              Project: <span className="text-purple-300 font-semibold">{run.projectId}</span> • Started: {new Date(run.startedAt).toLocaleString()}
            </p>
          </div>

          <span
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold capitalize ${
              isSuccess
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {isSuccess ? <CheckCircle size={18} /> : <XCircle size={18} />}
            {run.status}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-[#241738] border border-[#302345] p-4">
            <p className="text-xs text-slate-400">Total Duration</p>
            <p className="mt-2 flex items-center gap-2 text-xl font-semibold text-white">
              <Clock size={18} className="text-blue-400" />
              {run.durationMs ? `${run.durationMs} ms` : "0 ms"}
            </p>
          </div>

          <div className="rounded-lg bg-[#241738] border border-[#302345] p-4">
            <p className="text-xs text-slate-400">Total Events Recorded</p>
            <p className="mt-2 text-xl font-semibold text-purple-300">
              {run.totalEvents || events.length}
            </p>
          </div>

          <div className="rounded-lg bg-[#241738] border border-[#302345] p-4">
            <p className="text-xs text-slate-400">Error Count</p>
            <p className={`mt-2 text-xl font-semibold ${run.errorCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {run.errorCount || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Execution Timeline from Real Events */}
      <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-6">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <FileText size={18} className="text-purple-400" /> Real Event Execution Timeline
        </h2>

        {events.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No events have been captured for this run yet.
          </div>
        ) : (
          <div className="relative border-l-2 border-[#302345] ml-4 space-y-6 pl-6">
            {events.map((event, idx) => {
              const Icon = getEventIcon(event.type);
              const eventSuccess = event.status === "success";

              return (
                <div key={event.eventId || idx} className="relative">
                  <div
                    className={`absolute -left-[35px] top-0 flex h-7 w-7 items-center justify-center rounded-full border ${
                      eventSuccess
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                        : "border-red-500 bg-red-500/20 text-red-400"
                    }`}
                  >
                    <Icon size={14} />
                  </div>

                  <div className="rounded-lg bg-[#241738] border border-[#302345] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {event.type}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {event.eventId}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> {event.durationMs ? `${event.durationMs}ms` : "0ms"}
                      </span>
                    </div>

                    {event.payload && Object.keys(event.payload).length > 0 && (
                      <pre className="mt-3 overflow-x-auto rounded bg-[#1A1325] p-3 text-xs text-slate-300 font-mono border border-slate-800">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    )}

                    <div className="mt-2 text-[11px] text-slate-500">
                      Timestamp: {new Date(event.timestamp).toISOString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
