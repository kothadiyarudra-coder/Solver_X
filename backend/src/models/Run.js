const mongoose = require('mongoose');

/**
 * Run Model — README Section 7
 *
 * Represents a single execution lifecycle (start → events → end).
 * SDK calls POST /api/runs to create, PATCH /api/runs/:runId to finish.
 *
 * Indexes:
 *   - runId                      (unique) — enforced by `unique: true`
 *   - { projectId, startedAt }   (compound) — fast chronological listing per project
 */
const RunSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: [true, 'runId is required'],
      unique: true,
      trim: true,
      minlength: [3, 'runId must be at least 3 characters'],
      maxlength: [100, 'runId must be at most 100 characters'],
    },
    projectId: {
      type: String,
      required: [true, 'projectId is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Run name is required'],
      trim: true,
      maxlength: [200, 'Run name must be at most 200 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'running', 'success', 'failed'],
        message: "status must be one of: pending, running, success, failed",
      },
      default: 'running',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    durationMs: {
      type: Number,
      default: 0,
      min: [0, 'durationMs cannot be negative'],
    },
    totalEvents: {
      type: Number,
      default: 0,
      min: [0, 'totalEvents cannot be negative'],
    },
    errorCount: {
      type: Number,
      default: 0,
      min: [0, 'errorCount cannot be negative'],
    },
    diagnosis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound query index — README Section 7
// Supports: GET /api/projects/:projectId/runs  (sorted by most recent first)
RunSchema.index({ projectId: 1, startedAt: -1 });

RunSchema.set('toJSON', { virtuals: true });
RunSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Run', RunSchema);
