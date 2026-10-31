/**
 * Part 3 Verification Script — Analysis & Comparison Engine Tests
 *
 * Tests:
 *   1. Project Analytics Aggregation (GET /api/projects/:projectId/analytics)
 *   2. Run Comparison Engine (GET /api/compare/:runId1/:runId2)
 *   3. AI / Evidence Diagnosis (POST /api/diagnosis/:runId)
 *
 * Usage: node backend/scripts/verify-analysis.js
 */

const http = require('http');

const BASE = process.env.API_BASE || 'http://localhost:5001/api';
const PROJECT_ID = `demo-part3-${Date.now()}`;
const SUCCESS_RUN = `run-success-${Date.now()}`;
const FAILED_RUN = `run-fail-${Date.now()}`;

let passed = 0;
let failed = 0;

function ok(label) {
  passed++;
  console.log(`  ✓ PASS: ${label}`);
}

function fail(label, detail) {
  failed++;
  console.log(`  ✗ FAIL: ${label} — ${detail}`);
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE.endsWith('/') ? BASE : BASE + '/');
    const options = {
      hostname: url.hostname || 'localhost',
      port: url.port || 5001,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  DevTrace AI — Part 3: Analysis & Diagnosis');
  console.log('══════════════════════════════════════════════\n');

  // ── Setup: Seed test project and two runs (Success + Fail) ──
  console.log('[Setup] Seeding test runs for comparison and analytics...');
  
  // 1. Create project
  await request('POST', '/api/projects', {
    projectId: PROJECT_ID,
    name: 'Part 3 Analytics Demo',
    description: 'Testing analytics and comparison engines',
  });

  // 2. Create Run 1 (Success)
  await request('POST', '/api/runs', {
    projectId: PROJECT_ID,
    runId: SUCCESS_RUN,
    name: 'user-search-flow',
  });
  await request('POST', '/api/events', {
    eventId: `ev-succ-1-${Date.now()}`,
    projectId: PROJECT_ID,
    runId: SUCCESS_RUN,
    type: 'api_request',
    status: 'success',
    durationMs: 40,
    payload: { endpoint: '/users/search' },
  });
  await request('POST', '/api/events', {
    eventId: `ev-succ-2-${Date.now()}`,
    projectId: PROJECT_ID,
    runId: SUCCESS_RUN,
    type: 'database_query',
    status: 'success',
    durationMs: 120,
    payload: { operation: 'find', collection: 'users' },
  });
  await request('POST', '/api/events', {
    eventId: `ev-succ-3-${Date.now()}`,
    projectId: PROJECT_ID,
    runId: SUCCESS_RUN,
    type: 'response_send',
    status: 'success',
    durationMs: 15,
    payload: { statusCode: 200 },
  });
  await request('PATCH', `/api/runs/${SUCCESS_RUN}`, {
    status: 'success',
    completedAt: new Date().toISOString(),
  });

  // 3. Create Run 2 (Failure)
  await request('POST', '/api/runs', {
    projectId: PROJECT_ID,
    runId: FAILED_RUN,
    name: 'user-search-flow',
  });
  await request('POST', '/api/events', {
    eventId: `ev-fail-1-${Date.now()}`,
    projectId: PROJECT_ID,
    runId: FAILED_RUN,
    type: 'api_request',
    status: 'success',
    durationMs: 45,
    payload: { endpoint: '/users/search' },
  });
  const failedEventId = `ev-fail-2-${Date.now()}`;
  await request('POST', '/api/events', {
    eventId: failedEventId,
    projectId: PROJECT_ID,
    runId: FAILED_RUN,
    type: 'database_query',
    status: 'failed',
    durationMs: 5012,
    payload: {
      operation: 'find',
      message: 'Server selection timed out after 5000 ms. Primary replica unavailable.',
      errorName: 'MongoServerSelectionError',
    },
  });
  await request('PATCH', `/api/runs/${FAILED_RUN}`, {
    status: 'failed',
    completedAt: new Date().toISOString(),
  });

  ok(`Seeded Baseline Run (${SUCCESS_RUN}) and Target Failed Run (${FAILED_RUN})`);

  // ── Test 1: Project Analytics Aggregation ──────────────────
  console.log('\n[Test 1] GET /api/projects/:projectId/analytics');
  {
    const r = await request('GET', `/api/projects/${PROJECT_ID}/analytics`);
    if (r.status === 200 && r.body.data) {
      const a = r.body.data;
      a.totalRuns === 2 ? ok('Total runs counted: 2') : fail('totalRuns', a.totalRuns);
      a.successfulRuns === 1 ? ok('Successful runs counted: 1') : fail('successfulRuns', a.successfulRuns);
      a.failedRuns === 1 ? ok('Failed runs counted: 1') : fail('failedRuns', a.failedRuns);
      a.successRate === 50 ? ok('Success rate computed: 50%') : fail('successRate', a.successRate);
      
      const dbQueryFailures = a.failuresByEventType?.find((f) => f.eventType === 'database_query');
      dbQueryFailures && dbQueryFailures.count === 1
        ? ok('Failures by event type grouped: database_query = 1')
        : fail('failuresByEventType', JSON.stringify(a.failuresByEventType));
      
      Array.isArray(a.recentRuns) && a.recentRuns.length === 2
        ? ok('Recent runs array populated with execution activity')
        : fail('recentRuns', a.recentRuns?.length);
    } else {
      fail('Project Analytics', JSON.stringify(r.body));
    }
  }

  // ── Test 2: Run Comparison Engine ──────────────────────────
  console.log('\n[Test 2] GET /api/compare/:runId1/:runId2');
  {
    const r = await request('GET', `/api/compare/${SUCCESS_RUN}/${FAILED_RUN}`);
    if (r.status === 200 && r.body.data) {
      const c = r.body.data;
      c.summary?.hasFailureDivergence === true
        ? ok('Detected status divergence: Baseline (success) vs Target (failed)')
        : fail('hasFailureDivergence', c.summary?.hasFailureDivergence);

      c.summary?.firstDivergenceStep === 2
        ? ok('Identified exact divergence step: Step #2')
        : fail('firstDivergenceStep', c.summary?.firstDivergenceStep);

      c.summary?.eventCountDifference === -1
        ? ok('Calculated event count delta: -1 (Target halted early)')
        : fail('eventCountDifference', c.summary?.eventCountDifference);

      const step2 = c.sequenceComparison?.find((s) => s.stepIndex === 2);
      step2 && step2.match === false && step2.run2Event?.status === 'failed'
        ? ok(`Step #2 diff: "${step2.difference}"`)
        : fail('Step #2 diff', JSON.stringify(step2));

      c.run2?.firstFailure?.eventId === failedEventId
        ? ok(`Identified target run first failure event: ${failedEventId}`)
        : fail('run2.firstFailure', JSON.stringify(c.run2?.firstFailure));
    } else {
      fail('Run Comparison', JSON.stringify(r.body));
    }
  }

  // ── Test 3: Compare with Nonexistent Run (404) ─────────────
  console.log('\n[Test 3] Compare with Nonexistent Run (404)');
  {
    const r = await request('GET', `/api/compare/${SUCCESS_RUN}/nonexistent-run-xyz`);
    r.status === 404 && r.body.error?.code === 'RUN_NOT_FOUND'
      ? ok('Handled missing run with clean 404 error')
      : fail('Nonexistent comparison', `Expected 404, got ${r.status}`);
  }

  // ── Test 4: AI Failure Diagnosis ───────────────────────────
  console.log('\n[Test 4] POST /api/diagnosis/:runId');
  {
    const r = await request('POST', `/api/diagnosis/${FAILED_RUN}`);
    if (r.status === 200 && r.body.data) {
      const d = r.body.data;
      
      d.summary && typeof d.summary === 'string'
        ? ok(`Generated summary: "${d.summary.substring(0, 60)}..."`)
        : fail('diagnosis.summary', d.summary);

      d.rootCause && typeof d.rootCause === 'string'
        ? ok(`Identified root cause: "${d.rootCause.substring(0, 60)}..."`)
        : fail('diagnosis.rootCause', d.rootCause);

      Array.isArray(d.evidence) && d.evidence.length > 0
        ? ok(`Extracted evidence: cited ${d.evidence.length} event(s) including '${d.evidence[0]?.eventId}'`)
        : fail('diagnosis.evidence', JSON.stringify(d.evidence));

      Array.isArray(d.suggestedChecks) && d.suggestedChecks.length > 0
        ? ok(`Provided ${d.suggestedChecks.length} actionable suggested check(s)`)
        : fail('diagnosis.suggestedChecks', JSON.stringify(d.suggestedChecks));

      ['high', 'medium', 'low'].includes(d.confidence)
        ? ok(`Diagnosis confidence rating: '${d.confidence}'`)
        : fail('diagnosis.confidence', d.confidence);
    } else {
      fail('AI Diagnosis', JSON.stringify(r.body));
    }
  }

  // ── Test 5: Verify Diagnosis Saved in DB ────────────────────
  console.log('\n[Test 5] Verify Diagnosis Cached on Run Document');
  {
    const r = await request('GET', `/api/runs/${FAILED_RUN}`);
    if (r.status === 200 && r.body.data?.diagnosis) {
      ok(`Run document in MongoDB now persists diagnosis (rootCause: "${r.body.data.diagnosis.rootCause.substring(0, 40)}...")`);
    } else {
      fail('Diagnosis caching', JSON.stringify(r.body.data?.diagnosis));
    }
  }

  // ── Summary ───────────────────────────────────────────────
  printSummary();
}

function printSummary() {
  console.log('\n══════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('  🎉 Part 3 COMPLETE — Analysis & Diagnosis Engines Verified!');
  } else {
    console.log('  ⚠️  Review failures above.');
  }
  console.log('══════════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('Fatal error:', err.message);
});

