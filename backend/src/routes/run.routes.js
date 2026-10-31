const express = require('express');
const router = express.Router();
const runController = require('../controllers/run.controller');
const eventController = require('../controllers/event.controller');

// Run endpoints
router.post('/', runController.createRun);
router.get('/', runController.getAllRuns);
router.patch('/:runId', runController.updateRun);
router.get('/:runId', runController.getRun);
router.get('/:runId/events', eventController.getRunEvents);

module.exports = router;

