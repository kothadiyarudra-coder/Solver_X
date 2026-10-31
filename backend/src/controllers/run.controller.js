const Run = require('../models/Run');
const Event = require('../models/Event');

/**
 * Start/Create a new run
 * POST /api/runs
 *
 * Body: { projectId, name, runId? }
 * Response: 201 Created
 */
const createRun = async (req, res, next) => {
  try {
    const { projectId, runId, name } = req.body;

    // ---------- Validate required fields ----------
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

    // Auto-generate runId if not provided by SDK
    const runIdentifier = (runId && runId.trim()) || `run-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    // ---------- Check for duplicate runId ----------
    const existing = await Run.findOne({ runId: runIdentifier });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_RUN',
          message: `Run '${runIdentifier}' already exists.`,
        },
      });
    }

    const run = await Run.create({
      projectId: projectId.trim(),
      runId: runIdentifier,
      name: name.trim(),
      status: 'running',
      startedAt: new Date(),
    });

    // Notify connected dashboard clients via Socket.IO
    const io = req.app.get('io');
    if (io) io.emit('run_started', run);

    return res.status(201).json({
      success: true,
      data: run,
      message: 'Run initiated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update/Finish a run
 * PATCH /api/runs/:runId
 *
 * Body: { status, completedAt? }
 * Response: 200 OK
 */
const updateRun = async (req, res, next) => {
  try {
    const { runId } = req.params;
    const { status, completedAt } = req.body;

    const run = await Run.findOne({ runId });
    if (!run) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RUN_NOT_FOUND',
          message: `Run '${runId}' not found.`,
        },
      });
    }

    // ---------- Validate status enum if provided ----------
    if (status) {
      const validStatuses = ['pending', 'running', 'success', 'failed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`,
          },
        });
      }
      run.status = status;
    }

    // ---------- Calculate duration ----------
    const completionTime = completedAt ? new Date(completedAt) : new Date();
    run.completedAt = completionTime;

    if (run.startedAt) {
      run.durationMs = Math.max(0, completionTime.getTime() - new Date(run.startedAt).getTime());
    }

    // ---------- Refresh event counts from DB ----------
    const [totalEvents, errorCount] = await Promise.all([
      Event.countDocuments({ runId }),
      Event.countDocuments({ runId, status: 'failed' }),
    ]);

    run.totalEvents = totalEvents;
    run.errorCount = errorCount;

    await run.save();

    // Notify dashboard
    const io = req.app.get('io');
    if (io) io.emit('run_updated', run);

    return res.json({
      success: true,
      data: run,
      message: 'Run updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get details for a single run
 * GET /api/runs/:runId
 *
 * Response: 200 OK
 */
const getRun = async (req, res, next) => {
  try {
    const { runId } = req.params;
    const run = await Run.findOne({ runId });

    if (!run) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RUN_NOT_FOUND',
          message: `Run '${runId}' not found.`,
        },
      });
    }

    return res.json({
      success: true,
      data: run,
      message: 'Run retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List runs for a project
 * GET /api/projects/:projectId/runs
 *
 * Query: ?status=failed&limit=50&skip=0
 * Response: 200 OK
 */
const getProjectRuns = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, limit = 50, skip = 0 } = req.query;

    // Clamp limit and skip to safe integers
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const safeSkip = Math.max(Number(skip) || 0, 0);

    const query = { projectId };
    if (status) {
      const validStatuses = ['pending', 'running', 'success', 'failed'];
      if (validStatuses.includes(status)) {
        query.status = status;
      }
    }

    const [runs, total] = await Promise.all([
      Run.find(query).sort({ startedAt: -1 }).skip(safeSkip).limit(safeLimit),
      Run.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: {
        runs,
        total,
        limit: safeLimit,
        skip: safeSkip,
      },
      message: `${runs.length} run(s) retrieved for project '${projectId}'`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all runs across all projects or filtered
 * GET /api/runs
 */
const getAllRuns = async (req, res, next) => {
  try {
    const { projectId, status, limit = 50, skip = 0 } = req.query;

    const query = {};
    if (projectId && projectId !== 'all') query.projectId = projectId;
    if (status && status !== 'all') query.status = status;

    const runs = await Run.find(query)
      .sort({ startedAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Run.countDocuments(query);

    return res.json({
      success: true,
      data: {
        runs,
        total,
      },
      message: 'Runs retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRun,
  updateRun,
  getRun,
  getProjectRuns,
  getAllRuns,
};
