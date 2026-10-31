import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { socket } from "../services/socket";

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProjectState] = useState(() => {
    return localStorage.getItem("devtrace_selected_project") || "all";
  });
  const [loadingProjects, setLoadingProjects] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.getProjects();
      setProjects(data || []);
    } catch (err) {
      console.warn("[ProjectContext] Failed to load projects:", err.message);
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const setSelectedProject = (id) => {
    setSelectedProjectState(id);
    localStorage.setItem("devtrace_selected_project", id);
  };

  useEffect(() => {
    loadProjects();

    const onProjectCreated = (newProj) => {
      setProjects((prev) => [newProj, ...prev.filter((p) => (p.projectId || p._id) !== (newProj.projectId || newProj._id))]);
    };

    const onProjectDeleted = (delId) => {
      setProjects((prev) => prev.filter((p) => (p.projectId || p._id) !== delId));
      if (selectedProject === delId) {
        setSelectedProject("all");
      }
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
    };

    socket.on("project_created", onProjectCreated);
    socket.on("project_deleted", onProjectDeleted);
    socket.on("code_analyzed", onCodeAnalyzed);

    return () => {
      socket.off("project_created", onProjectCreated);
      socket.off("project_deleted", onProjectDeleted);
      socket.off("code_analyzed", onCodeAnalyzed);
    };
  }, [selectedProject, loadProjects]);

  const selectedProjectObj = projects.find(
    (p) => (p.projectId || p._id) === selectedProject
  ) || null;

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        setSelectedProject,
        selectedProjectObj,
        loadingProjects,
        refreshProjects: loadProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}

export default ProjectContext;
