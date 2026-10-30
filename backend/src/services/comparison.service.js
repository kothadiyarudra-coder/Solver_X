const Run = require('../models/Run');
const Event = require('../models/Event');

/**
 * Compare two runs (e.g. one successful run and one failed run)
 * Analyzes event sequences, timing differences, payload changes, and failure point.
 */
async function compareRuns(runId1, runId2) {
  const [run1, run2] = await Promise.all([
    Run.findOne({ runId: runId1 }).lean(),
    Run.findOne({ runId: runId2 }).lean(),
  ]);

  if (!run1 || !run2) {
    throw {
      statusCode: 404,
      code: 'RUN_NOT_FOUND',
      message: `One or both runs (${runId1}, ${runId2}) could not be found.`,
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
      } else {
        difference = `Different types: '${e1.type}' vs '${e2.type}'`;
      }
    } else if (e1 && !e2) {
      difference = `Step present in ${runId1} but missing in ${runId2}`;
    } else if (!e1 && e2) {
      difference = `Step present in ${runId2} but missing in ${runId1}`;
    }

    sequenceComparison.push({
      stepIndex: i + 1,
      run1Event: e1 ? { eventId: e1.eventId, type: e1.type, status: e1.status, durationMs: e1.durationMs } : null,
      run2Event: e2 ? { eventId: e2.eventId, type: e2.type, status: e2.status, durationMs: e2.durationMs } : null,
      match,
      difference,
    });
  }

  return {
    run1: {
      runId: run1.runId,
      name: run1.name,
      status: run1.status,
      durationMs: run1.durationMs,
      totalEvents: events1.length,
      firstFailure: firstFailureRun1,
    },
    run2: {
      runId: run2.runId,
      name: run2.name,
      status: run2.status,
      durationMs: run2.durationMs,
      totalEvents: events2.length,
      firstFailure: firstFailureRun2,
    },
    summary: {
      durationDifferenceMs: durationDiffMs,
      eventCountDifference: eventCountDiff,
      hasFailureDivergence: run1.status !== run2.status,
    },
    sequenceComparison,
  };
}

module.exports = {
  compareRuns,
};

