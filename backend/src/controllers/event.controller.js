const Event = require('../models/Event');
const Run = require('../models/Run');

/**
 * Ingest a single event
 * POST /api/events
 */
const createEvent = async (req, res, next) => {
  try {
    const { eventId, projectId, runId, type, status, timestamp, durationMs, payload } = req.body;

    // Required field validation as per Demo Scenario D and Section 6
    if (!eventId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'eventId is required',
        },
      });
    }

    if (!runId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'runId is required',
        },
      });
    }

    if (!projectId || !type || !status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'projectId, type, and status are required fields',
        },
      });
    }

    // Check duplicate eventId manually to return immediate clean error (Demo Scenario C)
    const existing = await Event.findOne({ eventId });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_EVENT_ID',
          message: `Event with eventId '${eventId}' already exists in run '${existing.runId}'. Duplicate ignored.`,
        },
      });
    }

    const event = await Event.create({
      eventId,
      projectId,
      runId,
      type,
      status,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      durationMs: durationMs || 0,
      payload: payload || {},
    });

    // Increment run statistics
    const updateOps = { $inc: { totalEvents: 1 } };
    if (status === 'failed') {
      updateOps.$inc.errorCount = 1;
      updateOps.$set = { status: 'failed' };
    }
    await Run.updateOne({ runId }, updateOps);

    // Socket.io live update
    const io = req.app.get('io');
    if (io) io.emit(`event_${runId}`, event);

    return res.status(201).json({
      success: true,
      data: event,
      message: 'Event recorded successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Ingest multiple events in batch
 * POST /api/events/batch
 */
const createBatchEvents = async (req, res, next) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'events array is required and must not be empty',
        },
      });
    }

    const inserted = [];
    const duplicates = [];

    for (const ev of events) {
      try {
        const doc = await Event.create(ev);
        inserted.push(doc);
      } catch (err) {
        if (err.code === 11000) {
          duplicates.push(ev.eventId);
        } else {
          throw err;
        }
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        insertedCount: inserted.length,
        duplicateCount: duplicates.length,
        duplicates,
      },
      message: 'Batch events processed',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get event timeline for a run
 * GET /api/runs/:runId/events
 */
const getRunEvents = async (req, res, next) => {
  try {
    const { runId } = req.params;
    const events = await Event.find({ runId }).sort({ timestamp: 1 });

    return res.json({
      success: true,
      data: events,
      message: 'Event timeline retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all events with filters
 * GET /api/events
 */
const getEvents = async (req, res, next) => {
  try {
    const { projectId, runId, status, type, limit = 100, skip = 0 } = req.query;
    const filter = {};
    if (projectId && projectId !== 'all') filter.projectId = projectId;
    if (runId) filter.runId = runId;
    if (status && status !== 'all') filter.status = status;
    if (type && type !== 'all') filter.type = type;

    const events = await Event.find(filter)
      .sort({ timestamp: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Event.countDocuments(filter);

    return res.json({
      success: true,
      data: { events, total },
      message: 'Events retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Aggregated error events for Discover & Issues pages
 * GET /api/events/errors
 */
const getErrorEvents = async (req, res, next) => {
  try {
    const { projectId, limit = 50 } = req.query;
    const match = { status: 'failed' };
    if (projectId && projectId !== 'all') match.projectId = projectId;

    const errorAgg = await Event.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $ifNull: [
              '$payload.errorName',
              {
                $ifNull: [
                  '$payload.message',
                  { $concat: ['Error in ', '$type'] }
                ]
              }
            ]
          },
          count: { $sum: 1 },
          lastSeen: { $max: '$timestamp' },
          firstSeen: { $min: '$timestamp' },
          uniqueRuns: { $addToSet: '$runId' },
          sampleEvent: { $first: '$$ROOT' },
          types: { $addToSet: '$type' },
          projectId: { $first: '$projectId' },
        }
      },
      {
        $project: {
          title: '$_id',
          count: 1,
          lastSeen: 1,
          firstSeen: 1,
          uniqueUsers: { $size: '$uniqueRuns' },
          sampleEvent: 1,
          types: 1,
          projectId: 1,
        }
      },
      { $sort: { count: -1 } },
      { $limit: Number(limit) }
    ]);

    const totalErrors = await Event.countDocuments(match);

    return res.json({
      success: true,
      data: {
        errors: errorAgg,
        totalErrors,
      },
      message: 'Error events aggregated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Latency percentiles and operation breakdown
 * GET /api/events/performance
 */
const getPerformanceStats = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const match = {};
    if (projectId && projectId !== 'all') match.projectId = projectId;

    const durations = await Event.find(match, { durationMs: 1, type: 1, status: 1, 'payload.endpoint': 1, 'payload.operation': 1, runId: 1, projectId: 1 })
      .sort({ durationMs: 1 })
      .lean();

    const count = durations.length;
    let p50 = 0, p75 = 0, p95 = 0, avg = 0;

    if (count > 0) {
      const sum = durations.reduce((acc, cur) => acc + (cur.durationMs || 0), 0);
      avg = Math.round(sum / count);
      p50 = durations[Math.floor(count * 0.5)]?.durationMs || 0;
      p75 = durations[Math.floor(count * 0.75)]?.durationMs || 0;
      p95 = durations[Math.floor(count * 0.95)]?.durationMs || 0;
    }

    const operationAgg = await Event.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            type: '$type',
            name: {
              $ifNull: [
                '$payload.endpoint',
                {
                  $ifNull: [
                    '$payload.operation',
                    '$type'
                  ]
                }
              ]
            }
          },
          count: { $sum: 1 },
          avgDuration: { $avg: '$durationMs' },
          maxDuration: { $max: '$durationMs' },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          projectId: { $first: '$projectId' },
          sampleRunId: { $first: '$runId' }
        }
      },
      { $sort: { avgDuration: -1 } }
    ]);

    return res.json({
      success: true,
      data: {
        summary: { p50, p75, p95, avg, totalEvents: count },
        transactions: operationAgg.map(op => ({
          name: op._id.name || op._id.type,
          type: op._id.type,
          count: op.count,
          avgDuration: Math.round(op.avgDuration || 0),
          maxDuration: op.maxDuration || 0,
          failureRate: op.count > 0 ? ((op.failedCount / op.count) * 100).toFixed(1) + '%' : '0.0%',
          projectId: op.projectId,
          runId: op.sampleRunId,
        }))
      },
      message: 'Performance metrics calculated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Event timeseries bucketed for stacked charts
 * GET /api/events/timeseries
 */
const getEventTimeseries = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const match = {};
    if (projectId && projectId !== 'all') match.projectId = projectId;

    const timeseries = await Event.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            hour: { $dateToString: { format: '%H:00', date: '$timestamp' } },
            type: '$type',
          },
          count: { $sum: 1 },
          errors: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.hour': 1 } }
    ]);

    return res.json({
      success: true,
      data: timeseries,
      message: 'Event timeseries generated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEvent,
  createBatchEvents,
  getRunEvents,
  getEvents,
  getErrorEvents,
  getPerformanceStats,
  getEventTimeseries,
};

