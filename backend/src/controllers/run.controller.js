const Run = require('../models/Run');
const Event = require('../models/Event');

/**
 * Start/Create a new run
 * POST /api/runs
 */
const createRun = async (req, res, next) => {
  try {
    const { projectId, runId, name } = req.body;

    if (!projectId || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'projectId and name are required',
        },
      });
    }

    const runIdentifier = runId || `run-${Date.now().toString(36)}`;

    const run = await Run.create({
      projectId,
      runId: runIdentifier,
      name,
      status: 'running',
      startedAt: new Date(),
    });

    // Notify connected clients via Socket.IO if available
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
          message: `Run with ID '${runId}' not found.`,
        },
      });
    }

    if (status) run.status = status;
    const completionTime = completedAt ? new Date(completedAt) : new Date();
    run.completedAt = completionTime;

    if (run.startedAt) {
      run.durationMs = completionTime.getTime() - new Date(run.startedAt).getTime();
    }

    // Refresh total events and error count
    const [totalEvents, errorCount] = await Promise.all([
      Event.countDocuments({ runId }),
      Event.countDocuments({ runId, status: 'failed' }),
    ]);

    run.totalEvents = totalEvents;
    run.errorCount = errorCount;

    await run.save();

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
          message: `Run with ID '${runId}' not found.`,
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
 */
const getProjectRuns = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, limit = 50, skip = 0 } = req.query;

    const query = { projectId };
    if (status) query.status = status;

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
      message: 'Project runs retrieved successfully',
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
};

