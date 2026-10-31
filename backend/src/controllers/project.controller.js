const Project = require('../models/Project');
const { analyzeCodebase } = require('../services/gemini.service');

/**
 * Create a new Project
 * POST /api/projects
 *
 * Body: { projectId, name, description?, sourceType?, sourcePath?, softwareUrl?, codeFiles?, autoAnalyze? }
 * Response: 201 Created
 */
const createProject = async (req, res, next) => {
  try {
    const {
      projectId,
      name,
      description,
      sourceType = 'telemetry',
      sourcePath = '',
      softwareUrl = '',
      codeFiles = [],
      autoAnalyze = false,
    } = req.body;

    // ---------- Manual pre-validation (clear error before hitting DB) ----------
    const missing = [];
    if (!projectId || !projectId.trim()) missing.push('projectId');
    if (!name || !name.trim()) missing.push('name');

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} required`,
        },
      });
    }

    // ---------- Check for existing project (friendly 409 instead of raw E11000) ----------
    const existing = await Project.findOne({ projectId: projectId.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_PROJECT',
          message: `Project '${projectId}' already exists. Use a different projectId.`,
        },
      });
    }

    const project = await Project.create({
      projectId: projectId.trim(),
      name: name.trim(),
      description: description?.trim() || '',
      sourceType,
      sourcePath: sourcePath?.trim() || '',
      softwareUrl: softwareUrl?.trim() || '',
      codeFiles: Array.isArray(codeFiles) ? codeFiles.slice(0, 50) : [],
    });

    // Auto-analyze with Gemini AI on creation:
    // Analyzes the whole folder/URL/input, checks existing DB errors, and syncs any new errors into MongoDB
    let initialAnalysis = null;
    if (sourcePath || softwareUrl || (codeFiles && codeFiles.length > 0) || autoAnalyze) {
      try {
        initialAnalysis = await analyzeCodebase(project.projectId, { files: codeFiles, localPath: sourcePath });
        project.codeAnalysis = initialAnalysis;
      } catch (err) {
        console.warn('[Auto-Analyze Error on Project Creation]:', err.message);
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('project_created', project);
      if (initialAnalysis) {
        io.emit('code_analyzed', { projectId: project.projectId, analysis: initialAnalysis });
      }
    }

    return res.status(201).json({
      success: true,
      data: project,
      analysis: initialAnalysis,
      message: 'Project created and codebase audited successfully with Gemini AI',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all projects
 * GET /api/projects
 *
 * Response: 200 OK
 */
const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: projects,
      message: `${projects.length} project(s) retrieved`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single project by projectId
 * GET /api/projects/:projectId  (when projectId doesn't match 'runs' or 'analytics' sub-routes)
 */
const getProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({ projectId });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project '${projectId}' not found.`,
        },
      });
    }

    return res.json({
      success: true,
      data: project,
      message: 'Project retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a project and its associated runs/events
 * DELETE /api/projects/:projectId
 */
const deleteProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const Run = require('../models/Run');
    const Event = require('../models/Event');

    await Project.deleteOne({ $or: [{ projectId }, { _id: projectId.match(/^[0-9a-fA-F]{24}$/) ? projectId : null }] });
    await Run.deleteMany({ projectId });
    await Event.deleteMany({ projectId });

    const io = req.app.get('io');
    if (io) io.emit('project_deleted', projectId);

    return res.json({
      success: true,
      message: `Project '${projectId}' and associated runs/events deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger AI Codebase Diagnosis & Performance / Issue audit
 * POST /api/projects/:projectId/analyze
 */
const analyzeProjectCode = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { files, localPath } = req.body;

    const analysis = await analyzeCodebase(projectId, { files, localPath });

    const io = req.app.get('io');
    if (io) {
      io.emit('code_analyzed', { projectId, analysis });
      if (analysis.auditRun) {
        io.emit('run_created', analysis.auditRun);
      }
    }

    return res.json({
      success: true,
      data: analysis,
      run: analysis.auditRun,
      message: 'Codebase diagnosis and performance audit completed',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get cached AI Codebase Diagnosis
 * GET /api/projects/:projectId/analysis
 */
const getProjectCodeAnalysis = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findOne({ projectId });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project '${projectId}' not found.`,
        },
      });
    }

    return res.json({
      success: true,
      data: project.codeAnalysis || null,
      message: project.codeAnalysis ? 'Analysis retrieved' : 'No analysis available yet for this project',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  deleteProject,
  analyzeProjectCode,
  getProjectCodeAnalysis,
};
