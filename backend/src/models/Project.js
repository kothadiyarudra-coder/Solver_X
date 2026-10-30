const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: [true, 'projectId is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Project', ProjectSchema);

