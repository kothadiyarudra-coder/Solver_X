const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');

// Event endpoints
router.post('/', eventController.createEvent);
router.post('/batch', eventController.createBatchEvents);
router.get('/', eventController.getEvents);
router.get('/errors', eventController.getErrorEvents);
router.get('/performance', eventController.getPerformanceStats);
router.get('/timeseries', eventController.getEventTimeseries);

module.exports = router;

