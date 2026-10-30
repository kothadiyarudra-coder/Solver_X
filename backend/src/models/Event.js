const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: [true, 'eventId is required'],
      unique: true,
      trim: true,
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
    },
    status: {
      type: String,
      required: [true, 'status is required'],
      enum: ['success', 'failed', 'info', 'warning', 'started', 'completed'],
      default: 'info',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    durationMs: {
      type: Number,
      default: 0,
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

// Indexes specified in README.md Section 7
EventSchema.index({ eventId: 1 }, { unique: true });
EventSchema.index({ projectId: 1, runId: 1, timestamp: 1 });

module.exports = mongoose.model('Event', EventSchema);

