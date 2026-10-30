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

module.exports = {
  createEvent,
  createBatchEvents,
  getRunEvents,
};

