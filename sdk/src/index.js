const DevTraceClient = require('./client');
const { generateRunId, generateEventId } = require('./ids');

// Default singleton instance
const defaultClient = new DevTraceClient();

module.exports = {
  DevTraceClient,
  generateRunId,
  generateEventId,
  // Helper methods bound to default instance
  startRun: (opts) => defaultClient.startRun(opts),
  track: (opts) => defaultClient.track(opts),
  trackAsync: (runId, type, fn, extra) => defaultClient.trackAsync(runId, type, fn, extra),
  endRun: (runId, status, extra) => defaultClient.endRun(runId, status, extra),
  init: (config) => new DevTraceClient(config),
};
