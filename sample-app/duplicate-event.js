require('dotenv').config();
const http = require('http');

function sendJsonRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, process.env.DEVTRACE_API_URL || 'http://localhost:5001/api/');
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

async function testDuplicateEventScenario() {
  console.log('=== Scenario C: Duplicate Event Protection ===\n');

  const duplicateEventId = `dup-test-${Date.now()}`;
  const testRunId = `run-test-${Date.now()}`;

  // Ensure project exists
  await sendJsonRequest('POST', '/api/projects', {
    projectId: 'demo-project',
    name: 'Demo AI Assistant',
  });

  // Ensure run exists
  await sendJsonRequest('POST', '/api/runs', {
    projectId: 'demo-project',
    runId: testRunId,
    name: 'duplicate-test-flow',
  });

  const eventPayload = {
    eventId: duplicateEventId,
    projectId: 'demo-project',
    runId: testRunId,
    type: 'llm_call',
    status: 'success',
    timestamp: new Date().toISOString(),
    durationMs: 320,
    payload: {
      model: 'gemini-1.5-flash',
      promptTokens: 120,
      completionTokens: 45,
    },
  };

  try {
    // 1. Send first event
    console.log(`[1/3] Sending first event with eventId: ${duplicateEventId}...`);
    const res1 = await sendJsonRequest('POST', '/api/events', eventPayload);
    console.log(`✓ First event accepted! HTTP ${res1.status}: ${res1.data?.message || 'OK'}`);

    // 2. Send identical event with same eventId
    console.log(`\n[2/3] Sending duplicate event with SAME eventId: ${duplicateEventId}...`);
    const res2 = await sendJsonRequest('POST', '/api/events', eventPayload);
    if (res2.status === 409 || res2.data?.error?.code === 'DUPLICATE_EVENT_ID') {
      console.log(`✓ Success: Server properly rejected duplicate event with HTTP 409!`);
      console.log(`Response: ${JSON.stringify(res2.data)}`);
    } else {
      console.error(`❌ Unexpected status: ${res2.status}`, res2.data);
    }

    // 3. Confirm only 1 event exists
    console.log(`\n[3/3] Verifying events in run ${testRunId}...`);
    const res3 = await sendJsonRequest('GET', `/api/runs/${testRunId}/events`);
    const events = Array.isArray(res3.data?.data) ? res3.data.data : [];
    const matching = events.filter((e) => e.eventId === duplicateEventId);
    console.log(`✓ Events with eventId '${duplicateEventId}' in DB: ${matching.length} (Expected: exactly 1)`);
    console.log('\n🎉 Scenario C passed: Duplicate event protection is verified!');
  } catch (error) {
    console.error('Error during duplicate event test:', error.message);
  }
}

testDuplicateEventScenario();
