require('dotenv').config();
const axios = require('axios');

async function testDuplicateEventScenario() {
  const baseUrl = process.env.DEVTRACE_API_URL || 'http://localhost:5000/api';
  console.log('=== Scenario C: Duplicate Event Protection ===\n');

  const duplicateEventId = `dup-test-${Date.now()}`;
  const testRunId = `run-test-${Date.now()}`;

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
    const res1 = await axios.post(`${baseUrl}/events`, eventPayload);
    console.log(`✓ First event accepted! HTTP ${res1.status}: ${res1.data.message}`);

    // 2. Send identical event with same eventId
    console.log(`\n[2/3] Sending duplicate event with SAME eventId: ${duplicateEventId}...`);
    try {
      await axios.post(`${baseUrl}/events`, eventPayload);
      console.error('❌ Error: Server accepted duplicate event! Test failed.');
    } catch (err) {
      if (err.response && (err.response.status === 409 || err.response.data?.error?.code === 'DUPLICATE_EVENT_ID')) {
        console.log(`✓ Success: Server properly rejected duplicate event!`);
        console.log(`HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`);
      } else {
        console.log(`Received error response:`, err.response?.data || err.message);
      }
    }

    // 3. Confirm by querying run events
    console.log(`\n[3/3] Verifying events in run ${testRunId}...`);
    const eventsRes = await axios.get(`${baseUrl}/runs/${testRunId}/events`);
    const matching = eventsRes.data.data.filter((e) => e.eventId === duplicateEventId);
    console.log(`✓ Events with eventId '${duplicateEventId}' in DB: ${matching.length} (Expected: exactly 1)`);
    console.log('\n🎉 Scenario C passed: Duplicate event protection is verified!');
  } catch (error) {
    console.error('Error during duplicate event test:', error.response?.data || error.message);
  }
}

testDuplicateEventScenario();

