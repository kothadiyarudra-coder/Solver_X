const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');

// Event endpoints
router.post('/', eventController.createEvent);
router.post('/batch', eventController.createBatchEvents);

module.exports = router;

