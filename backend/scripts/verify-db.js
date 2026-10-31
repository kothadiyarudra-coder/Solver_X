/**
 * Part 1 Verification Script — Database Foundation Check
 *
 * Run this to verify:
 *   1. MongoDB Atlas connection succeeds
 *   2. All 3 collections are created (projects, runs, events)
 *   3. Indexes are synced properly
 *   4. Schema validation works (required fields enforced)
 *   5. Unique constraint prevents duplicate eventId (Demo Scenario C)
 *
 * Usage:  node backend/scripts/verify-db.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const Project = require('../src/models/Project');
const Run = require('../src/models/Run');
const Event = require('../src/models/Event');
const connectDB = require('../src/config/db');

// Test counters
let passed = 0;
let failed = 0;

function ok(label) {
  passed++;
  console.log(`  ✓ PASS: ${label}`);
}

function fail(label, err) {
  failed++;
  console.log(`  ✗ FAIL: ${label} — ${err}`);
}

async function run() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  DevTrace AI — Part 1: Database Verification');
  console.log('══════════════════════════════════════════════\n');

  // ── Test 1: Connection ──────────────────────────
  console.log('[Test 1] MongoDB Connection');
  const conn = await connectDB();
  if (!conn) {
    fail('MongoDB connection', 'Could not connect. Check MONGODB_URI in .env');
    return printSummary();
  }
  ok('MongoDB connected');

  const db = conn.connection.db;
  const dbName = db.databaseName;
  ok(`Using database: '${dbName}'`);

  // ── Test 2: Index Verification ──────────────────
  console.log('\n[Test 2] Index Verification');
  try {
    const eventIndexes = await Event.collection.indexes();
    const hasEventIdUnique = eventIndexes.some(
      (idx) => idx.key?.eventId && idx.unique === true
    );
    const hasCompoundTimeline = eventIndexes.some(
      (idx) => idx.key?.projectId === 1 && idx.key?.runId === 1 && idx.key?.timestamp === 1
    );
    hasEventIdUnique ? ok('events.eventId unique index') : fail('events.eventId unique index', 'Missing');
    hasCompoundTimeline ? ok('events { projectId, runId, timestamp } compound index') : fail('events compound index', 'Missing');

    const runIndexes = await Run.collection.indexes();
    const hasRunCompound = runIndexes.some(
      (idx) => idx.key?.projectId === 1 && idx.key?.startedAt === -1
    );
    hasRunCompound ? ok('runs { projectId, startedAt } compound index') : fail('runs compound index', 'Missing');

    const projectIndexes = await Project.collection.indexes();
    const hasProjectIdUnique = projectIndexes.some(
      (idx) => idx.key?.projectId && idx.unique === true
    );
    hasProjectIdUnique ? ok('projects.projectId unique index') : fail('projects.projectId unique index', 'Missing');
  } catch (err) {
    fail('Index verification', err.message);
  }

  // ── Test 3: Schema Validation — Required Fields ──
  console.log('\n[Test 3] Schema Validation (Required Fields)');
  try {
    await Event.create({});
    fail('Missing fields should be rejected', 'Document was created without required fields');
  } catch (err) {
    if (err.name === 'ValidationError') {
      const missingFields = Object.keys(err.errors);
      ok(`Rejected empty event — missing: ${missingFields.join(', ')}`);
    } else {
      fail('Validation test', err.message);
    }
  }

  try {
    await Run.create({});
    fail('Missing fields should be rejected', 'Run was created without required fields');
  } catch (err) {
    if (err.name === 'ValidationError') {
      ok(`Rejected empty run — missing: ${Object.keys(err.errors).join(', ')}`);
    } else {
      fail('Run validation test', err.message);
    }
  }

  // ── Test 4: Enum Validation ──────────────────────
  console.log('\n[Test 4] Enum Validation');
  try {
    await Event.create({
      eventId: '__test-enum-' + Date.now(),
      projectId: 'test',
      runId: 'test',
      type: 'test',
      status: 'INVALID_STATUS',
    });
    fail('Invalid enum should be rejected', 'Document was created with invalid status');
  } catch (err) {
    if (err.name === 'ValidationError') {
      ok('Rejected invalid event status enum');
    } else {
      fail('Enum test', err.message);
    }
  }

  // ── Test 5: Duplicate eventId Prevention ─────────
  console.log('\n[Test 5] Duplicate eventId Protection (Demo Scenario C)');
  const testEventId = '__verify-dup-' + Date.now();
  try {
    // Insert first
    await Event.create({
      eventId: testEventId,
      projectId: 'verify-project',
      runId: 'verify-run',
      type: 'test_event',
      status: 'info',
    });
    ok(`First insert accepted: ${testEventId}`);

    // Insert duplicate
    try {
      await Event.create({
        eventId: testEventId,
        projectId: 'verify-project',
        runId: 'verify-run',
        type: 'test_event',
        status: 'info',
      });
      fail('Duplicate should be rejected', 'Second insert was accepted');
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        ok(`Duplicate rejected with E11000`);
      } else {
        fail('Duplicate rejection', dupErr.message);
      }
    }
  } catch (err) {
    fail('Event insert', err.message);
  }

  // ── Test 6: Clean up test documents ──────────────
  console.log('\n[Cleanup] Removing test documents...');
  try {
    await Event.deleteMany({ projectId: 'verify-project' });
    await Event.deleteMany({ eventId: { $regex: /^__test-enum-/ } });
    ok('Test documents cleaned up');
  } catch (err) {
    fail('Cleanup', err.message);
  }

  // ── Summary ─────────────────────────────────────
  printSummary();
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

function printSummary() {
  console.log('\n══════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('  🎉 Part 1 COMPLETE — Database foundation is solid!');
  } else {
    console.log('  ⚠️  Fix the failures above before moving to Part 2.');
  }
  console.log('══════════════════════════════════════════════\n');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

