import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
});

// Mock Fallback Data (as required by Member 3 task 12)
export const mockAnalytics = {
  projectId: 'demo-project',
  totalRuns: 24,
  successfulRuns: 19,
  failedRuns: 5,
  runningRuns: 0,
  successRate: 79.2,
  avgDurationMs: 1420,
  failuresByEventType: [
    { eventType: 'database_query', count: 3 },
    { eventType: 'llm_call', count: 1 },
    { eventType: 'api_request', count: 1 },
  ],
  recentRuns: [
    {
      runId: 'run-success-01',
      name: 'user-search-workflow',
      projectId: 'demo-project',
      status: 'success',
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date(Date.now() - 3598500).toISOString(),
      durationMs: 1500,
      totalEvents: 4,
      errorCount: 0,
    },
    {
      runId: 'run-fail-02',
      name: 'user-search-workflow',
      projectId: 'demo-project',
      status: 'failed',
      startedAt: new Date(Date.now() - 1800000).toISOString(),
      completedAt: new Date(Date.now() - 1794800).toISOString(),
      durationMs: 5200,
      totalEvents: 3,
      errorCount: 1,
    },
  ],
};

export const mockRunEvents = {
  'run-success-01': [
    {
      eventId: 'ev-101',
      runId: 'run-success-01',
      type: 'api_request',
      status: 'success',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      durationMs: 45,
      payload: { method: 'GET', endpoint: '/users/search?q=alice' },
    },
    {
      eventId: 'ev-102',
      runId: 'run-success-01',
      type: 'database_query',
      status: 'success',
      timestamp: new Date(Date.now() - 3599900).toISOString(),
      durationMs: 120,
      payload: { operation: 'find', collection: 'users', matchedCount: 1 },
    },
    {
      eventId: 'ev-103',
      runId: 'run-success-01',
      type: 'response_send',
      status: 'success',
      timestamp: new Date(Date.now() - 3598500).toISOString(),
      durationMs: 15,
      payload: { statusCode: 200, bytes: 412 },
    },
  ],
  'run-fail-02': [
    {
      eventId: 'ev-201',
      runId: 'run-fail-02',
      type: 'api_request',
      status: 'success',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      durationMs: 42,
      payload: { method: 'GET', endpoint: '/users/search?q=alice' },
    },
    {
      eventId: 'ev-202',
      runId: 'run-fail-02',
      type: 'database_query',
      status: 'failed',
      timestamp: new Date(Date.now() - 1794800).toISOString(),
      durationMs: 5012,
      payload: {
        operation: 'find',
        collection: 'users',
        errorName: 'MongoServerSelectionError',
        message: 'Server selection timed out after 5000 ms. Primary replica unavailable.',
      },
    },
  ],
};

export const mockDiagnosis = {
  summary: 'The run failed during the database query step due to a connection timeout.',
  rootCause: 'The MongoDB server selection timed out after 5000 ms because the primary replica is unreachable or firewalled.',
  evidence: [
    {
      eventId: 'ev-202',
      observation: "Event type 'database_query' failed with MongoServerSelectionError after 5012ms.",
    },
  ],
  suggestedChecks: [
    'Verify the MongoDB Atlas cluster network access whitelist (IP access list).',
    'Check that the database connection string and credentials in .env are correct.',
    'Review MongoDB replica set health and cluster status.',
  ],
  confidence: 'high',
};

// Real API methods with seamless graceful fallback
export const api = {
  async getAnalytics(projectId = 'demo-project') {
    try {
      const res = await apiClient.get(`/projects/${projectId}/analytics`);
      return res.data?.data;
    } catch {
      return mockAnalytics;
    }
  },

  async getRuns(projectId = 'demo-project') {
    try {
      const res = await apiClient.get(`/projects/${projectId}/runs`);
      return res.data?.data?.runs || [];
    } catch {
      return mockAnalytics.recentRuns;
    }
  },

  async getRun(runId) {
    try {
      const res = await apiClient.get(`/runs/${runId}`);
      return res.data?.data;
    } catch {
      return mockAnalytics.recentRuns.find((r) => r.runId === runId) || mockAnalytics.recentRuns[0];
    }
  },

  async getRunEvents(runId) {
    try {
      const res = await apiClient.get(`/runs/${runId}/events`);
      return res.data?.data || [];
    } catch {
      return mockRunEvents[runId] || mockRunEvents['run-fail-02'];
    }
  },

  async compareRuns(runId1, runId2) {
    try {
      const res = await apiClient.get(`/compare/${runId1}/${runId2}`);
      return res.data?.data;
    } catch {
      return {
        run1: { runId: runId1, status: 'success', durationMs: 1500, totalEvents: 3 },
        run2: { runId: runId2, status: 'failed', durationMs: 5200, totalEvents: 2 },
        summary: { durationDifferenceMs: 3700, eventCountDifference: -1, hasFailureDivergence: true },
        sequenceComparison: [
          {
            stepIndex: 1,
            run1Event: { eventId: 'ev-101', type: 'api_request', status: 'success' },
            run2Event: { eventId: 'ev-201', type: 'api_request', status: 'success' },
            match: true,
            difference: 'Identical event type and status',
          },
          {
            stepIndex: 2,
            run1Event: { eventId: 'ev-102', type: 'database_query', status: 'success' },
            run2Event: { eventId: 'ev-202', type: 'database_query', status: 'failed' },
            match: false,
            difference: "Status diverged: 'success' vs 'failed'",
          },
        ],
      };
    }
  },

  async getDiagnosis(runId) {
    try {
      const res = await apiClient.post(`/diagnosis/${runId}`);
      return res.data?.data;
    } catch {
      return mockDiagnosis;
    }
  },
};

