import React, { useState, useEffect } from "react";
import { Folder, Plus, Trash2, RefreshCw, Layers, Inbox } from "lucide-react";
import { api } from "../services/api";
import { socket } from "../services/socket";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

    socket.on('project_created', onProjectChange);
    socket.on('project_deleted', onProjectChange);

    return () => {
      socket.off('project_created', onProjectChange);
      socket.off('project_deleted', onProjectChange);
    };
  }, []);

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
      });
      if (created) {
        setProjects((prev) => [created, ...prev.filter(p => (p.projectId || p._id) !== slug)]);
        setName("");
        setProjectId("");
        setDescription("");
        setShowForm(false);
      }
    } catch (err) {
      console.error("[Projects] Create failed:", err);
      alert("Failed to create project. Please verify backend is running.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProject = async (idToDelete) => {
    if (!confirm(`Are you sure you want to delete project '${idToDelete}'?`)) return;
    try {
      await api.deleteProject(idToDelete);
      setProjects((prev) => prev.filter((p) => (p.projectId || p._id) !== idToDelete));
    } catch (err) {
      console.error("[Projects] Delete failed:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Folder className="text-purple-400" />
            Projects
          </h1>
          <p className="text-slate-400 mt-1">
            Manage projects and tracked environments in MongoDB.
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
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={addProject}
          className="bg-[#1E1531] border border-[#302345] rounded-xl p-5 mb-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-white">Create New Project</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Project Name (e.g. AI Workflow Service)"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!projectId) {
                  setProjectId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                }
              }}
              className="w-full bg-[#241738] border border-[#302345] text-white p-3 rounded-lg outline-none focus:border-purple-500 text-sm"
              required
            />

            <input
              type="text"
              placeholder="Project Identifier (e.g. ai-workflow-service)"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-[#241738] border border-[#302345] text-white p-3 rounded-lg outline-none focus:border-purple-500 text-sm font-mono"
              required
            />
          </div>

          <textarea
            placeholder="Project Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#241738] border border-[#302345] text-white p-3 rounded-lg outline-none focus:border-purple-500 text-sm"
            rows={2}
          />

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Create Project"}
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
            Click "New Project" to register your first workspace in MongoDB.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((project) => {
            const pid = project.projectId || project._id;
            return (
              <div
                key={pid}
                className="bg-[#1E1531] border border-[#302345] rounded-xl p-5 hover:border-purple-500/40 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20 text-purple-400">
                      <Folder size={20} />
                    </div>

                    <div>
                      <h2 className="text-white font-semibold text-base">
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

                <p className="text-slate-400 text-xs mt-3 min-h-[32px]">
                  {project.description || "No description provided."}
                </p>

                <div className="flex justify-between items-center mt-5 pt-3 border-t border-[#302345] text-xs">
                  <span className="text-slate-500">
                    Created: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "Active"}
                  </span>

                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Tracked
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
