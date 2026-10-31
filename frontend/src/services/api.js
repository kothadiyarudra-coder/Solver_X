import axios from 'axios';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:5001/api');

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export const api = {
  // Projects
  async getProjects() {
    try {
      const res = await apiClient.get('/projects');
      return res.data?.data || [];
    } catch (err) {
      console.warn('[API] getProjects error:', err.message);
      return [];
    }
  },

  async createProject(projectData) {
    const res = await apiClient.post('/projects', projectData);
    return res.data?.data;
  },

  async deleteProject(projectId) {
    const res = await apiClient.delete(`/projects/${projectId}`);
    return res.data;
  },

  // Analytics & Aggregates
  async getAnalytics(projectId = null) {
    try {
      const url = projectId && projectId !== 'all'
        ? `/projects/${projectId}/analytics`
        : '/projects/all/analytics';
      const res = await apiClient.get(url);
      return res.data?.data || null;
    } catch (err) {
      console.warn('[API] getAnalytics error:', err.message);
      return null;
    }
  },

  // Runs
  async getRuns(params = {}) {
    try {
      const { projectId, status, limit = 50 } = params;
      const res = await apiClient.get('/runs', {
        params: {
          ...(projectId && projectId !== 'all' ? { projectId } : {}),
          ...(status && status !== 'all' ? { status } : {}),
          limit,
        },
      });
      return res.data?.data?.runs || [];
    } catch (err) {
      console.warn('[API] getRuns error:', err.message);
      return [];
    }
  },

  async getRun(runId) {
    try {
      const res = await apiClient.get(`/runs/${runId}`);
      return res.data?.data || null;
    } catch (err) {
      console.warn('[API] getRun error:', err.message);
      return null;
    }
  },

  // Events & Telemetry
  async getEvents(params = {}) {
    try {
      const res = await apiClient.get('/events', { params });
      return res.data?.data?.events || [];
    } catch (err) {
      console.warn('[API] getEvents error:', err.message);
      return [];
    }
  },

  async getRunEvents(runId) {
    try {
      const res = await apiClient.get(`/runs/${runId}/events`);
      return res.data?.data || [];
    } catch (err) {
      console.warn('[API] getRunEvents error:', err.message);
      return [];
    }
  },

  async getErrorEvents(params = {}) {
    try {
      const res = await apiClient.get('/events/errors', { params });
      return res.data?.data || { errors: [], totalErrors: 0 };
    } catch (err) {
      console.warn('[API] getErrorEvents error:', err.message);
      return { errors: [], totalErrors: 0 };
    }
  },

  async getPerformanceStats(params = {}) {
    try {
      const res = await apiClient.get('/events/performance', { params });
      return res.data?.data || { summary: { p50: 0, p75: 0, p95: 0, avg: 0, totalEvents: 0 }, transactions: [] };
    } catch (err) {
      console.warn('[API] getPerformanceStats error:', err.message);
      return { summary: { p50: 0, p75: 0, p95: 0, avg: 0, totalEvents: 0 }, transactions: [] };
    }
  },

  async getEventTimeseries(params = {}) {
    try {
      const res = await apiClient.get('/events/timeseries', { params });
      return res.data?.data || [];
    } catch (err) {
      console.warn('[API] getEventTimeseries error:', err.message);
      return [];
    }
  },

  // Differential Comparison
  async compareRuns(runId1, runId2) {
    const res = await apiClient.get(`/compare/${runId1}/${runId2}`);
    return res.data?.data || null;
  },

  // AI Diagnosis
  async getDiagnosis(runId) {
    const res = await apiClient.post(`/diagnosis/${runId}`);
    return res.data?.data || null;
  },
};

export default api;
