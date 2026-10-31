const mongoose = require('mongoose');

/**
 * Event Model — README Section 7
 *
 * Represents a single step/operation inside a run execution.
 * SDK calls POST /api/events to record each step.
 *
 * Indexes:
 *   - eventId                              (unique) — enforced by `unique: true`
 *     Prevents duplicate events (Demo Scenario C). Catch E11000 in controller.
 *   - { projectId, runId, timestamp }      (compound) — fast timeline retrieval
 *     Supports: GET /api/runs/:runId/events  (sorted chronologically)
 *
 * Validation:
 *   - eventId, projectId, runId, type, status are REQUIRED (README Section 7)
 *   - payload is kept as Mixed/flexible (different event types carry different details)
 */
const EventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: [true, 'eventId is required'],
      unique: true,
      trim: true,
      minlength: [3, 'eventId must be at least 3 characters'],
      maxlength: [100, 'eventId must be at most 100 characters'],
    },
    projectId: {
      type: String,
      required: [true, 'projectId is required'],
      trim: true,
    },
    runId: {
      type: String,
      required: [true, 'runId is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'type is required'],
      trim: true,
      maxlength: [100, 'type must be at most 100 characters'],
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: {
        values: ['success', 'failed', 'info', 'warning', 'started', 'completed'],
        message: "status must be one of: success, failed, info, warning, started, completed",
      },
      default: 'info',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    durationMs: {
      type: Number,
      default: 0,
      min: [0, 'durationMs cannot be negative'],
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound query index — README Section 7
// Supports: GET /api/runs/:runId/events  (chronological event timeline)
// Note: eventId unique index is auto-created by `unique: true` above
EventSchema.index({ projectId: 1, runId: 1, timestamp: 1 });

EventSchema.set('toJSON', { virtuals: true });
EventSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Event', EventSchema);
