import React, { useState } from 'react';
import { CheckCircle2, XCircle, Info, ChevronRight, ChevronDown, Clock, Database, Globe, Cpu } from 'lucide-react';

const typeIcons = {
  database_query: Database,
  api_request: Globe,
  llm_call: Cpu,
  response_send: Globe,
};

export default function EventTimeline({ events = [] }) {
  const [expandedId, setExpandedId] = useState(null);

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 bg-slate-800/20 rounded-xl border border-slate-800">
        <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No events found for this run timeline.</p>
      </div>
    );
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {events.map((event, idx) => {
        const isExpanded = expandedId === event.eventId;
        const IconComponent = typeIcons[event.type] || Info;
        const isFail = event.status === 'failed';

        return (
          <div
            key={event.eventId || idx}
            className={`border rounded-xl transition overflow-hidden ${
              isFail
                ? 'bg-rose-950/20 border-rose-500/30'
                : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div
              onClick={() => toggleExpand(event.eventId)}
              className="p-4 flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center space-x-3.5">
                <div
                  className={`p-2 rounded-lg border ${
                    isFail
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-sky-400 font-medium">{event.eventId}</span>
                    <span className="text-sm font-semibold text-slate-200">{event.type}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="font-mono text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {event.durationMs || 0}ms
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    isFail
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  {isFail ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  {event.status}
                </span>

                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-900/60">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Event Payload & Diagnostics
                </p>
                <pre className="text-xs font-mono bg-slate-950 p-3 rounded-lg overflow-x-auto text-sky-300 border border-slate-800">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

