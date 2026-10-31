import React from "react";
import { AlertTriangle, CheckCircle, Lightbulb, Brain, Sparkles } from "lucide-react";

const AIAnalysis = ({ diagnosis }) => {
  if (!diagnosis) {
    return (
      <div className="bg-[#1E1531] p-5 rounded-xl text-slate-400 border border-[#302345]">
        No AI diagnosis available.
      </div>
    );
  }

  return (
    <div className="bg-[#1E1531] border border-[#302345] rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Brain className="text-purple-400" size={24} />
          <h2 className="text-xl font-semibold text-white">
            AI Analysis
          </h2>
        </div>
        {diagnosis.provider && (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
            <Sparkles size={12} className="text-purple-400" />
            {diagnosis.provider} {diagnosis.modelUsed ? `• ${diagnosis.modelUsed}` : ''}
          </span>
        )}
      </div>

      <div>
        <h3 className="text-sm text-slate-400 mb-2">Summary</h3>
        <p className="text-white">{diagnosis.summary}</p>
      </div>

      <div>
        <h3 className="text-sm text-slate-400 mb-2">Root Cause</h3>
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg flex gap-3">
          <AlertTriangle className="text-red-400 shrink-0" />
          <p className="text-slate-200">{diagnosis.rootCause}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm text-slate-400 mb-2">Evidence</h3>
        {diagnosis.evidence?.map((item, index) => (
          <div key={index} className="flex gap-3 mb-2">
            <CheckCircle className="text-emerald-400 shrink-0" size={18} />
            <p className="text-slate-300 text-sm">
              {item.observation}
            </p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm text-slate-400 mb-2">
          Suggested Fixes
        </h3>
        <div className="space-y-2">
          {diagnosis.suggestedChecks?.map((check, index) => (
            <div key={index} className="flex gap-3 text-slate-300">
              <Lightbulb className="text-yellow-400 shrink-0" size={18} />
              <p className="text-sm">{check}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm text-slate-400">
        Confidence: <span className="text-purple-400 capitalize">
          {diagnosis.confidence}
        </span>
      </div>
    </div>
  );
};

export default AIAnalysis;
