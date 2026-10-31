const mongoose = require('mongoose');

/**
 * Project Model — README Section 7
 *
 * Represents a registered workspace/application that DevTrace monitors.
 * Each project has a human-readable projectId used across all runs and events.
 *
 * Indexes:
 *   - projectId  (unique)  — enforced by `unique: true` on the field
 */
const ProjectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: [true, 'projectId is required'],
      unique: true,
      trim: true,
      minlength: [2, 'projectId must be at least 2 characters'],
      maxlength: [100, 'projectId must be at most 100 characters'],
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [1, 'Project name must not be empty'],
      maxlength: [200, 'Project name must be at most 200 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [1000, 'Description must be at most 1000 characters'],
    },
  },
  {
    timestamps: true, // auto createdAt + updatedAt
  }
);

// Virtuals included when converting to JSON (for API responses)
ProjectSchema.set('toJSON', { virtuals: true });
ProjectSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Project', ProjectSchema);
