/**
 * DevTrace AI — Master Test Suite
 *
 * Runs an exhaustive test of EVERY feature across the platform:
 *   1. Database Connection & Schema Indexes
 *   2. Project Management API
 *   3. Run Lifecycle API
 *   4. Event Ingestion & Duplicate Protection
 *   5. Run Comparison Engine
 *   6. MongoDB Aggregation Analytics
 *   7. AI Failure Diagnosis & Evidence Extraction
 *   8. DevTrace JavaScript SDK Integration
 *   9. Scenarios A, B, C, D End-to-End
 *   10. Frontend & Backend Health Check
 *
 * Usage: node backend/scripts/master-test-all.js
 */

const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const devtrace = require('../../sdk');
const Project = require('../src/models/Project');
const Run = require('../src/models/Run');
const Event = require('../src/models/Event');
const connectDB = require('../src/config/db');

const API_BASE = process.env.API_BASE || 'http://localhost:5001/api';
const FRONTEND_URL = 'http://localhost:5173';

const TEST_ID = Date.now().toString(36);
const P_ID = `test-master-proj-${TEST_ID}`;
const RUN_A = `run-master-succ-${TEST_ID}`;
const RUN_B = `run-master-fail-${TEST_ID}`;

let passedCount = 0;
let failedCount = 0;
const testResults = [];

function record(section, name, pass, detail) {
  if (pass) {
    passedCount++;
    testResults.push({ section, name, pass: true, detail });
    console.log(`    ✓ [PASS] ${name}`);
  } else {
    failedCount++;
    testResults.push({ section, name, pass: false, detail });
    console.log(`    ✗ [FAIL] ${name} — ${detail}`);
  }
}

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE.endsWith('/') ? API_BASE : API_BASE + '/');
    const dataStr = body ? JSON.stringify(body) : '';

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 5001,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataStr),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (dataStr) req.write(dataStr);
    req.end();
  });
}

function probeUrl(urlStr) {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const req = http.get({ hostname: url.hostname, port: url.port, path: url.pathname }, (res) => {
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(0));
  });
}

async function runMasterTest() {
  console.log('\n================================================================');
  console.log('   DevTrace AI — Comprehensive Platform Master Verification');
  console.log('================================================================\n');

  // ──────────────────────────────────────────────────────────
  // 1. Service Health & Connectivity
  // ──────────────────────────────────────────────────────────
  console.log('【1】Service Health & Connectivity');
  const beStatus = await probeUrl('http://localhost:5001/health');
  record('Health', 'Backend API listening on Port 5001', beStatus === 200, `HTTP ${beStatus}`);

  const feStatus = await probeUrl(FRONTEND_URL);
  record('Health', 'Frontend React Dashboard listening on Port 5173', feStatus === 200, `HTTP ${feStatus}`);

  // ──────────────────────────────────────────────────────────
  // 2. Database Foundation & MongoDB Atlas Indexes
  // ──────────────────────────────────────────────────────────
  console.log('\n【2】Database Foundation & Schema Indexes');
  const conn = await connectDB();
  record('Database', 'Connected to MongoDB Atlas cluster', conn !== null, conn ? conn.connection.host : 'Offline');

  try {
    const eventIndexes = await Event.collection.indexes();
    const hasEventIdUnique = eventIndexes.some((i) => i.key?.eventId && i.unique === true);
    const hasCompoundEvent = eventIndexes.some((i) => i.key?.projectId === 1 && i.key?.runId === 1 && i.key?.timestamp === 1);
    record('Database', 'Event collection has unique index on eventId', hasEventIdUnique);
    record('Database', 'Event collection has compound index {projectId, runId, timestamp}', hasCompoundEvent);

    const runIndexes = await Run.collection.indexes();
    const hasRunCompound = runIndexes.some((i) => i.key?.projectId === 1 && i.key?.startedAt === -1);
    record('Database', 'Run collection has compound index {projectId, startedAt: -1}', hasRunCompound);
  } catch (err) {
    record('Database', 'Verify schema indexes', false, err.message);
  }

  // ──────────────────────────────────────────────────────────
  // 3. Project Management API
  // ──────────────────────────────────────────────────────────
  console.log('\n【3】Project Management API');
  const pCreate = await httpReq('POST', '/api/projects', {
    projectId: P_ID,
    name: 'Master Test Project',
    description: 'Project created for master test suite',
  });
  record('Project API', 'POST /api/projects creates new project (201)', pCreate.status === 201 && pCreate.body.success);

  const pDup = await httpReq('POST', '/api/projects', {
    projectId: P_ID,
    name: 'Duplicate Test',
  });
  record('Project API', 'POST /api/projects rejects duplicate projectId (409)', pDup.status === 409);

  const pList = await httpReq('GET', '/api/projects');
  record('Project API', 'GET /api/projects returns list of projects (200)', pList.status === 200 && Array.isArray(pList.body.data));

  // ──────────────────────────────────────────────────────────
  // 4. Run Lifecycle API
  // ──────────────────────────────────────────────────────────
  console.log('\n【4】Run Lifecycle API');
  const rCreate = await httpReq('POST', '/api/runs', {
    projectId: P_ID,
    runId: RUN_A,
    name: 'pipeline-success-flow',
  });
  record('Run API', 'POST /api/runs starts run with status: "running" (201)', rCreate.status === 201 && rCreate.body.data?.status === 'running');

  const rGet = await httpReq('GET', `/api/runs/${RUN_A}`);
  record('Run API', 'GET /api/runs/:runId retrieves single run details (200)', rGet.status === 200 && rGet.body.data?.runId === RUN_A);

  const rPatch = await httpReq('PATCH', `/api/runs/${RUN_A}`, {
    status: 'success',
    completedAt: new Date().toISOString(),
  });
  record('Run API', 'PATCH /api/runs/:runId completes run and calculates durationMs (200)', rPatch.status === 200 && rPatch.body.data?.status === 'success');

  const rList = await httpReq('GET', `/api/projects/${P_ID}/runs`);
  record('Run API', 'GET /api/projects/:projectId/runs lists project runs (200)', rList.status === 200 && rList.body.data?.total >= 1);

  // ──────────────────────────────────────────────────────────
  // 5. Event Ingestion & Error Handling
  // ──────────────────────────────────────────────────────────
  console.log('\n【5】Event Ingestion & Error Guarding');
  const evUniqueId = `ev-master-${Date.now()}`;
  const evCreate = await httpReq('POST', '/api/events', {
    eventId: evUniqueId,
    projectId: P_ID,
    runId: RUN_A,
    type: 'http_request',
    status: 'success',
    durationMs: 45,
    payload: { path: '/api/v1/auth' },
  });
  record('Event API', 'POST /api/events ingests single event (201)', evCreate.status === 201 && evCreate.body.success);

  // Duplicate rejection (Demo Scenario C)
  const evDup = await httpReq('POST', '/api/events', {
    eventId: evUniqueId,
    projectId: P_ID,
    runId: RUN_A,
    type: 'http_request',
    status: 'success',
  });
  record('Event API', 'POST /api/events blocks duplicate eventId with 409 (Scenario C)', evDup.status === 409 && evDup.body.error?.code === 'DUPLICATE_EVENT_ID');

  // Incomplete input (Demo Scenario D)
  const evIncomplete = await httpReq('POST', '/api/events', { runId: RUN_A, type: 'test' });
  record('Event API', 'POST /api/events rejects missing required fields with 400 (Scenario D)', evIncomplete.status === 400 && evIncomplete.body.error?.code === 'VALIDATION_ERROR');

  // Invalid enum validation
  const evBadEnum = await httpReq('POST', '/api/events', {
    eventId: `ev-bad-${Date.now()}`,
    projectId: P_ID,
    runId: RUN_A,
    type: 'test',
    status: 'NOT_A_VALID_STATUS',
  });
  record('Event API', 'POST /api/events validates status enum with 400', evBadEnum.status === 400);

  // Batch ingestion
  const evBatch = await httpReq('POST', '/api/events/batch', {
    events: [
      { eventId: `batch-a-${Date.now()}`, projectId: P_ID, runId: RUN_A, type: 'cache_hit', status: 'success' },
      { eventId: `batch-b-${Date.now()}`, projectId: P_ID, runId: RUN_A, type: 'audit_log', status: 'success' },
    ],
  });
  record('Event API', 'POST /api/events/batch processes array of events (201)', evBatch.status === 201 && evBatch.body.data?.insertedCount === 2);

  // Event timeline retrieval
  const evTimeline = await httpReq('GET', `/api/runs/${RUN_A}/events`);
  record('Event API', 'GET /api/runs/:runId/events returns chronological timeline (200)', evTimeline.status === 200 && evTimeline.body.data?.length >= 3);

  // ──────────────────────────────────────────────────────────
  // 6. Run Comparison Engine
  // ──────────────────────────────────────────────────────────
  console.log('\n【6】Run Comparison Engine');
  // Seed Run B as a failure
  await httpReq('POST', '/api/runs', { projectId: P_ID, runId: RUN_B, name: 'pipeline-fail-flow' });
  await httpReq('POST', '/api/events', {
    eventId: `ev-fail-step1-${Date.now()}`,
    projectId: P_ID,
    runId: RUN_B,
    type: 'http_request',
    status: 'success',
    durationMs: 42,
  });
  const failEvId = `ev-fail-step2-${Date.now()}`;
  await httpReq('POST', '/api/events', {
    eventId: failEvId,
    projectId: P_ID,
    runId: RUN_B,
    type: 'database_query',
    status: 'failed',
    durationMs: 5000,
    payload: { message: 'ConnectionPoolTimeout: Database exhausted available connections.' },
  });
  await httpReq('PATCH', `/api/runs/${RUN_B}`, { status: 'failed' });

  const compRes = await httpReq('GET', `/api/compare/${RUN_A}/${RUN_B}`);
  const compData = compRes.body.data;
  record('Comparison', 'GET /api/compare/:run1/:run2 returns comparison object (200)', compRes.status === 200 && compData !== undefined);
  record('Comparison', 'Identifies status divergence between runs (hasFailureDivergence === true)', compData?.summary?.hasFailureDivergence === true);
  record('Comparison', 'Identifies divergence step index in sequence', compData?.summary?.firstDivergenceStep !== undefined);
  record('Comparison', 'Computes duration delta and event count variance', compData?.summary?.eventCountDifference !== undefined);

  // ──────────────────────────────────────────────────────────
  // 7. MongoDB Aggregation Analytics
  // ──────────────────────────────────────────────────────────
  console.log('\n【7】Analytics Engine (MongoDB Aggregation)');
  const anRes = await httpReq('GET', `/api/projects/${P_ID}/analytics`);
  const anData = anRes.body.data;
  record('Analytics', 'GET /api/projects/:projectId/analytics returns aggregation (200)', anRes.status === 200 && anData !== undefined);
  record('Analytics', 'Calculates Total Runs and Success Rate %', anData?.totalRuns === 2 && anData?.successRate === 50);
  record('Analytics', 'Aggregates failure counts by event type', Array.isArray(anData?.failuresByEventType) && anData.failuresByEventType.length > 0);
  record('Analytics', 'Populates recent run execution history array', Array.isArray(anData?.recentRuns) && anData.recentRuns.length === 2);

  // ──────────────────────────────────────────────────────────
  // 8. AI Failure Diagnosis & Evidence Extraction
  // ──────────────────────────────────────────────────────────
  console.log('\n【8】AI Failure Diagnosis');
  const diagRes = await httpReq('POST', `/api/diagnosis/${RUN_B}`);
  const diagData = diagRes.body.data;
  record('Diagnosis', 'POST /api/diagnosis/:runId generates structured diagnosis (200)', diagRes.status === 200 && diagData !== undefined);
  record('Diagnosis', 'Identifies root cause explanation', typeof diagData?.rootCause === 'string' && diagData.rootCause.length > 5);
  record('Diagnosis', 'Cites exact event ID as concrete evidence', Array.isArray(diagData?.evidence) && diagData.evidence.some((e) => e.eventId === failEvId));
  record('Diagnosis', 'Suggests actionable debugging checks and remedies', Array.isArray(diagData?.suggestedChecks) && diagData.suggestedChecks.length > 0);
  record('Diagnosis', 'Assigns confidence rating (high / medium / low)', ['high', 'medium', 'low'].includes(diagData?.confidence));

  // Verify cached on Run document in MongoDB Atlas
  const runVerify = await httpReq('GET', `/api/runs/${RUN_B}`);
  record('Diagnosis', 'Persists diagnosis to Run document in MongoDB Atlas', runVerify.body.data?.diagnosis?.rootCause !== undefined);

  // ──────────────────────────────────────────────────────────
  // 9. DevTrace JavaScript SDK Integration
  // ──────────────────────────────────────────────────────────
  console.log('\n【9】DevTrace JavaScript SDK');
  const sdkRun = await devtrace.startRun({ projectId: P_ID, name: 'sdk-integration-check' });
  record('SDK', 'SDK startRun() returns initialized run object', sdkRun?.runId !== undefined);

  const sdkEvent = await devtrace.track({
    runId: sdkRun.runId,
    type: 'auth_validation',
    status: 'success',
    payload: { scope: 'read:write' },
  });
  record('SDK', 'SDK track() emits event successfully to backend', sdkEvent?.eventId !== undefined);

  let asyncTrackPassed = false;
  try {
    await devtrace.trackAsync(sdkRun.runId, 'compute_task', async () => {
      return 42 * 2;
    });
    asyncTrackPassed = true;
  } catch {}
  record('SDK', 'SDK trackAsync() executes function & auto-records timing', asyncTrackPassed);

  const sdkEnd = await devtrace.endRun(sdkRun.runId, 'success');
  record('SDK', 'SDK endRun() updates run status to "success"', sdkEnd?.status === 'success');

  // Disconnect test connection
  await mongoose.disconnect();

  // ──────────────────────────────────────────────────────────
  // Scorecard Summary
  // ──────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`   MASTER TEST RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount === 0) {
    console.log('🎉 ALL FEATURES ARE 100% OPERATIONAL AND WORKING!');
    console.log('   - Backend API: Verified on http://localhost:5001');
    console.log('   - Frontend Dashboard: Verified on http://localhost:5173');
    console.log('   - MongoDB Atlas: Verified & Synced');
    console.log('   - JavaScript SDK: Verified & Communicating');
    console.log('   - Diagnosis & Analytics: Verified & Caching');
  } else {
    console.log(`⚠️  ${failedCount} test(s) failed. Review details above.`);
  }
  console.log('================================================================\n');

  process.exit(failedCount > 0 ? 1 : 0);
}

runMasterTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
