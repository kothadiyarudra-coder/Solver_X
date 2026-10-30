import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Sparkles, GitCompare, Activity, Radio } from 'lucide-react';
import EventTimeline from '../components/EventTimeline';
import DiagnosisCard from '../components/DiagnosisCard';
import { api } from '../services/api';
import { socket } from '../services/socket';

export default function RunDetails() {
  const { runId } = useParams();
  const [run, setRun] = useState(null);
  const [events, setEvents] = useState([]);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [diagnosing, setDiagnosing] = useState(false);

  const loadRunDetails = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    const [runData, eventData] = await Promise.all([
      api.getRun(runId),
      api.getRunEvents(runId),
    ]);
    setRun(runData);
    setEvents(eventData);
    if (runData?.diagnosis) {
      setDiagnosis(runData.diagnosis);
    }
    if (!isSilent) setLoading(false);
  }, [runId]);

  useEffect(() => {
    loadRunDetails();

    // Listen to real-time events specific to this run
    const onRunEvent = (newEvent) => {
      setEvents((prev) => {
        // Prevent duplicate event UI appending
        if (prev.some((e) => e.eventId === newEvent.eventId)) return prev;
        return [...prev, newEvent];
      });
      loadRunDetails(true); // update run counters
    };

    socket.on(`event_${runId}`, onRunEvent);
    socket.on('run_updated', (updatedRun) => {
      if (updatedRun.runId === runId) {
        setRun(updatedRun);
      }
    });

    return () => {
      socket.off(`event_${runId}`, onRunEvent);
      socket.off('run_updated');
    };
  }, [runId, loadRunDetails]);

  const handleRunDiagnosis = async () => {
    setDiagnosing(true);
    const diag = await api.getDiagnosis(runId);
    setDiagnosis(diag);
    setDiagnosing(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading run details...</div>;
  }

  const isFailed = run?.status === 'failed';

  return (
    <div className="p-8 space-y-6">
      {/* Back button and title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            to="/runs"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Run History
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white font-mono">{runId}</h1>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                isFailed
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              {isFailed ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              {run?.status?.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Workflow: <strong className="text-slate-200">{run?.name}</strong> • Project: <strong className="text-slate-200">{run?.projectId}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/compare?run1=run-6cd762a5&run2=${runId}`}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 text-xs font-medium transition"
          >
            <GitCompare className="w-4 h-4 text-sky-400" />
            Compare Run
          </Link>
          <button
            onClick={handleRunDiagnosis}
            disabled={diagnosing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-sky-500/20 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {diagnosing ? 'Diagnosing...' : 'Generate AI Diagnosis'}
          </button>
        </div>
      </div>

      {/* Meta Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-500">Duration</p>
          <p className="text-base font-bold text-white mt-1 font-mono">{run?.durationMs || 0}ms</p>
        </div>
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-500">Total Events</p>
          <p className="text-base font-bold text-white mt-1">{events.length}</p>
        </div>
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-500">Failed Events</p>
          <p className={`text-base font-bold mt-1 ${isFailed ? 'text-rose-400' : 'text-slate-300'}`}>
            {events.filter((e) => e.status === 'failed').length}
          </p>
        </div>
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-500">Executed At</p>
          <p className="text-xs font-mono text-slate-300 mt-1">
            {run?.startedAt ? new Date(run.startedAt).toLocaleString() : '--'}
          </p>
        </div>
      </div>

      {/* AI Diagnosis Card (if available or diagnosing) */}
      {(diagnosis || diagnosing) && (
        <DiagnosisCard diagnosis={diagnosis} loading={diagnosing} />
      )}

      {/* Timeline Section */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              Event Execution Timeline
              <span className="flex items-center gap-1 text-[10px] font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <Radio className="w-2.5 h-2.5 animate-pulse" /> Live Stream
              </span>
            </h2>
            <p className="text-xs text-slate-400">Sequential events tracked by SDK with inputs and outputs</p>
          </div>
        </div>

        <EventTimeline events={events} />
      </div>
    </div>
  );
}
