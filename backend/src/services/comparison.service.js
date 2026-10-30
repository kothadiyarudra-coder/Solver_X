const Run = require('../models/Run');
const Event = require('../models/Event');

/**
 * Compare two runs (e.g. baseline successful run vs target failed run)
 * Analyzes event sequences, timing differences, status divergences, and failure points.
 */
async function compareRuns(runId1, runId2) {
  const [run1, run2] = await Promise.all([
    Run.findOne({ runId: runId1 }).lean(),
    Run.findOne({ runId: runId2 }).lean(),
  ]);

  if (!run1 || !run2) {
    const missing = [];
    if (!run1) missing.push(runId1);
    if (!run2) missing.push(runId2);
    throw {
      statusCode: 404,
      code: 'RUN_NOT_FOUND',
      message: `The following run(s) could not be found: ${missing.join(', ')}`,
    };
  }

  const [events1, events2] = await Promise.all([
    Event.find({ runId: runId1 }).sort({ timestamp: 1 }).lean(),
    Event.find({ runId: runId2 }).sort({ timestamp: 1 }).lean(),
  ]);

  // Comparison metrics
  const durationDiffMs = (run2.durationMs || 0) - (run1.durationMs || 0);
  const eventCountDiff = events2.length - events1.length;

  // Identify first failed event in each run
  const firstFailureRun1 = events1.find((e) => e.status === 'failed') || null;
  const firstFailureRun2 = events2.find((e) => e.status === 'failed') || null;

  // Compare event sequences side by side
  const maxEvents = Math.max(events1.length, events2.length);
  const sequenceComparison = [];
  let firstDivergenceStep = null;

  for (let i = 0; i < maxEvents; i++) {
    const e1 = events1[i] || null;
    const e2 = events2[i] || null;

    let match = false;
    let difference = 'Different event sequence';

    if (e1 && e2) {
      if (e1.type === e2.type && e1.status === e2.status) {
        match = true;
        difference = 'Identical event type and status';
      } else if (e1.type === e2.type) {
        difference = `Status diverged: '${e1.status}' vs '${e2.status}'`;
        if (!firstDivergenceStep) firstDivergenceStep = i + 1;
      } else {
        difference = `Different step types: '${e1.type}' vs '${e2.type}'`;
        if (!firstDivergenceStep) firstDivergenceStep = i + 1;
      }
    } else if (e1 && !e2) {
      difference = `Step present in ${runId1} but omitted/halted in ${runId2}`;
      if (!firstDivergenceStep) firstDivergenceStep = i + 1;
    } else if (!e1 && e2) {
      difference = `Extra step present in ${runId2} but not in ${runId1}`;
      if (!firstDivergenceStep) firstDivergenceStep = i + 1;
    }

    sequenceComparison.push({
      stepIndex: i + 1,
      run1Event: e1 ? {
        eventId: e1.eventId,
        type: e1.type,
        status: e1.status,
        durationMs: e1.durationMs,
        payloadSummary: summarizePayload(e1.payload),
      } : null,
      run2Event: e2 ? {
        eventId: e2.eventId,
        type: e2.type,
        status: e2.status,
        durationMs: e2.durationMs,
        payloadSummary: summarizePayload(e2.payload),
      } : null,
      match,
      difference,
    });
  }

  return {
    run1: {
      runId: run1.runId,
      projectId: run1.projectId,
      name: run1.name,
      status: run1.status,
      durationMs: run1.durationMs,
      totalEvents: events1.length,
      firstFailure: firstFailureRun1 ? {
        eventId: firstFailureRun1.eventId,
        type: firstFailureRun1.type,
        message: firstFailureRun1.payload?.message || null,
      } : null,
    },
    run2: {
      runId: run2.runId,
      projectId: run2.projectId,
      name: run2.name,
      status: run2.status,
      durationMs: run2.durationMs,
      totalEvents: events2.length,
      firstFailure: firstFailureRun2 ? {
        eventId: firstFailureRun2.eventId,
        type: firstFailureRun2.type,
        message: firstFailureRun2.payload?.message || null,
      } : null,
    },
    summary: {
      durationDifferenceMs: durationDiffMs,
      eventCountDifference: eventCountDiff,
      hasFailureDivergence: run1.status !== run2.status,
      firstDivergenceStep,
    },
    sequenceComparison,
  };
}

/**
 * Helper to produce a 1-line summary of payload for quick diffs
 */
function summarizePayload(payload) {
  if (!payload || typeof payload !== 'object') return {};
  const summary = {};
  if (payload.message) summary.message = payload.message;
  if (payload.operation) summary.operation = payload.operation;
  if (payload.endpoint) summary.endpoint = payload.endpoint;
  if (payload.model) summary.model = payload.model;
  return Object.keys(summary).length > 0 ? summary : payload;
}

module.exports = {
  compareRuns,
};
