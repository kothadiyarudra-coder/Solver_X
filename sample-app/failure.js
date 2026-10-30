require('dotenv').config();
const devtrace = require('devtrace-sdk');

async function runFailureScenario() {
  console.log('=== Scenario B: Failed Run (Controlled Error) ===\n');

  // 1. Start Run
  console.log('[1/4] Starting run on project "demo-project"...');
  const run = await devtrace.startRun({
    projectId: 'demo-project',
    name: 'user-search-workflow',
  });
  console.log(`✓ Run created: ${run.runId}`);

  try {
    // 2. Track Event 1: API Request
    console.log('[2/4] Tracking HTTP Request Event...');
    await devtrace.track({
      runId: run.runId,
      type: 'api_request',
      status: 'success',
      durationMs: 42,
      payload: {
        method: 'GET',
        endpoint: '/users/search?q=alice',
        clientIp: '127.0.0.1',
      },
    });

    // 3. Simulate failure in Database Query
    console.log('[3/4] Executing Database Query with connection timeout...');
    throw new Error('MongoServerSelectionError: Server selection timed out after 5000 ms. Primary replica unavailable.');
  } catch (error) {
    // SDK records the failed event with exact error message and details
    console.log(`[4/4] Controlled failure caught. Tracking failed event...`);
    const failEvent = await devtrace.track({
      runId: run.runId,
      type: 'database_query',
      status: 'failed',
      durationMs: 5012,
      payload: {
        operation: 'find',
        collection: 'users',
        errorName: error.name,
        message: error.message,
        connectionHost: 'cluster0-shard-00-00.mongodb.net:27017',
      },
    });

    await devtrace.endRun(run.runId, 'failed');
    console.log(`\n❌ Failed Run recorded: ${run.runId}`);
    console.log(`Failed Event ID: ${failEvent?.eventId || 'unknown'}`);
    console.log(`You can now compare this run with a successful run and request AI diagnosis!`);
  }
}

runFailureScenario();

