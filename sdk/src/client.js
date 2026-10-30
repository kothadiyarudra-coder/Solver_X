const axios = require('axios');
const { generateRunId, generateEventId } = require('./ids');

class DevTraceClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.DEVTRACE_API_URL || 'http://localhost:5000/api';
    this.projectId = config.projectId || process.env.DEVTRACE_PROJECT_ID || 'default-project';
    this.timeout = config.timeout || 5000;
    this.silenceErrors = config.silenceErrors !== false; // Don't crash caller if backend down
    
    this.http = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Start a new tracked execution run
   */
  async startRun({ projectId, name, runId } = {}) {
    const activeProjectId = projectId || this.projectId;
    const finalRunId = runId || generateRunId();

    const payload = {
      projectId: activeProjectId,
      runId: finalRunId,
      name: name || 'unnamed-run',
    };

    try {
      const response = await this.http.post('/runs', payload);
      return response.data?.data || { runId: finalRunId, projectId: activeProjectId, status: 'running' };
    } catch (error) {
      if (this.silenceErrors) {
        console.warn(`[DevTrace SDK] Warning: Failed to start run on backend (${error.message}). Continuing locally.`);
        return { runId: finalRunId, projectId: activeProjectId, status: 'running' };
      }
      throw error;
    }
  }

  /**
   * Track an event within a run
   */
  async track({ runId, type, status = 'success', payload = {}, durationMs = 0, eventId, timestamp } = {}) {
    if (!runId) {
      const err = new Error('[DevTrace SDK] runId is required for track()');
      if (this.silenceErrors) {
        console.warn(err.message);
        return null;
      }
      throw err;
    }

    const eventData = {
      eventId: eventId || generateEventId(),
      projectId: this.projectId,
      runId,
      type: type || 'custom_event',
      status,
      timestamp: timestamp || new Date().toISOString(),
      durationMs: typeof durationMs === 'number' ? durationMs : 0,
      payload: payload || {},
    };

    try {
      const response = await this.http.post('/events', eventData);
      return response.data?.data || eventData;
    } catch (error) {
      if (this.silenceErrors) {
        console.warn(`[DevTrace SDK] Warning: Failed to track event ${eventData.eventId} (${error.message})`);
        return eventData;
      }
      throw error;
    }
  }

  /**
   * End a run with final status
   */
  async endRun(runId, status = 'success', extra = {}) {
    if (!runId) {
      const err = new Error('[DevTrace SDK] runId is required for endRun()');
      if (this.silenceErrors) {
        console.warn(err.message);
        return null;
      }
      throw err;
    }

    const payload = {
      status,
      completedAt: new Date().toISOString(),
      ...extra,
    };

    try {
      const response = await this.http.patch(`/runs/${runId}`, payload);
      return response.data?.data || { runId, status };
    } catch (error) {
      if (this.silenceErrors) {
        console.warn(`[DevTrace SDK] Warning: Failed to complete run ${runId} on backend (${error.message})`);
        return { runId, status };
      }
      throw error;
    }
  }
}

module.exports = DevTraceClient;

