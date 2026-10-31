/**
 * Part 2 Verification Script — REST API Ingestion Tests
 *
 * Tests all CRUD endpoints against a live backend (must be running on PORT 5000).
 * Covers all 4 demo scenarios from README Section 10.
 *
 * Usage:
 *   1. Start backend:  npm --prefix backend run dev
 *   2. Run tests:      node backend/scripts/verify-api.js
 */

const http = require('http');

const BASE = process.env.API_BASE || 'http://localhost:5001/api';
const TEST_PROJECT = `test-part2-${Date.now()}`;
const TEST_RUN = `run-part2-${Date.now()}`;
const TEST_EVENT = `evt-part2-${Date.now()}`;

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

// Simple HTTP request helper (no external deps)
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE.endsWith('/') ? BASE : BASE + '/');
    const fullPath = url.pathname;
    const options = {
      hostname: url.hostname || 'localhost',
      port: url.port || 5001,
      path: fullPath,
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
  console.log('  DevTrace AI — Part 2: REST API Verification');
  console.log('══════════════════════════════════════════════\n');

  // ── 1. Health Check ──────────────────────────────
  console.log('[Test 1] Health Check');
  try {
    const r = await request('GET', '/health');
    r.status === 200 && r.body.status === 'ok'
      ? ok('GET /health returns 200')
      : fail('Health check', `Status: ${r.status}`);
  } catch (e) {
    fail('Health check', `Server unreachable: ${e.message}. Is the backend running?`);
    return printSummary();
  }

  // ── 2. Create Project ───────────────────────────
  console.log('\n[Test 2] POST /api/projects');
  {
    const r = await request('POST', '/api/projects', {
      projectId: TEST_PROJECT,
      name: 'Part 2 Test Project',
      description: 'Automated API test',
    });
    r.status === 201 && r.body.success
      ? ok(`Project '${TEST_PROJECT}' created`)
      : fail('Create project', JSON.stringify(r.body));
  }

  // ── 3. Duplicate Project ────────────────────────
  console.log('\n[Test 3] Duplicate Project (409)');
  {
    const r = await request('POST', '/api/projects', {
      projectId: TEST_PROJECT,
      name: 'Duplicate',
    });
    r.status === 409
      ? ok('Duplicate project rejected with 409')
      : fail('Duplicate project', `Expected 409, got ${r.status}`);
  }

  // ── 4. List Projects ───────────────────────────
  console.log('\n[Test 4] GET /api/projects');
  {
    const r = await request('GET', '/api/projects');
    r.status === 200 && Array.isArray(r.body.data)
      ? ok(`Listed ${r.body.data.length} project(s)`)
      : fail('List projects', JSON.stringify(r.body));
  }

  // ── 5. Create Run ──────────────────────────────
  console.log('\n[Test 5] POST /api/runs');
  {
    const r = await request('POST', '/api/runs', {
      projectId: TEST_PROJECT,
      runId: TEST_RUN,
      name: 'test-workflow',
    });
    r.status === 201 && r.body.data?.status === 'running'
      ? ok(`Run '${TEST_RUN}' created with status 'running'`)
      : fail('Create run', JSON.stringify(r.body));
  }

  // ── 6. Ingest Event (success) ──────────────────
  console.log('\n[Test 6] POST /api/events (valid event)');
  {
    const r = await request('POST', '/api/events', {
      eventId: TEST_EVENT,
      projectId: TEST_PROJECT,
      runId: TEST_RUN,
      type: 'api_request',
      status: 'success',
      durationMs: 42,
      payload: { method: 'GET', endpoint: '/test' },
    });
    r.status === 201 && r.body.success
      ? ok(`Event '${TEST_EVENT}' recorded`)
      : fail('Create event', JSON.stringify(r.body));
  }

  // ── 7. Duplicate Event (Demo Scenario C) ───────
  console.log('\n[Test 7] Duplicate Event (Demo Scenario C — 409)');
  {
    const r = await request('POST', '/api/events', {
      eventId: TEST_EVENT,
      projectId: TEST_PROJECT,
      runId: TEST_RUN,
      type: 'api_request',
      status: 'success',
    });
    r.status === 409 && r.body.error?.code === 'DUPLICATE_EVENT_ID'
      ? ok('Duplicate event rejected with 409 DUPLICATE_EVENT_ID')
      : fail('Duplicate event', `Expected 409, got ${r.status}: ${JSON.stringify(r.body)}`);
  }

  // ── 8. Missing Fields (Demo Scenario D) ────────
  console.log('\n[Test 8] Missing Fields (Demo Scenario D — 400)');
  {
    const r = await request('POST', '/api/events', {
      runId: TEST_RUN,
      type: 'api_request',
    });
    r.status === 400 && r.body.error?.code === 'VALIDATION_ERROR'
      ? ok(`Rejected: "${r.body.error.message}"`)
      : fail('Missing fields', `Expected 400, got ${r.status}: ${JSON.stringify(r.body)}`);
  }

  // ── 9. Invalid Status Enum ─────────────────────
  console.log('\n[Test 9] Invalid Status Enum (400)');
  {
    const r = await request('POST', '/api/events', {
      eventId: `evt-bad-${Date.now()}`,
      projectId: TEST_PROJECT,
      runId: TEST_RUN,
      type: 'test',
      status: 'BOGUS_VALUE',
    });
    r.status === 400
      ? ok(`Rejected invalid status: "${r.body.error?.message}"`)
      : fail('Invalid enum', `Expected 400, got ${r.status}`);
  }

  // ── 10. Ingest Failed Event ────────────────────
  console.log('\n[Test 10] POST /api/events (failed event — auto-marks run)');
  {
    const r = await request('POST', '/api/events', {
      eventId: `${TEST_EVENT}-fail`,
      projectId: TEST_PROJECT,
      runId: TEST_RUN,
      type: 'database_query',
      status: 'failed',
      durationMs: 5000,
      payload: { message: 'Connection timeout' },
    });
    r.status === 201
      ? ok('Failed event recorded')
      : fail('Failed event', JSON.stringify(r.body));
  }

  // ── 11. Get Event Timeline ─────────────────────
  console.log('\n[Test 11] GET /api/runs/:runId/events');
  {
    const r = await request('GET', `/api/runs/${TEST_RUN}/events`);
    r.status === 200 && Array.isArray(r.body.data) && r.body.data.length === 2
      ? ok(`Timeline has ${r.body.data.length} events (sorted by timestamp)`)
      : fail('Event timeline', `Expected 2 events, got: ${r.body.data?.length}`);
  }

  // ── 12. Finish Run ─────────────────────────────
  console.log('\n[Test 12] PATCH /api/runs/:runId (finish run)');
  {
    const r = await request('PATCH', `/api/runs/${TEST_RUN}`, {
      status: 'failed',
      completedAt: new Date().toISOString(),
    });
    if (r.status === 200 && r.body.data) {
      const d = r.body.data;
      const checks = [];
      d.status === 'failed' ? checks.push('status=failed') : fail('Run status', d.status);
      d.totalEvents === 2 ? checks.push('totalEvents=2') : fail('totalEvents', d.totalEvents);
      d.errorCount === 1 ? checks.push('errorCount=1') : fail('errorCount', d.errorCount);
      d.durationMs > 0 ? checks.push(`durationMs=${d.durationMs}`) : fail('durationMs', d.durationMs);
      ok(`Run finished: ${checks.join(', ')}`);
    } else {
      fail('Finish run', JSON.stringify(r.body));
    }
  }

  // ── 13. Get Run Details ────────────────────────
  console.log('\n[Test 13] GET /api/runs/:runId');
  {
    const r = await request('GET', `/api/runs/${TEST_RUN}`);
    r.status === 200 && r.body.data?.runId === TEST_RUN
      ? ok(`Run details retrieved: status=${r.body.data.status}`)
      : fail('Get run', JSON.stringify(r.body));
  }

  // ── 14. List Project Runs ──────────────────────
  console.log('\n[Test 14] GET /api/projects/:projectId/runs');
  {
    const r = await request('GET', `/api/projects/${TEST_PROJECT}/runs`);
    r.status === 200 && r.body.data?.total >= 1
      ? ok(`${r.body.data.total} run(s) listed for project`)
      : fail('List runs', JSON.stringify(r.body));
  }

  // ── 15. Run Not Found ──────────────────────────
  console.log('\n[Test 15] GET /api/runs/nonexistent (404)');
  {
    const r = await request('GET', '/api/runs/does-not-exist-xyz');
    r.status === 404
      ? ok('Nonexistent run returns 404')
      : fail('Run 404', `Expected 404, got ${r.status}`);
  }

  // ── 16. Batch Events ───────────────────────────
  console.log('\n[Test 16] POST /api/events/batch');
  {
    const batchRun = `${TEST_RUN}-batch`;
    await request('POST', '/api/runs', { projectId: TEST_PROJECT, runId: batchRun, name: 'batch-test' });

    const r = await request('POST', '/api/events/batch', {
      events: [
        { eventId: `batch-1-${Date.now()}`, projectId: TEST_PROJECT, runId: batchRun, type: 'step', status: 'success' },
        { eventId: `batch-2-${Date.now()}`, projectId: TEST_PROJECT, runId: batchRun, type: 'step', status: 'success' },
        { eventId: `batch-1-${Date.now()}`, projectId: TEST_PROJECT, runId: batchRun, type: 'step', status: 'failed' },
      ],
    });
    r.status === 201 && r.body.data?.insertedCount >= 2
      ? ok(`Batch: ${r.body.data.insertedCount} inserted, ${r.body.data.duplicateCount} dups, ${r.body.data.errorCount} errors`)
      : fail('Batch events', JSON.stringify(r.body));
  }

  // ── Summary ──────────────────────────────────────
  printSummary();
}

function printSummary() {
  console.log('\n══════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('  🎉 Part 2 COMPLETE — All REST APIs verified!');
  } else {
    console.log('  ⚠️  Fix the failures above before moving to Part 3.');
  }
  console.log('══════════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('Fatal error:', err.message);
  console.log('\n  Make sure the backend is running: npm --prefix backend run dev\n');
});

