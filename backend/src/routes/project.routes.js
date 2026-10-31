const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const runController = require('../controllers/run.controller');
const analysisController = require('../controllers/analysis.controller');

// Project endpoints
router.post('/', projectController.createProject);
router.get('/', projectController.getProjects);
router.delete('/:projectId', projectController.deleteProject);

// Project runs & analytics
router.get('/:projectId/runs', runController.getProjectRuns);
router.get('/:projectId/analytics', analysisController.getAnalytics);

module.exports = router;

