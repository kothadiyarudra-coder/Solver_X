import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HelpCircle,
  CheckCircle2,
  FolderKanban,
  AlertCircle,
  Gauge,
  Rocket,
  Compass,
  LayoutDashboard,
  BrainCircuit,
  Settings,
  Sparkles,
  ArrowRight,
  Code2,
  Layers,
  Copy,
  Check,
} from "lucide-react";
import { useProject } from "../context/ProjectContext";

export default function Help() {
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopy = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const features = [
    {
      id: "projects",
      title: "Projects & Automated Code Diagnosis",
      path: "/projects",
      icon: FolderKanban,
      badge: "Core Architecture",
      color: "from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400",
      description:
        "Manage monitored applications, microservices, and repositories. Register existing code via local directory path, Git repository URL, or telemetry stream. When registered, Google Gemini automatically scans all source files for runtime vulnerabilities, unhandled error risks, and blocking synchronous operations.",
      highlights: [
        "Local folder path & repository URL ingest",
        "Automated Gemini code audit & health scoring (Reliability, Security, Performance)",
        "Direct synchronization of diagnosed bugs into the Issues Tracker",
      ],
    },
    {
      id: "dashboard",
      title: "Real-Time Executive Dashboards",
      path: "/dashboard",
      icon: LayoutDashboard,
      badge: "Observability",
      color: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400",
      description:
        "Provides high-level visibility across all system executions. Tracks total runs, success vs failure percentages, real-time error distribution charts, and recent run history with live WebSocket updates.",
      highlights: [
        "Executive KPI metrics (Total Runs, Pass Rate, Error Count)",
        "Interactive Status Breakdown & Error Distribution charts",
        "Chronological execution timeline with instant run detail links",
      ],
    },
    {
      id: "issues",
      title: "Grouped Issues & Bug Tracker",
      path: "/issues",
      icon: AlertCircle,
      badge: "Failure Intelligence",
      color: "from-rose-500/20 to-orange-500/10 border-rose-500/30 text-rose-400",
      description:
        "Automatically deduplicates and groups incoming error events into organized, actionable issues. Aggregates event occurrences, affected runs, unique user count, culprit endpoints, and AI suggested code fixes.",
      highlights: [
        "Intelligent error deduplication and grouping",
        "Triage workflow: Mark issues as Unresolved, Resolved, or Ignored",
        "One-click AI suggested patch inspection",
      ],
    },
    {
      id: "performance",
      title: "APM Performance, Traces & Bug Issues",
      path: "/performance",
      icon: Gauge,
      badge: "APM Telemetry",
      color: "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-400",
      description:
        "Real-time application performance monitoring (APM). Calculates true percentile metrics (P50 Median, P75, P95 Tail Latency, and Average Duration), graphs latency and error spikes over real local time, and surfaces diagnosed Bug Issues right below the stats.",
      highlights: [
        "Precision P50, P75, P95 latency and Apdex score calculation",
        "Real-time sliding timeline graph anchored to current local clock",
        "Integrated Bug Issues section detailing active defects and fixes",
        "Detailed operation span breakdown with average & max durations",
      ],
    },
    {
      id: "discover",
      title: "Discover Telemetry Event Explorer",
      path: "/discover",
      icon: Compass,
      badge: "Log & Span Explorer",
      color: "from-cyan-500/20 to-teal-500/10 border-cyan-500/30 text-cyan-400",
      description:
        "Fast event exploration across all ingested telemetry. Search and filter by project, event type, status, or keyword. View multi-interval histograms (1m, 5m, 15m, 30m, 1h) and inspect raw JSON payloads.",
      highlights: [
        "Multi-interval time-series stacked charts",
        "Full-text search across span names, types, and error messages",
        "Inspect expandable raw event payloads & metadata",
      ],
    },
    {
      id: "diagnosis",
      title: "Google Gemini AI Root-Cause Engine",
      path: "/diagnosis",
      icon: BrainCircuit,
      badge: "Automated Root Cause",
      color: "from-emerald-500/20 to-green-500/10 border-emerald-500/30 text-emerald-400",
      description:
        "When an application execution fails, Solver_X automatically correlates the error stack trace with relevant source code files and prompts Google Gemini to diagnose exactly why the failure occurred and generate copy-paste ready code patches.",
      highlights: [
        "Automated root-cause explanation in clear human terms",
        "Identifies precise culprit file and line number",
        "Generates copyable code patches to resolve the error",
      ],
    },
    {
      id: "compare",
      title: "Differential Run Comparison",
      path: "/compare",
      icon: Rocket,
      badge: "Regression Analysis",
      color: "from-indigo-500/20 to-purple-500/10 border-indigo-500/30 text-indigo-400",
      description:
        "Compare any two execution runs side-by-side to detect performance regressions or newly introduced errors. Highlights execution duration deltas, error count discrepancies, and payload differences.",
      highlights: [
        "Side-by-side duration & latency differential",
        "Identifies regressions between software versions or staging/prod",
        "Event-by-event status and duration comparison table",
      ],
    },
  ];

  return (
    <div className="min-h-screen w-full space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[#302345] bg-gradient-to-r from-[#1B1124] via-[#241738] to-[#1E1531] p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 px-3 py-1 text-xs font-semibold text-purple-300">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              Platform Guide & Interactive Demo
            </span>
            <span className="rounded-full bg-slate-800/80 border border-slate-700 px-2.5 py-0.5 text-xs text-slate-400 font-mono">
              v1.0.0
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-sky-400">Solver_X</span>
          </h1>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Solver_X is an observability, telemetry, and automated AI diagnostic platform. It monitors application executions, ingests distributed spans, detects latency bottlenecks and crashes, and uses <strong>Google Gemini AI</strong> to deliver automated root-cause analysis and copy-paste code fixes.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#feature-walkthrough"
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-purple-500 transition"
            >
              <Layers size={14} />
              Explore All Features
            </a>
            <a
              href="#quickstart"
              className="flex items-center gap-2 rounded-lg border border-[#302345] bg-[#241738] px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-purple-500/40 transition"
            >
              <Code2 size={14} />
              SDK Quickstart
            </a>
          </div>
        </div>
      </div>

      {/* Feature Walkthrough Section */}
      <div id="feature-walkthrough" className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            Complete Feature Guide
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Detailed breakdown of every diagnostic module available in Solver_X
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="flex flex-col justify-between rounded-xl border border-[#302345] bg-[#1E1531] p-5 shadow-sm hover:border-purple-500/40 transition group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg border bg-gradient-to-br ${feat.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition">
                          {feat.title}
                        </h3>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Route: {feat.path}
                        </span>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                      {feat.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {feat.description}
                  </p>

                  <div className="mt-3.5 space-y-1.5 pt-3 border-t border-[#302345]">
                    {feat.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-slate-400">
                        <CheckCircle2 size={12} className="text-purple-400 shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#302345]/60 flex items-center justify-between">
                  <button
                    onClick={() => navigate(feat.path)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 transition"
                  >
                    <span>Open {feat.title.split(" ")[0]}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Developer SDK Quickstart */}
      <div id="quickstart" className="rounded-2xl border border-[#302345] bg-[#1E1531] p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-[#302345]/70 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Developer Integration Quickstart</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Instrument your Node.js or Python backend with 3 lines of code
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Node.js / Express Example */}
          <div className="rounded-xl border border-slate-700/60 bg-[#160d24] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Node.js / Express Telemetry SDK
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      `const { SolverX } = require('solver-x');\n\n// Initialize SDK\nconst solver = new SolverX({ projectId: '${selectedProject !== "all" ? selectedProject : "my-app"}' });\n\n// Start monitored run\nconst run = await solver.startRun({ workflowName: 'API Ingress' });\n\n// Record telemetry span\nawait solver.recordEvent({\n  runId: run.runId,\n  type: 'http_request',\n  status: 'success',\n  durationMs: 34,\n  payload: { endpoint: '/api/v1/orders' }\n});`,
                      "node-code"
                    )
                  }
                  className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-white"
                >
                  {copiedCode === "node-code" ? <Check size={12} /> : <Copy size={12} />}
                  {copiedCode === "node-code" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto p-3 rounded bg-[#1B1124] border border-slate-800">
{`const { SolverX } = require('solver-x');

// Initialize SDK
const solver = new SolverX({ 
  projectId: '${selectedProject !== "all" ? selectedProject : "my-app"}' 
});

// Start monitored run
const run = await solver.startRun({ 
  workflowName: 'API Ingress' 
});

// Record telemetry span
await solver.recordEvent({
  runId: run.runId,
  type: 'http_request',
  status: 'success',
  durationMs: 34,
  payload: { endpoint: '/api/v1/orders' }
});`}
              </pre>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Automatically captures execution duration, status, and payload.
            </p>
          </div>

          {/* Direct REST API Example */}
          <div className="rounded-xl border border-slate-700/60 bg-[#160d24] p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-400" />
                  Direct REST API (cURL)
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      `# 1. Create Run\ncurl -X POST http://localhost:5000/api/runs \\\n  -H "Content-Type: application/json" \\\n  -d '{"runId":"run-101","projectId":"${selectedProject !== "all" ? selectedProject : "my-app"}","workflowName":"User Auth"}'\n\n# 2. Ingest Event\ncurl -X POST http://localhost:5000/api/events \\\n  -H "Content-Type: application/json" \\\n  -d '{"eventId":"ev-101","runId":"run-101","projectId":"${selectedProject !== "all" ? selectedProject : "my-app"}","type":"auth","status":"success","durationMs":45}'`,
                      "curl-code"
                    )
                  }
                  className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-white"
                >
                  {copiedCode === "curl-code" ? <Check size={12} /> : <Copy size={12} />}
                  {copiedCode === "curl-code" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="font-mono text-[11px] text-slate-300 overflow-x-auto p-3 rounded bg-[#1B1124] border border-slate-800">
{`# 1. Create Run
curl -X POST http://localhost:5000/api/runs \\
  -H "Content-Type: application/json" \\
  -d '{"runId":"run-101","projectId":"${selectedProject !== "all" ? selectedProject : "my-app"}","workflowName":"User Auth"}'

# 2. Ingest Event
curl -X POST http://localhost:5000/api/events \\
  -H "Content-Type: application/json" \\
  -d '{"eventId":"ev-101","runId":"run-101","projectId":"${selectedProject !== "all" ? selectedProject : "my-app"}","type":"auth","status":"success","durationMs":45}'`}
              </pre>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Works with any language (Python, Go, Java, Rust) without third-party dependencies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
