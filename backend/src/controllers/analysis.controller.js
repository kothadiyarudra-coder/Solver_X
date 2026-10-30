const { compareRuns } = require('../services/comparison.service');
const { getProjectAnalytics } = require('../services/analytics.service');
const { generateDiagnosis } = require('../services/gemini.service');

/**
 * Compare two runs
 * GET /api/compare/:runId1/:runId2
 */
const compare = async (req, res, next) => {
  try {
    const { runId1, runId2 } = req.params;
    const comparison = await compareRuns(runId1, runId2);

    return res.json({
      success: true,
      data: comparison,
      message: 'Run comparison generated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get aggregated analytics for a project
 * GET /api/projects/:projectId/analytics
 */
const getAnalytics = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const analytics = await getProjectAnalytics(projectId === 'all' ? null : projectId);

    return res.json({
      success: true,
      data: analytics,
      message: 'Project analytics retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate AI-based failure diagnosis for a run
 * POST /api/diagnosis/:runId
 */
const diagnose = async (req, res, next) => {
  try {
    const { runId } = req.params;
    const diagnosis = await generateDiagnosis(runId);

    return res.json({
      success: true,
      data: diagnosis,
      message: 'AI diagnosis generated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  compare,
  getAnalytics,
  diagnose,
};

