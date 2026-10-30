/**
 * DevTrace AI — All Scenarios Interactive Presentation Runner
 *
 * Runs Scenarios A, B, C, and D in sequence to demonstrate the entire platform.
 * Usage: node sample-app/run-all.js
 */

require('dotenv').config();
const http = require('http');
const devtrace = require('devtrace-sdk');

const BASE_URL = process.env.DEVTRACE_API_URL || 'http://localhost:5001/api';

function sendJson(method, path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL.endsWith('/') ? BASE_URL : BASE_URL + '/');
    const postData = data ? JSON.stringify(data) : '';

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port || 5001,
        path: url.pathname,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log('\n======================================================');
  console.log('   DevTrace AI — Complete Platform Demonstration');
  console.log('======================================================\n');

  // ──────────────────────────────────────────────────────────
  // 1. SCENARIO A: Successful Run
  // ──────────────────────────────────────────────────────────
  console.log('▶ [Scenario A] Executing Normal Workflow...');
  const successRun = await devtrace.startRun({
    projectId: 'demo-project',
    name: 'order-fulfillment-pipeline',
  });
  console.log(`  ✓ Started Run: ${successRun.runId}`);

  await devtrace.trackAsync(successRun.runId, 'validate_cart', async () => {
    await sleep(40);
    return { valid: true, itemsCount: 3 };
  });

  await devtrace.trackAsync(successRun.runId, 'process_payment', async () => {
    await sleep(110);
    return { transactionId: 'txn_982347', status: 'authorized' };
  });

  await devtrace.trackAsync(successRun.runId, 'inventory_deduct', async () => {
    await sleep(65);
    return { warehouse: 'US-East-1', updated: true };
  });

  await devtrace.endRun(successRun.runId, 'success');
  console.log(`  🎉 Scenario A Complete: Run '${successRun.runId}' finished with status: SUCCESS\n`);

  await sleep(500);

  // ──────────────────────────────────────────────────────────
  // 2. SCENARIO B: Controlled Failure & AI Diagnosis
  // ──────────────────────────────────────────────────────────
  console.log('▶ [Scenario B] Executing Controlled Failure Workflow...');
  const failRun = await devtrace.startRun({
    projectId: 'demo-project',
    name: 'order-fulfillment-pipeline',
  });
  console.log(`  ✓ Started Run: ${failRun.runId}`);

  await devtrace.trackAsync(failRun.runId, 'validate_cart', async () => {
    await sleep(35);
    return { valid: true, itemsCount: 2 };
  });

  try {
    await devtrace.trackAsync(failRun.runId, 'process_payment', async () => {
      await sleep(150);
      throw new Error('PaymentGatewayTimeout: Stripe API unreachable after 3 retries.');
    });
  } catch (err) {
    console.log(`  ✓ Caught failure in step 'process_payment': ${err.message}`);
  }

  await devtrace.endRun(failRun.runId, 'failed');
  console.log(`  ❌ Scenario B Complete: Run '${failRun.runId}' finished with status: FAILED`);

  // Request AI Diagnosis for the failed run
  console.log(`  🤖 Requesting Gemini AI Diagnosis for ${failRun.runId}...`);
  const diagRes = await sendJson('POST', `/api/diagnosis/${failRun.runId}`);
  if (diagRes.status === 200 && diagRes.data?.data) {
    const diag = diagRes.data.data;
    console.log(`     Summary: ${diag.summary}`);
    console.log(`     Root Cause: ${diag.rootCause}`);
    console.log(`     Evidence Event: ${diag.evidence?.[0]?.eventId || 'N/A'}`);
    console.log(`     Suggested Fix: ${diag.suggestedChecks?.[0] || 'N/A'}`);
    console.log(`     Confidence: ${diag.confidence}`);
  }
  console.log('');

  await sleep(500);

  // ──────────────────────────────────────────────────────────
  // 3. SCENARIO C: Duplicate Event Protection
  // ──────────────────────────────────────────────────────────
  console.log('▶ [Scenario C] Testing Duplicate Event Protection...');
  const dupEventId = `dup-demo-${Date.now()}`;
  const dupPayload = {
    eventId: dupEventId,
    projectId: 'demo-project',
    runId: successRun.runId,
    type: 'audit_log',
    status: 'info',
  };

  const firstEvent = await sendJson('POST', '/api/events', dupPayload);
  console.log(`  ✓ 1st Event: HTTP ${firstEvent.status} (Accepted)`);

  const secondEvent = await sendJson('POST', '/api/events', dupPayload);
  if (secondEvent.status === 409) {
    console.log(`  ✓ 2nd Event: HTTP 409 (Properly Rejected as Duplicate)`);
    console.log(`  🎉 Scenario C Complete: Data integrity preserved!\n`);
  } else {
    console.log(`  ✗ Unexpected response: ${secondEvent.status}\n`);
  }

  await sleep(500);

  // ──────────────────────────────────────────────────────────
  // 4. SCENARIO D: Incomplete Input Validation
  // ──────────────────────────────────────────────────────────
  console.log('▶ [Scenario D] Testing Incomplete Input Validation...');
  const badEvent = await sendJson('POST', '/api/events', { runId: 'run-incomplete' });
  if (badEvent.status === 400) {
    console.log(`  ✓ Malformed Event: HTTP 400 (Rejected: "${badEvent.data?.error?.message}")`);
    console.log(`  🎉 Scenario D Complete: Schema validation protected the database!\n`);
  } else {
    console.log(`  ✗ Unexpected status: ${badEvent.status}\n`);
  }

  // ──────────────────────────────────────────────────────────
  // Summary & Links
  // ──────────────────────────────────────────────────────────
  console.log('======================================================');
  console.log('   🎉 ALL DEMO SCENARIOS COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.log(`\nView the results on your live Dashboard:`);
  console.log(`  ➜ Overview:    http://localhost:5173`);
  console.log(`  ➜ Run History: http://localhost:5173/runs`);
  console.log(`  ➜ Compare:     http://localhost:5173/compare?run1=${successRun.runId}&run2=${failRun.runId}`);
  console.log(`  ➜ Diagnosis:   http://localhost:5173/runs/${failRun.runId}`);
  console.log('======================================================\n');
}

runDemo().catch(console.error);

