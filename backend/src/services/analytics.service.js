const Run = require('../models/Run');
const Event = require('../models/Event');

/**
 * MongoDB Aggregation pipeline for project analytics
 * Returns: total runs, success rate, average duration, failure count by event type, and recent activity.
 */
async function getProjectAnalytics(projectId) {
  const matchFilter = projectId ? { projectId } : {};

  // Aggregation for Run metrics
  const runStats = await Run.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalRuns: { $sum: 1 },
        successfulRuns: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
        },
        failedRuns: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
        },
        runningRuns: {
          $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] },
        },
        avgDurationMs: { $avg: '$durationMs' },
      },
    },
  ]);

  const metrics = runStats[0] || {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    runningRuns: 0,
    avgDurationMs: 0,
  };

  const successRate = metrics.totalRuns > 0
    ? Number(((metrics.successfulRuns / metrics.totalRuns) * 100).toFixed(1))
    : 0;

  // Aggregation for Failure Count by Event Type
  const failureByType = await Event.aggregate([
    {
      $match: {
        ...matchFilter,
        status: 'failed',
      },
    },
    {
      $group: {
        _id: '$type',
        failureCount: { $sum: 1 },
      },
    },
    { $sort: { failureCount: -1 } },
  ]);

  // Recent 10 runs activity
  const recentRuns = await Run.find(matchFilter)
    .sort({ startedAt: -1 })
    .limit(10)
    .lean();

  return {
    projectId: projectId || 'all',
    totalRuns: metrics.totalRuns,
    successfulRuns: metrics.successfulRuns,
    failedRuns: metrics.failedRuns,
    runningRuns: metrics.runningRuns,
    successRate,
    avgDurationMs: Math.round(metrics.avgDurationMs || 0),
    failuresByEventType: failureByType.map((f) => ({
      eventType: f._id,
      count: f.failureCount,
    })),
    recentRuns,
  };
}

module.exports = {
  getProjectAnalytics,
};

