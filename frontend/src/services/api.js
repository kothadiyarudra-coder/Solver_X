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

  async analyzeProjectCode(projectId, data = {}) {
    const res = await apiClient.post(`/projects/${projectId}/analyze`, data);
    return res.data?.data;
  },

  async getProjectAnalysis(projectId) {
    const res = await apiClient.get(`/projects/${projectId}/analysis`);
    return res.data?.data;
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
      const rawData = res.data?.data ?? res.data?.points ?? (Array.isArray(res.data) ? res.data : []);
      const rawCategories = Array.isArray(res.data?.categories) ? res.data.categories : [];

      if (!Array.isArray(rawData)) {
        return { points: [], categories: [] };
      }

      // Check if data is legacy format with _id: { hour, type }
      const isLegacy = rawData.some((item) => item && typeof item._id === 'object' && item._id !== null);

      if (isLegacy) {
        const typesSet = new Set();
        const hourMap = {};
        rawData.forEach((item) => {
          if (!item) return;
          const hour = (typeof item._id === 'object' && item._id?.hour) || (typeof item.time === 'string' ? item.time : '00:00');
          if (!hourMap[hour]) hourMap[hour] = { time: hour, success: 0, failed: 0 };

          const rawType = typeof item._id === 'object' ? item._id?.type : item.type;
          const typeKey = typeof rawType === 'string' ? rawType : 'general';
          typesSet.add(typeKey);

          const count = Number(item.count || item.errors || 1);
          const errCount = Number(item.errors || 0);
          hourMap[hour][typeKey] = (hourMap[hour][typeKey] || 0) + count;
          if (errCount > 0) {
            hourMap[hour][`${typeKey}_errors`] = (hourMap[hour][`${typeKey}_errors`] || 0) + errCount;
            hourMap[hour].failed = (hourMap[hour].failed || 0) + errCount;
            hourMap[hour].success = (hourMap[hour].success || 0) + Math.max(0, count - errCount);
          } else {
            hourMap[hour].success = (hourMap[hour].success || 0) + count;
          }
        });
        const points = Object.values(hourMap);
        const categories = Array.from(typesSet);
        return { points, categories };
      }

      // Modern format: sanitize categories and remove raw objects / _id from point values
      const cleanCategories = rawCategories
        .filter((cat) => typeof cat === 'string' && cat !== '_id' && cat !== 'time' && cat !== 'timestamp')
        .map(String);

      const cleanPoints = rawData.map((pt) => {
        if (!pt || typeof pt !== 'object') return { time: '00:00' };
        const cleanPt = {};
        for (const [k, v] of Object.entries(pt)) {
          if (k === '_id') continue;
          if (typeof v === 'object' && v !== null) continue;
          cleanPt[k] = v;
        }
        if (!cleanPt.time) {
          cleanPt.time = typeof pt.timestamp === 'number'
            ? new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '00:00';
        }
        return cleanPt;
      });

      return {
        points: cleanPoints,
        categories: cleanCategories,
      };
    } catch (err) {
      console.warn('[API] getEventTimeseries error:', err.message);
      return { points: [], categories: [] };
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
