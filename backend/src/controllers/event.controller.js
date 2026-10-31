const Event = require('../models/Event');
const Run = require('../models/Run');

/**
 * Ingest a single event
 * POST /api/events
 *
 * Body: { eventId, projectId, runId, type, status, timestamp?, durationMs?, payload? }
 * Response: 201 Created | 400 Validation | 409 Duplicate
 */
const createEvent = async (req, res, next) => {
  try {
    const { eventId, projectId, runId, type, status, timestamp, durationMs, payload } = req.body;

    // ---------- Required field validation (Demo Scenario D) ----------
    const missing = [];
    if (!eventId || !String(eventId).trim()) missing.push('eventId');
    if (!runId || !String(runId).trim()) missing.push('runId');
    if (!projectId || !String(projectId).trim()) missing.push('projectId');
    if (!type || !String(type).trim()) missing.push('type');
    if (!status || !String(status).trim()) missing.push('status');

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`,
        },
      });
    }

    // ---------- Validate status enum ----------
    const validStatuses = ['success', 'failed', 'info', 'warning', 'started', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`,
        },
      });
    }

    // ---------- Duplicate check (Demo Scenario C — clean 409 response) ----------
    const existing = await Event.findOne({ eventId: eventId.trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_EVENT_ID',
          message: `Event '${eventId}' already exists in run '${existing.runId}'. Duplicate ignored.`,
        },
      });
    }

    // ---------- Validate durationMs ----------
    const safeDuration = Number(durationMs);
    if (durationMs !== undefined && (isNaN(safeDuration) || safeDuration < 0)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'durationMs must be a non-negative number',
        },
      });
    }

    // ---------- Create event ----------
    const event = await Event.create({
      eventId: eventId.trim(),
      projectId: projectId.trim(),
      runId: runId.trim(),
      type: type.trim(),
      status,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      durationMs: safeDuration || 0,
      payload: payload || {},
    });

    // ---------- Update run statistics atomically ----------
    const updateOps = { $inc: { totalEvents: 1 } };
    if (status === 'failed') {
      updateOps.$inc.errorCount = 1;
      // Auto-mark run as failed if any event fails
      updateOps.$set = { status: 'failed' };
    }
    await Run.updateOne({ runId: runId.trim() }, updateOps);

    // ---------- Socket.IO live update ----------
    const io = req.app.get('io');
    if (io) {
      io.emit('new_event', event);
      io.emit(`event_${runId}`, event);
    }

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
 *
 * Body: { events: [ ...eventObjects ] }
 * Response: 201 Created (partial success allowed — duplicates reported)
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

    // Cap batch size to prevent abuse
    if (events.length > 500) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Batch size cannot exceed 500 events',
        },
      });
    }

    const inserted = [];
    const duplicates = [];
    const errors = [];

    for (const ev of events) {
      try {
        // Quick required-field check per event
        if (!ev.eventId || !ev.runId || !ev.projectId || !ev.type || !ev.status) {
          errors.push({ eventId: ev.eventId || 'unknown', reason: 'Missing required fields' });
          continue;
        }
        const doc = await Event.create({
          ...ev,
          timestamp: ev.timestamp ? new Date(ev.timestamp) : new Date(),
          durationMs: Number(ev.durationMs) || 0,
          payload: ev.payload || {},
        });
        inserted.push(doc);

        // Update run counters
        const updateOps = { $inc: { totalEvents: 1 } };
        if (ev.status === 'failed') {
          updateOps.$inc.errorCount = 1;
          updateOps.$set = { status: 'failed' };
        }
        await Run.updateOne({ runId: ev.runId }, updateOps);
      } catch (err) {
        if (err.code === 11000) {
          duplicates.push(ev.eventId);
        } else {
          errors.push({ eventId: ev.eventId || 'unknown', reason: err.message });
        }
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        insertedCount: inserted.length,
        duplicateCount: duplicates.length,
        errorCount: errors.length,
        duplicates,
        errors,
      },
      message: `Batch processed: ${inserted.length} inserted, ${duplicates.length} duplicates, ${errors.length} errors`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get event timeline for a run
 * GET /api/runs/:runId/events
 *
 * Response: 200 OK (sorted chronologically by timestamp)
 */
const getRunEvents = async (req, res, next) => {
  try {
    const { runId } = req.params;
    const events = await Event.find({ runId }).sort({ timestamp: 1 });

    return res.json({
      success: true,
      data: events,
      message: `${events.length} event(s) retrieved for run '${runId}'`,
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
