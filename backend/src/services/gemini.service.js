const { GoogleGenerativeAI } = require('@google/generative-ai');
const Run = require('../models/Run');
const Event = require('../models/Event');

/**
 * Sanitize object to remove passwords, tokens, secrets before passing to LLM
 */
function sanitizeData(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = Array.isArray(obj) ? [] : {};
  const secretKeywords = ['password', 'secret', 'token', 'auth', 'apikey', 'api_key', 'key', 'credential'];

  for (const [key, value] of Object.entries(obj)) {
    const isSecret = secretKeywords.some((kw) => key.toLowerCase().includes(kw));
    if (isSecret) {
      sanitized[key] = '[REDACTED_SECRET]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Rule-based fallback diagnosis when LLM key is absent or offline
 */
function generateFallbackDiagnosis(run, events) {
  const failedEvents = events.filter((e) => e.status === 'failed');

  if (failedEvents.length === 0) {
    return {
      summary: `Run ${run.runId} completed with status: ${run.status}. No explicit failed events found.`,
      rootCause: 'No failed events detected in execution timeline.',
      evidence: [],
      suggestedChecks: [
        'Check application log levels for untracked silent warnings.',
        'Verify timeout settings for long-running operations.',
      ],
      confidence: 'medium',
    };
  }

  const firstFail = failedEvents[0];
  const payloadStr = JSON.stringify(firstFail.payload || {});

  return {
    summary: `Execution failed at step '${firstFail.type}' (${firstFail.eventId}).`,
    rootCause: firstFail.payload?.message || `Failure in event type '${firstFail.type}'. Details: ${payloadStr}`,
    evidence: [
      {
        eventId: firstFail.eventId,
        observation: `Event type '${firstFail.type}' reported status: failed after ${firstFail.durationMs || 0}ms.`,
      },
    ],
    suggestedChecks: [
      `Inspect parameters and inputs provided to '${firstFail.type}'.`,
      'Check external service / database availability and timeout configurations.',
      'Review error stack trace in the event payload.',
    ],
    confidence: 'high',
  };
}

/**
 * Generate AI-powered diagnosis for a run using Gemini API
 */
async function generateDiagnosis(runId) {
  const run = await Run.findOne({ runId }).lean();
  if (!run) {
    throw { statusCode: 404, code: 'RUN_NOT_FOUND', message: `Run ${runId} not found.` };
  }

  const events = await Event.find({ runId }).sort({ timestamp: 1 }).lean();

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.log('[Gemini Service] No valid GEMINI_API_KEY found, using rule-based evidence diagnosis.');
    const fallback = generateFallbackDiagnosis(run, events);
    // Cache diagnosis on run
    await Run.updateOne({ runId }, { diagnosis: fallback });
    return fallback;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const sanitizedEvents = events.map((e) => ({
      eventId: e.eventId,
      type: e.type,
      status: e.status,
      timestamp: e.timestamp,
      durationMs: e.durationMs,
      payload: sanitizeData(e.payload),
    }));

    const prompt = `You are a software debugging assistant.
Analyze the supplied application run and event history.

Your tasks:
1. Identify the first important failure.
2. Explain the likely root cause in simple language.
3. Point to the exact event IDs that support your finding.
4. Suggest practical checks or fixes.
5. Separate confirmed evidence from assumptions.
6. Do not invent missing logs, configuration, or facts.

Return valid JSON conforming to this schema:
{
  "summary": "Short explanation of failure",
  "rootCause": "Likely root cause in plain English",
  "evidence": [
    { "eventId": "string", "observation": "string" }
  ],
  "suggestedChecks": ["string"],
  "confidence": "high" | "medium" | "low"
}

Run data:
${JSON.stringify({ runId: run.runId, name: run.name, status: run.status, durationMs: run.durationMs, startedAt: run.startedAt, completedAt: run.completedAt }, null, 2)}

Event history:
${JSON.stringify(sanitizedEvents, null, 2)}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    // Save diagnosis to Run
    await Run.updateOne({ runId }, { diagnosis: parsed });
    return parsed;
  } catch (error) {
    console.error('[Gemini Service Error]', error.message);
    // Graceful fallback: LLM failure never breaks debugging
    const fallback = generateFallbackDiagnosis(run, events);
    await Run.updateOne({ runId }, { diagnosis: fallback });
    return fallback;
  }
}

module.exports = {
  generateDiagnosis,
};

