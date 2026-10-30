const Project = require('../models/Project');

/**
 * Create a new Project
 * POST /api/projects
 */
const createProject = async (req, res, next) => {
  try {
    const { projectId, name, description } = req.body;

    if (!projectId || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'projectId and name are required',
        },
      });
    }

    const project = await Project.create({ projectId, name, description });
    return res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all projects
 * GET /api/projects
 */
const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    return res.json({
      success: true,
      data: projects,
      message: 'Projects retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
};

