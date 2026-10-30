const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysis.controller');

// Analysis endpoints
router.get('/compare/:runId1/:runId2', analysisController.compare);
router.post('/diagnosis/:runId', analysisController.diagnose);

module.exports = router;

