require('dotenv').config();
const devtrace = require('devtrace-sdk');

async function runSuccessScenario() {
  console.log('=== Scenario A: Successful Run ===\n');

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
      durationMs: 45,
      payload: {
        method: 'GET',
        endpoint: '/users/search?q=alice',
        clientIp: '127.0.0.1',
      },
    });

    // 3. Track Event 2: Database Query
    console.log('[3/4] Tracking Database Query Event...');
    await devtrace.track({
      runId: run.runId,
      type: 'database_query',
      status: 'success',
      durationMs: 120,
      payload: {
        operation: 'find',
        collection: 'users',
        matchedCount: 1,
      },
    });

    // 4. Track Event 3: Response Serialization
    console.log('[4/4] Tracking Response Event & Finishing run...');
    await devtrace.track({
      runId: run.runId,
      type: 'response_send',
      status: 'success',
      durationMs: 15,
      payload: {
        statusCode: 200,
        bytes: 412,
      },
    });

    // Finish Run successfully
    await devtrace.endRun(run.runId, 'success');
    console.log(`\n🎉 Success! Run ${run.runId} marked as 'success'.`);
  } catch (error) {
    console.error('Unexpected error in success scenario:', error.message);
    await devtrace.endRun(run.runId, 'failed');
  }
}

runSuccessScenario();

