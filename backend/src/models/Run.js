const mongoose = require('mongoose');

const RunSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: [true, 'runId is required'],
      unique: true,
      trim: true,
    },
    projectId: {
      type: String,
      required: [true, 'projectId is required'],
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Run name is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'success', 'failed'],
      default: 'running',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    totalEvents: {
      type: Number,
      default: 0,
    },
    errorCount: {
      type: Number,
      default: 0,
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

// Query index as specified in README.md Section 7
RunSchema.index({ projectId: 1, startedAt: -1 });

module.exports = mongoose.model('Run', RunSchema);

