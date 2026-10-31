import React, { useState, useEffect } from "react";
import {
  Folder,
  Plus,
  Trash2,
  RefreshCw,
  Layers,
  Inbox,
  Globe,
  HardDrive,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Cpu,
  ExternalLink,
  X,
  FileCode,
  Check,
  Activity,
  ArrowRight,
} from "lucide-react";
import { api } from "../services/api";
import { socket } from "../services/socket";
import { useProject } from "../context/ProjectContext";
import { useNavigate } from "react-router-dom";

export default function Projects() {
  const navigate = useNavigate();
  const { selectedProject, setSelectedProject } = useProject();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState("local_path"); // 'local_path' | 'software_url' | 'folder_upload' | 'telemetry'
  const [sourcePath, setSourcePath] = useState("");
  const [softwareUrl, setSoftwareUrl] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Diagnosis Modal & In-Progress States
  const [analyzingProjectId, setAnalyzingProjectId] = useState(null);
  const [diagnosisModalProject, setDiagnosisModalProject] = useState(null);
  const [activeDiagnosisTab, setActiveDiagnosisTab] = useState("issues"); // 'issues' | 'performance' | 'recommendations'

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data || []);
    } catch (err) {
      console.error("[Projects] Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();

    const onProjectChange = () => {
      fetchProjects();
    };

    const onCodeAnalyzed = ({ projectId: pId, analysis }) => {
      setProjects((prev) =>
        prev.map((p) => {
          if ((p.projectId || p._id) === pId) {
            return { ...p, codeAnalysis: analysis };
          }
          return p;
        })
      );
      if (diagnosisModalProject && (diagnosisModalProject.projectId || diagnosisModalProject._id) === pId) {
        setDiagnosisModalProject((prev) => ({ ...prev, codeAnalysis: analysis }));
      }
      setAnalyzingProjectId(null);
    };

    socket.on("project_created", onProjectChange);
    socket.on("project_deleted", onProjectChange);
    socket.on("code_analyzed", onCodeAnalyzed);

    return () => {
      socket.off("project_created", onProjectChange);
      socket.off("project_deleted", onProjectChange);
      socket.off("code_analyzed", onCodeAnalyzed);
    };
  }, [diagnosisModalProject]);

  // Handle Folder / Files selection
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validExts = [".js", ".jsx", ".ts", ".tsx", ".py", ".json", ".go", ".java", ".rs", ".html", ".css", ".md", ".env.example"];
    const textFiles = files.filter((f) => {
      const lower = f.name.toLowerCase();
      return validExts.some((ext) => lower.endsWith(ext)) || lower === "dockerfile";
    });

    const parsed = [];
    for (const f of textFiles.slice(0, 35)) {
      if (f.size > 200 * 1024) continue; // Skip files > 200kb
      try {
        const text = await f.text();
        parsed.push({
          name: f.name,
          path: f.webkitRelativePath || f.name,
          content: text.slice(0, 8000),
          size: f.size,
        });
      } catch (err) {
        console.warn(`Could not read file ${f.name}:`, err);
      }
    }

    setUploadedFiles(parsed);
  };

  const addProject = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const slug = projectId.trim() || name.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const created = await api.createProject({
        projectId: slug,
        name: name.trim(),
        description: description.trim(),
        sourceType,
        sourcePath: sourcePath.trim(),
        softwareUrl: softwareUrl.trim(),
        codeFiles: uploadedFiles,
        autoAnalyze: autoAnalyze && sourceType !== "telemetry",
      });

      if (created) {
        setProjects((prev) => [created, ...prev.filter((p) => (p.projectId || p._id) !== slug)]);
        setSelectedProject(slug);

        // Reset form
        setName("");
        setProjectId("");
        setDescription("");
        setSourcePath("");
        setSoftwareUrl("");
        setUploadedFiles([]);
        setShowForm(false);

        // If autoAnalyze was triggered, automatically pop open diagnosis modal or track progress
        if (autoAnalyze && sourceType !== "telemetry") {
          setAnalyzingProjectId(slug);
          // Trigger immediate analysis call in foreground to get instant feedback
          runCodeDiagnosis(slug, { files: uploadedFiles, localPath: sourcePath.trim() });
        }
      }
    } catch (err) {
      console.error("[Projects] Create failed:", err);
      alert(err.response?.data?.error?.message || err.message || "Failed to create project.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProject = async (idToDelete) => {
    if (!confirm(`Are you sure you want to delete project '${idToDelete}'?`)) return;
    try {
      await api.deleteProject(idToDelete);
      setProjects((prev) => prev.filter((p) => (p.projectId || p._id) !== idToDelete));
      if (diagnosisModalProject && (diagnosisModalProject.projectId || diagnosisModalProject._id) === idToDelete) {
        setDiagnosisModalProject(null);
      }
    } catch (err) {
      console.error("[Projects] Delete failed:", err);
    }
  };

  const runCodeDiagnosis = async (targetProjectId, options = {}) => {
    setAnalyzingProjectId(targetProjectId);
    try {
      const result = await api.analyzeProjectCode(targetProjectId, options);
      if (result) {
        setProjects((prev) =>
          prev.map((p) => {
            if ((p.projectId || p._id) === targetProjectId) {
              return { ...p, codeAnalysis: result };
            }
            return p;
          })
        );
        const updatedTarget = projects.find((p) => (p.projectId || p._id) === targetProjectId);
        if (updatedTarget) {
          setDiagnosisModalProject({ ...updatedTarget, codeAnalysis: result });
        }
      }
    } catch (err) {
      console.error("[Code Diagnosis] Analysis failed:", err);
      alert("Failed to execute AI code diagnosis. Check console or backend logs.");
    } finally {
      setAnalyzingProjectId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Folder className="text-purple-400" />
            Projects & Codebase Diagnosis
          </h1>
          <p className="text-slate-400 mt-1">
            Register workspaces, import local folders or Git URLs, and run Gemini AI code audits for performance & issues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProjects}
            className="flex items-center gap-1.5 rounded-lg border border-[#302345] bg-[#1E1531] px-3 py-2 text-xs text-slate-300 hover:text-white transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg shadow-purple-600/20"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>
      </div>

      {/* Create Project Form with Source Ingestion Tabs */}
      {showForm && (
        <form
          onSubmit={addProject}
          className="bg-[#1E1531] border border-[#302345] rounded-xl p-6 mb-6 space-y-5 shadow-2xl animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-[#302345] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="text-purple-400" size={18} />
              <h2 className="text-base font-semibold text-white">Register New Project & Import Codebase</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Name *</label>
              <input
                type="text"
                placeholder="e.g. Order Processing Service"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!projectId) {
                    setProjectId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                  }
                }}
                className="w-full bg-[#241738] border border-[#302345] text-white p-2.5 rounded-lg outline-none focus:border-purple-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project ID (Slug) *</label>
              <input
                type="text"
                placeholder="e.g. order-processing-service"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-[#241738] border border-[#302345] text-white p-2.5 rounded-lg outline-none focus:border-purple-500 text-sm font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Core microservice handling checkout, payments and order telemetry"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#241738] border border-[#302345] text-white p-2.5 rounded-lg outline-none focus:border-purple-500 text-sm"
            />
          </div>

          {/* Source Type Selector */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-400">
              Codebase Source & AI Ingestion Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setSourceType("local_path")}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-medium transition ${
                  sourceType === "local_path"
                    ? "bg-purple-600/20 border-purple-500 text-purple-300"
                    : "bg-[#241738] border-[#302345] text-slate-400 hover:text-slate-200"
                }`}
              >
                <HardDrive size={16} />
                Local Folder Path
              </button>

              <button
                type="button"
                onClick={() => setSourceType("software_url")}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-medium transition ${
                  sourceType === "software_url"
                    ? "bg-purple-600/20 border-purple-500 text-purple-300"
                    : "bg-[#241738] border-[#302345] text-slate-400 hover:text-slate-200"
                }`}
              >
                <Globe size={16} />
                Software / Git URL
              </button>

              <button
                type="button"
                onClick={() => setSourceType("folder_upload")}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-medium transition ${
                  sourceType === "folder_upload"
                    ? "bg-purple-600/20 border-purple-500 text-purple-300"
                    : "bg-[#241738] border-[#302345] text-slate-400 hover:text-slate-200"
                }`}
              >
                <UploadCloud size={16} />
                Upload Folder / Files
              </button>

              <button
                type="button"
                onClick={() => setSourceType("telemetry")}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-xs font-medium transition ${
                  sourceType === "telemetry"
                    ? "bg-purple-600/20 border-purple-500 text-purple-300"
                    : "bg-[#241738] border-[#302345] text-slate-400 hover:text-slate-200"
                }`}
              >
                <Activity size={16} />
                Telemetry Only (SDK)
              </button>
            </div>
          </div>

          {/* Conditional Inputs Based on Source Type */}
          {sourceType === "local_path" && (
            <div className="bg-[#241738] p-4 rounded-xl border border-purple-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <HardDrive size={14} className="text-purple-400" />
                  Absolute or Relative Directory Path on Host
                </label>
                <span className="text-[11px] text-slate-500">e.g. /path/to/project or ./sample-app</span>
              </div>
              <input
                type="text"
                placeholder="e.g. /Users/hetsavani/Documents/Projects/Solver_X/sample-app"
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                className="w-full bg-[#1E1531] border border-[#302345] text-white p-2.5 rounded-lg outline-none focus:border-purple-500 font-mono text-xs"
              />
              <p className="text-[11px] text-slate-400">
                DevTrace AI will directly scan the source files (.js, .py, .go, .json) to identify performance bottlenecks and bug vectors.
              </p>
            </div>
          )}

          {sourceType === "software_url" && (
            <div className="bg-[#241738] p-4 rounded-xl border border-purple-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Globe size={14} className="text-purple-400" />
                  Software Web URL or Git Repository
                </label>
                <span className="text-[11px] text-slate-500">HTTPS URL</span>
              </div>
              <input
                type="url"
                placeholder="e.g. https://github.com/my-org/payment-service or https://api.mycompany.com"
                value={softwareUrl}
                onChange={(e) => setSoftwareUrl(e.target.value)}
                className="w-full bg-[#1E1531] border border-[#302345] text-white p-2.5 rounded-lg outline-none focus:border-purple-500 text-xs font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Provide your repository or live endpoint. The AI diagnosis will review architectural endpoint configurations and repository metadata.
              </p>
            </div>
          )}

          {sourceType === "folder_upload" && (
            <div className="bg-[#241738] p-4 rounded-xl border border-purple-500/20 space-y-3">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <UploadCloud size={14} className="text-purple-400" />
                Upload Project Files or Folder
              </label>

              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex-1 border-2 border-dashed border-[#302345] hover:border-purple-500/50 rounded-xl p-4 text-center cursor-pointer bg-[#1E1531]/50 hover:bg-[#1E1531] transition">
                  <UploadCloud size={24} className="mx-auto text-purple-400 mb-1" />
                  <span className="text-xs font-semibold text-white block">Click to select folder or files</span>
                  <span className="text-[11px] text-slate-400">Reads .js, .ts, .py, .go, .json files</span>
                  <input
                    type="file"
                    multiple
                    webkitdirectory=""
                    directory=""
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="bg-[#1E1531] p-3 rounded-lg border border-[#302345] flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 size={15} />
                    {uploadedFiles.length} file(s) staged for AI code diagnosis
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {(uploadedFiles.reduce((acc, f) => acc + (f.size || 0), 0) / 1024).toFixed(1)} KB total
                  </span>
                </div>
              )}
            </div>
          )}

          {sourceType !== "telemetry" && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="autoAnalyzeCheck"
                checked={autoAnalyze}
                onChange={(e) => setAutoAnalyze(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-[#241738] text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="autoAnalyzeCheck" className="text-xs text-slate-300 font-medium cursor-pointer">
                Automatically execute Gemini AI code audit & performance diagnosis upon creation
              </label>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-[#302345]">
            <button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-600/30"
            >
              {submitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  Creating Project...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Project
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-white px-3 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400 gap-2">
          <RefreshCw className="animate-spin text-purple-400" size={18} />
          <span>Loading projects from MongoDB...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-[#302345] bg-[#1E1531] p-12 text-center text-slate-400">
          <Inbox size={32} className="mx-auto text-slate-500 mb-2" />
          <p className="text-base font-semibold text-slate-200">No projects found</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Click "New Project" to register your first workspace and analyze its codebase with Gemini AI.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((project) => {
            const pid = project.projectId || project._id;
            const analysis = project.codeAnalysis;
            const isAnalyzing = analyzingProjectId === pid;

            return (
              <div
                key={pid}
                className="bg-[#1E1531] border border-[#302345] rounded-xl p-5 hover:border-purple-500/40 transition flex flex-col justify-between relative group"
              >
                <div>
                  {/* Top Bar: Icon, Name & Delete */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20 text-purple-400">
                        <Folder size={20} />
                      </div>

                      <div>
                        <h2 className="text-white font-semibold text-base leading-tight">
                          {project.name}
                        </h2>
                        <span className="font-mono text-[11px] text-purple-300">
                          {pid}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteProject(pid)}
                      title="Delete project"
                      className="text-slate-500 hover:text-rose-400 transition p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-slate-400 text-xs mt-3 line-clamp-2 min-h-[32px]">
                    {project.description || "No description provided."}
                  </p>

                  {/* Source Badge */}
                  <div className="mt-3 flex items-center gap-2">
                    {project.sourceType === "local_path" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono truncate max-w-[260px]">
                        <HardDrive size={12} />
                        {project.sourcePath || "Local Path"}
                      </span>
                    ) : project.sourceType === "software_url" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono truncate max-w-[260px]">
                        <Globe size={12} />
                        {project.softwareUrl || "Software URL"}
                      </span>
                    ) : project.sourceType === "folder_upload" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                        <UploadCloud size={12} />
                        {project.codeFiles?.length || 0} Files Uploaded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                        <Activity size={12} />
                        Telemetry SDK
                      </span>
                    )}
                  </div>

                  {/* AI Health Scores & Metrics if Analyzed */}
                  {analysis && analysis.healthScore && (
                    <div className="mt-4 bg-[#241738] p-3 rounded-lg border border-[#302345] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-semibold flex items-center gap-1">
                          <Sparkles size={13} className="text-purple-400" />
                          Health Score
                        </span>
                        <span
                          className={`font-bold font-mono px-2 py-0.5 rounded text-xs ${
                            analysis.healthScore.overall >= 80
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : analysis.healthScore.overall >= 65
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {analysis.healthScore.overall} / 100
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 text-[11px] pt-1 border-t border-[#302345]">
                        <div className="text-center">
                          <span className="text-slate-400 block text-[10px]">Perf</span>
                          <span className="font-semibold text-slate-200">{analysis.healthScore.performance}%</span>
                        </div>
                        <div className="text-center border-x border-[#302345]">
                          <span className="text-slate-400 block text-[10px]">Reliability</span>
                          <span className="font-semibold text-slate-200">{analysis.healthScore.reliability}%</span>
                        </div>
                        <div className="text-center">
                          <span className="text-slate-400 block text-[10px]">Security</span>
                          <span className="font-semibold text-slate-200">{analysis.healthScore.security}%</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                        <span>{analysis.issues?.length || 0} issue(s) detected</span>
                        <span>{analysis.performanceBottlenecks?.length || 0} bottleneck(s)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="mt-5 pt-3 border-t border-[#302345] flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      if (analysis) {
                        setDiagnosisModalProject(project);
                      } else {
                        runCodeDiagnosis(pid);
                      }
                    }}
                    disabled={isAnalyzing}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition ${
                      analysis
                        ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600 hover:text-white"
                        : "bg-purple-600 text-white hover:bg-purple-500 shadow-md shadow-purple-600/20"
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw size={13} className="animate-spin text-purple-300" />
                        Analyzing...
                      </>
                    ) : analysis ? (
                      <>
                        <Sparkles size={13} />
                        View AI Diagnosis
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        Analyze Code with AI
                      </>
                    )}
                  </button>

                  {analysis && (
                    <button
                      onClick={() => runCodeDiagnosis(pid)}
                      disabled={isAnalyzing}
                      title="Re-run AI Diagnosis"
                      className="p-1.5 rounded-lg border border-[#302345] bg-[#241738] text-slate-400 hover:text-white transition"
                    >
                      <RefreshCw size={13} className={isAnalyzing ? "animate-spin" : ""} />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedProject(pid);
                      navigate("/issues");
                    }}
                    title="View issues for this project"
                    className={`py-1.5 px-2.5 rounded-lg border text-xs font-medium transition flex items-center gap-1 ${
                      selectedProject === pid
                        ? "bg-purple-600/30 text-purple-200 border-purple-500"
                        : "border-[#302345] bg-[#241738] text-slate-300 hover:text-white hover:border-slate-600"
                    }`}
                  >
                    <AlertCircle size={13} className="text-rose-400" />
                    <span>Issues</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Code Diagnosis & Performance Modal */}
      {diagnosisModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#1E1531] border border-[#302345] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#302345] flex items-center justify-between bg-[#241738]/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
                  <Sparkles size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{diagnosisModalProject.name}</h2>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#302345] text-purple-300">
                      {diagnosisModalProject.projectId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gemini AI Codebase Architecture, Performance & Vulnerability Audit
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => runCodeDiagnosis(diagnosisModalProject.projectId || diagnosisModalProject._id)}
                  disabled={analyzingProjectId === (diagnosisModalProject.projectId || diagnosisModalProject._id)}
                  className="flex items-center gap-1.5 bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  <RefreshCw
                    size={13}
                    className={
                      analyzingProjectId === (diagnosisModalProject.projectId || diagnosisModalProject._id)
                        ? "animate-spin"
                        : ""
                    }
                  />
                  Re-Analyze
                </button>
                <button
                  onClick={() => setDiagnosisModalProject(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#302345] transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {diagnosisModalProject.codeAnalysis ? (
                <>
                  {/* Health KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-[#241738] p-4 rounded-xl border border-[#302345]">
                      <span className="text-xs text-slate-400 block font-medium">Overall Health</span>
                      <span className="text-2xl font-bold text-white font-mono mt-1 block">
                        {diagnosisModalProject.codeAnalysis.healthScore?.overall || 85} / 100
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">Grade: Excellent</span>
                    </div>

                    <div className="bg-[#241738] p-4 rounded-xl border border-[#302345]">
                      <span className="text-xs text-slate-400 block font-medium">Performance Score</span>
                      <span className="text-2xl font-bold text-sky-400 font-mono mt-1 block">
                        {diagnosisModalProject.codeAnalysis.healthScore?.performance || 80}%
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1 block">Latency & I/O efficiency</span>
                    </div>

                    <div className="bg-[#241738] p-4 rounded-xl border border-[#302345]">
                      <span className="text-xs text-slate-400 block font-medium">Reliability Score</span>
                      <span className="text-2xl font-bold text-emerald-400 font-mono mt-1 block">
                        {diagnosisModalProject.codeAnalysis.healthScore?.reliability || 90}%
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1 block">Error handling & safety</span>
                    </div>

                    <div className="bg-[#241738] p-4 rounded-xl border border-[#302345]">
                      <span className="text-xs text-slate-400 block font-medium">Security Score</span>
                      <span className="text-2xl font-bold text-purple-400 font-mono mt-1 block">
                        {diagnosisModalProject.codeAnalysis.healthScore?.security || 92}%
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1 block">Credential & injection protection</span>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="bg-[#241738] border border-purple-500/20 p-5 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                      <Sparkles size={14} />
                      AI Architectural Assessment
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {diagnosisModalProject.codeAnalysis.summary}
                    </p>
                    <div className="text-[11px] text-slate-400 pt-2 flex items-center justify-between border-t border-[#302345]">
                      <span>Model: {diagnosisModalProject.codeAnalysis.modelUsed || "gemini-1.5-flash"}</span>
                      <span>
                        Last Analyzed:{" "}
                        {diagnosisModalProject.codeAnalysis.analyzedAt
                          ? new Date(diagnosisModalProject.codeAnalysis.analyzedAt).toLocaleString()
                          : "Just now"}
                      </span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-[#302345] gap-4">
                    <button
                      onClick={() => setActiveDiagnosisTab("issues")}
                      className={`pb-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
                        activeDiagnosisTab === "issues"
                          ? "border-purple-500 text-purple-400"
                          : "border-transparent text-slate-400 hover:text-white"
                      }`}
                    >
                      <AlertTriangle size={14} />
                      Bugs & Vulnerabilities ({diagnosisModalProject.codeAnalysis.issues?.length || 0})
                    </button>

                    <button
                      onClick={() => setActiveDiagnosisTab("performance")}
                      className={`pb-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
                        activeDiagnosisTab === "performance"
                          ? "border-purple-500 text-purple-400"
                          : "border-transparent text-slate-400 hover:text-white"
                      }`}
                    >
                      <Cpu size={14} />
                      Performance Bottlenecks ({diagnosisModalProject.codeAnalysis.performanceBottlenecks?.length || 0})
                    </button>

                    <button
                      onClick={() => setActiveDiagnosisTab("recommendations")}
                      className={`pb-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition ${
                        activeDiagnosisTab === "recommendations"
                          ? "border-purple-500 text-purple-400"
                          : "border-transparent text-slate-400 hover:text-white"
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      Strategic Recommendations ({diagnosisModalProject.codeAnalysis.recommendations?.length || 0})
                    </button>
                  </div>

                  {/* Tab Content: Issues */}
                  {activeDiagnosisTab === "issues" && (
                    <div className="space-y-3">
                      {(!diagnosisModalProject.codeAnalysis.issues ||
                        diagnosisModalProject.codeAnalysis.issues.length === 0) ? (
                        <div className="text-center p-8 bg-[#241738] rounded-xl text-slate-400 text-xs">
                          <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-1" />
                          No critical code issues or vulnerabilities detected!
                        </div>
                      ) : (
                        diagnosisModalProject.codeAnalysis.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className="bg-[#241738] border border-[#302345] rounded-xl p-4 space-y-2 hover:border-slate-700 transition"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    issue.severity === "critical"
                                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                      : issue.severity === "high"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                  }`}
                                >
                                  {issue.severity || "medium"}
                                </span>
                                <h3 className="text-sm font-semibold text-white">{issue.title}</h3>
                              </div>

                              {issue.file && (
                                <span className="font-mono text-[11px] text-purple-300 bg-[#1E1531] px-2 py-0.5 rounded border border-[#302345]">
                                  {issue.file} {issue.line ? `:${issue.line}` : ""}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">{issue.description}</p>

                            {issue.suggestedFix && (
                              <div className="bg-[#1E1531] p-2.5 rounded-lg border border-purple-500/20 text-xs text-purple-200 mt-2">
                                <span className="font-semibold text-purple-400 block mb-0.5">Suggested Fix:</span>
                                {issue.suggestedFix}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab Content: Performance */}
                  {activeDiagnosisTab === "performance" && (
                    <div className="space-y-3">
                      {(!diagnosisModalProject.codeAnalysis.performanceBottlenecks ||
                        diagnosisModalProject.codeAnalysis.performanceBottlenecks.length === 0) ? (
                        <div className="text-center p-8 bg-[#241738] rounded-xl text-slate-400 text-xs">
                          <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-1" />
                          No major performance bottlenecks identified!
                        </div>
                      ) : (
                        diagnosisModalProject.codeAnalysis.performanceBottlenecks.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-[#241738] border border-[#302345] rounded-xl p-4 space-y-2 hover:border-slate-700 transition"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    item.impact === "high"
                                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  }`}
                                >
                                  {item.impact || "medium"} impact
                                </span>
                                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                              </div>

                              {item.file && (
                                <span className="font-mono text-[11px] text-sky-300 bg-[#1E1531] px-2 py-0.5 rounded border border-[#302345]">
                                  {item.file}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>

                            {item.optimizationTip && (
                              <div className="bg-[#1E1531] p-2.5 rounded-lg border border-sky-500/20 text-xs text-sky-200 mt-2">
                                <span className="font-semibold text-sky-400 block mb-0.5">Optimization Tip:</span>
                                {item.optimizationTip}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab Content: Recommendations */}
                  {activeDiagnosisTab === "recommendations" && (
                    <div className="space-y-2.5">
                      {diagnosisModalProject.codeAnalysis.recommendations?.map((rec, idx) => (
                        <div
                          key={idx}
                          className="bg-[#241738] border border-[#302345] rounded-xl p-3.5 flex items-start gap-3"
                        >
                          <div className="bg-purple-600/20 text-purple-400 p-1.5 rounded-lg mt-0.5">
                            <CheckCircle2 size={16} />
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed">{rec}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center p-12 text-slate-400">
                  <RefreshCw className="animate-spin text-purple-400 mx-auto mb-2" size={24} />
                  <p className="text-sm font-semibold text-white">Running Gemini AI Codebase Diagnosis...</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Inspecting architecture, potential vulnerabilities, and performance bottlenecks.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#302345] bg-[#241738]/50 flex justify-end">
              <button
                onClick={() => setDiagnosisModalProject(null)}
                className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-lg text-xs font-semibold transition"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
