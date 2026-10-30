import React from 'react';
import { Sparkles, AlertTriangle, CheckCircle, Search, HelpCircle } from 'lucide-react';

export default function DiagnosisCard({ diagnosis, loading }) {
  if (loading) {
    return (
      <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-8 text-center animate-pulse">
        <Sparkles className="w-8 h-8 text-sky-400 mx-auto mb-3 animate-spin" />
        <h3 className="text-base font-semibold text-white">Analyzing Run with Gemini AI...</h3>
        <p className="text-xs text-slate-400 mt-1">
          Evaluating timeline events, identifying divergence points, and synthesizing evidence.
        </p>
      </div>
    );
  }

  if (!diagnosis) {
    return (
      <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
        <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Click "Run AI Diagnosis" to analyze failures for this execution.</p>
      </div>
    );
  }

  const confidenceColors = {
    high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    low: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  };

  return (
    <div className="bg-gradient-to-b from-slate-800/60 to-slate-800/20 border border-sky-500/30 rounded-xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">Gemini Evidence-Based Diagnosis</h3>
            <p className="text-xs text-slate-400">Automated root-cause analysis based on execution events</p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
            confidenceColors[diagnosis.confidence] || confidenceColors.medium
          }`}
        >
          {diagnosis.confidence || 'medium'} Confidence
        </span>
      </div>

      {/* Summary */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Summary</p>
        <p className="text-sm text-slate-200 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          {diagnosis.summary}
        </p>
      </div>

      {/* Root Cause */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Probable Root Cause
        </p>
        <p className="text-sm text-rose-200 bg-rose-950/30 p-3.5 rounded-lg border border-rose-500/20 font-medium">
          {diagnosis.rootCause}
        </p>
      </div>

      {/* Supporting Evidence */}
      {diagnosis.evidence && diagnosis.evidence.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-2 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            Supporting Evidence
          </p>
          <div className="space-y-2">
            {diagnosis.evidence.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-3 bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-300"
              >
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 whitespace-nowrap">
                  {item.eventId}
                </span>
                <p className="mt-0.5 text-slate-300">{item.observation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Fixes */}
      {diagnosis.suggestedChecks && diagnosis.suggestedChecks.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            Suggested Checks & Remediations
          </p>
          <ul className="space-y-1.5 text-xs text-slate-300 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
            {diagnosis.suggestedChecks.map((check, idx) => (
              <li key={idx} className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{check}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

