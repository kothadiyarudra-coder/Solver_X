const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const Run = require('../models/Run');
const Event = require('../models/Event');
const Project = require('../models/Project');

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
 * Ensures the core debugging tool NEVER breaks or hangs (README Section 2 Deliverable).
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
        'Review application return codes and external API responses.',
      ],
      confidence: 'medium',
    };
  }

  const firstFail = failedEvents[0];
  const payloadStr = JSON.stringify(firstFail.payload || {});
  const failMessage = firstFail.payload?.message || firstFail.payload?.error || `Failure in event '${firstFail.type}'`;

  return {
    summary: `Execution failed at step '${firstFail.type}' (Event ID: ${firstFail.eventId}).`,
    rootCause: failMessage,
    evidence: [
      {
        eventId: firstFail.eventId,
        observation: `Event type '${firstFail.type}' reported status 'failed' after ${firstFail.durationMs || 0}ms. Details: ${payloadStr}`,
      },
    ],
    suggestedChecks: [
      `Inspect parameters and inputs provided to '${firstFail.type}'.`,
      'Check external service / database availability and timeout configurations.',
      'Review error stack trace and network connectivity.',
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
    throw { statusCode: 404, code: 'RUN_NOT_FOUND', message: `Run '${runId}' not found.` };
  }

  const events = await Event.find({ runId }).sort({ timestamp: 1 }).lean();

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // If no API key or placeholder, use the heuristic evidence diagnosis directly
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.log('[Gemini Service] No valid GEMINI_API_KEY configured, using heuristic evidence diagnosis.');
    const fallback = generateFallbackDiagnosis(run, events);
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

    const callWithTimeout = Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Diagnosis AI call timed out after 8s')), 8000)
      ),
    ]);

    const result = await callWithTimeout;
    const rawText = result.response.text();
    
    // Strip markdown code fences if present (e.g. ```json ... ```)
    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    // Save diagnosis to Run in MongoDB
    await Run.updateOne({ runId }, { diagnosis: parsed });
    return parsed;
  } catch (error) {
    console.error('[Gemini Service Warning]', error.message);
    // Graceful fallback: LLM failure never breaks debugging
    const fallback = generateFallbackDiagnosis(run, events);
    await Run.updateOne({ runId }, { diagnosis: fallback });
    return fallback;
  }
}

/**
 * Scan a directory recursively for code files
 */
function readFilesFromDir(dirPath, maxFiles = 30) {
  const result = [];
  if (!fs.existsSync(dirPath)) return result;

  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.cache', '.gemini'];
  const validExts = ['.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.go', '.java', '.rs', '.html', '.css', '.md'];

  let count = 0;
  function walk(current) {
    if (count >= maxFiles) return;
    try {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        if (count >= maxFiles) break;
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          if (!ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            walk(full);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (validExts.includes(ext) || entry.name === 'Dockerfile') {
            try {
              const stat = fs.statSync(full);
              if (stat.size <= 150 * 1024) {
                const content = fs.readFileSync(full, 'utf8');
                const relPath = path.relative(dirPath, full);
                result.push({
                  name: entry.name,
                  path: relPath,
                  content: content.slice(0, 6000), // first 6k chars
                  size: stat.size,
                });
                count++;
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  walk(dirPath);
  return result;
}

/**
 * Heuristic fallback static analysis for codebases (works 100% offline)
 */
function generateFallbackCodeAnalysis(projectName, files, sourceType, sourcePath) {
  const issues = [];
  const performanceBottlenecks = [];
  const recommendations = [];

  for (const f of files) {
    const text = f.content || '';
    const lines = text.split('\n');

    // 1. Check for synchronous blocking I/O in Node.js
    if (text.includes('readFileSync') || text.includes('writeFileSync')) {
      performanceBottlenecks.push({
        title: 'Blocking Synchronous File I/O',
        impact: 'high',
        file: f.path,
        description: `Found synchronous file operations ('readFileSync' or 'writeFileSync') in ${f.path}. This blocks the Node.js event loop and halts concurrent requests.`,
        optimizationTip: 'Replace with non-blocking async promises: `fs.promises.readFile()` or streams.',
      });
    }

    // 2. Check for empty catch blocks / silent error suppression
    lines.forEach((line, idx) => {
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line) || /catch\s*\{\s*\}/.test(line)) {
        issues.push({
          title: 'Empty Catch Block (Silent Failure)',
          severity: 'medium',
          category: 'reliability',
          file: f.path,
          line: idx + 1,
          description: `Errors are silently caught without logging or handling at line ${idx + 1} of ${f.path}.`,
          suggestedFix: 'Log the error to telemetry or throw a domain-specific error.',
        });
      }
    });

    // 3. Potential hardcoded credential / secret risk
    lines.forEach((line, idx) => {
      if (/(api[_-]?key|secret|password|auth_token)\s*=\s*['"][a-zA-Z0-9_\-]{16,}['"]/i.test(line)) {
        issues.push({
          title: 'Possible Hardcoded Secret Detected',
          severity: 'critical',
          category: 'security',
          file: f.path,
          line: idx + 1,
          description: `Line ${idx + 1} appears to contain a hardcoded token or secret.`,
          suggestedFix: 'Extract credentials into environment variables (`process.env`).',
        });
      }
    });

    // 4. Inefficient nested array operations
    if (/(for\s*\(.*in.*\).*for\s*\(|forEach\(.*forEach\(|\.map\(.*\.filter\()/s.test(text)) {
      performanceBottlenecks.push({
        title: 'Nested Iteration Complexity Risk',
        impact: 'medium',
        file: f.path,
        description: `Potential O(N^2) nested loop or chained array traversals found in ${f.path}.`,
        optimizationTip: 'Use a Hash Map / Set index to achieve O(1) lookups during traversal.',
      });
    }
  }

  // Base scores
  const critCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const perfPenalty = performanceBottlenecks.length * 8;
  const secPenalty = critCount * 25 + highCount * 12;

  const performanceScore = Math.max(55, Math.min(96, 95 - perfPenalty));
  const securityScore = Math.max(50, Math.min(98, 96 - secPenalty));
  const reliabilityScore = Math.max(60, Math.min(95, 92 - (issues.length * 6)));
  const overallScore = Math.round((performanceScore + securityScore + reliabilityScore) / 3);

  recommendations.push(
    'Ensure all async operations have structured error handling with non-blocking error recovery.',
    'Maintain environment variable configurations for third-party endpoints and API keys.',
    'Add automated trace instrumentation (DevTrace SDK) to critical database queries and external HTTP calls.'
  );

  return {
    summary: `Codebase audit completed for '${projectName}' (${files.length} file(s) evaluated via ${sourceType || 'telemetry'}). Overall code health score is ${overallScore}/100.`,
    healthScore: {
      overall: overallScore,
      performance: performanceScore,
      reliability: reliabilityScore,
      security: securityScore,
    },
    filesAnalyzed: files.length,
    issues: issues.slice(0, 10),
    performanceBottlenecks: performanceBottlenecks.slice(0, 6),
    recommendations,
    analyzedAt: new Date(),
    modelUsed: 'heuristic-static-audit',
  };
}

/**
 * Synchronize newly discovered errors into the MongoDB events & runs collections
 * Creates actionable error events that immediately appear on the Issues and Discover pages.
 */
async function syncDiscoveredErrorsToDb(projectId, projectName, issues) {
  if (!issues || !Array.isArray(issues) || issues.length === 0) return 0;

  try {
    const auditRunId = `audit-run-${projectId}`;

    // Ensure audit Run document exists
    await Run.findOneAndUpdate(
      { runId: auditRunId },
      {
        $setOnInsert: {
          runId: auditRunId,
          projectId: projectId,
          name: `AI Code Audit for ${projectName}`,
          status: 'failed',
          startedAt: new Date(),
          completedAt: new Date(),
          durationMs: 0,
          totalEvents: 0,
          errorCount: 0,
        },
      },
      { upsert: true, new: true }
    );

    let newErrorsCount = 0;
    for (let i = 0; i < issues.length; i++) {
      const iss = issues[i];
      // Check if an event with this error title already exists in DB for this project
      const existing = await Event.findOne({
        projectId,
        $or: [
          { 'payload.message': iss.title },
          { 'payload.errorName': iss.title },
          { 'payload.description': iss.description },
        ],
      });

      if (!existing) {
        const errEventId = `evt-audit-${projectId}-${Date.now().toString(36)}-${i}`;
        await Event.create({
          eventId: errEventId,
          projectId,
          runId: auditRunId,
          type:
            iss.category === 'security'
              ? 'security_vulnerability'
              : iss.category === 'reliability'
              ? 'reliability_risk'
              : 'code_issue',
          status: 'failed',
          timestamp: new Date(),
          durationMs: 0,
          payload: {
            message: iss.title,
            errorName: iss.title,
            endpoint: iss.file ? `${iss.file}${iss.line ? `:${iss.line}` : ''}` : 'codebase',
            operation: iss.category || 'code_issue',
            file: iss.file || 'unknown',
            line: iss.line || 1,
            severity: iss.severity || 'high',
            description: iss.description,
            suggestedFix: iss.suggestedFix,
            source: 'gemini_codebase_audit',
          },
        });
        newErrorsCount++;
      }
    }

    if (newErrorsCount > 0) {
      await Run.updateOne(
        { runId: auditRunId },
        {
          $inc: { totalEvents: newErrorsCount, errorCount: newErrorsCount },
          $set: { status: 'failed', completedAt: new Date() },
        }
      );
      console.log(`[Gemini Audit] Synced ${newErrorsCount} new discovered error(s) to MongoDB for project '${projectId}'`);
    }

    return newErrorsCount;
  } catch (err) {
    console.warn('[Gemini Audit Sync Warning]:', err.message);
    return 0;
  }
}

/**
 * AI-powered Codebase Diagnosis for a Project
 * Analyzes code from local path, uploaded files, or software URL against existing database errors:
 *   - Cross-references existing database errors with source code
 *   - Discovers any new errors, runtime risks, or performance bottlenecks
 *   - Automatically updates newly found errors in the database!
 */
async function analyzeCodebase(projectId, options = {}) {
  const project = await Project.findOne({ projectId });
  if (!project) {
    throw { statusCode: 404, code: 'PROJECT_NOT_FOUND', message: `Project '${projectId}' not found.` };
  }

  let filesToAnalyze = [];

  // 1. Gather files based on source type
  if (options.files && Array.isArray(options.files) && options.files.length > 0) {
    filesToAnalyze = options.files;
  } else if (project.codeFiles && project.codeFiles.length > 0) {
    filesToAnalyze = project.codeFiles;
  } else if (project.sourceType === 'local_path' && project.sourcePath) {
    filesToAnalyze = readFilesFromDir(project.sourcePath, 35);
  } else if (options.localPath) {
    filesToAnalyze = readFilesFromDir(options.localPath, 35);
  }

  // If no files could be read directly, generate metadata representation
  if (filesToAnalyze.length === 0) {
    const summaryInfo = project.sourcePath || project.softwareUrl || `Project ID: ${projectId}`;
    filesToAnalyze = [
      {
        name: 'project-metadata.json',
        path: 'metadata.json',
        content: JSON.stringify(
          {
            projectId: project.projectId,
            name: project.name,
            sourceType: project.sourceType,
            sourcePath: project.sourcePath,
            softwareUrl: project.softwareUrl,
            description: project.description,
          },
          null,
          2
        ),
        size: 512,
      },
    ];
  }

  // 2. Query existing errors in the database for this project (or recent errors)
  const existingDbErrors = await Event.find({ projectId: project.projectId, status: 'failed' })
    .sort({ timestamp: -1 })
    .limit(30)
    .lean();

  let errorContext = existingDbErrors;
  if (errorContext.length === 0) {
    errorContext = await Event.find({ status: 'failed' }).sort({ timestamp: -1 }).limit(10).lean();
  }

  const existingErrorSignatures = errorContext.map((e) => ({
    eventId: e.eventId,
    type: e.type,
    message: e.payload?.message || e.payload?.errorName || e.type,
    culprit: e.payload?.endpoint || e.payload?.operation || e.payload?.file || 'N/A',
  }));

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // If no Gemini API key or offline, use smart static analysis
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    const analysis = generateFallbackCodeAnalysis(project.name, filesToAnalyze, project.sourceType, project.sourcePath);
    await Project.updateOne({ projectId }, { codeAnalysis: analysis });
    await syncDiscoveredErrorsToDb(project.projectId, project.name, analysis.issues);
    return analysis;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const fileSummaries = filesToAnalyze.slice(0, 25).map((f) => ({
      path: f.path || f.name,
      size: f.size,
      snippet: (f.content || '').slice(0, 3500),
    }));

    const prompt = `You are a senior principal software engineer and static analysis auditor.
Audit the following codebase/software project.

Important Task Instructions:
1. Examine the supplied code files against the EXISTING RECORDED DATABASE ERRORS.
2. Cross-reference: determine if any of the existing database errors are visible in this code.
3. DETECT NEW ERRORS: Identify any new, previously unrecorded bugs, runtime failure risks, unhandled promise rejections, connection leaks, database query issues, or security flaws in this code that are NOT yet in the database.
4. For every error, provide actionable remediation so it can be automatically indexed in the database.
5. Identify performance bottlenecks (blocking synchronous operations, inefficient nested iterations, memory leaks, unindexed queries).
6. Provide health scores (0 to 100) for Performance, Reliability, Security, and Overall.

Project Information:
- Name: ${project.name}
- Project ID: ${project.projectId}
- Source Type: ${project.sourceType || 'local_path'}
- Source Reference: ${project.sourcePath || project.softwareUrl || 'N/A'}
- Description: ${project.description || 'N/A'}

Existing Recorded Database Errors:
${JSON.stringify(existingErrorSignatures, null, 2)}

Code files to audit:
${JSON.stringify(fileSummaries, null, 2)}

Return valid JSON strictly conforming to this schema:
{
  "summary": "Detailed executive analysis of codebase architecture and state",
  "healthScore": {
    "overall": 85,
    "performance": 80,
    "reliability": 90,
    "security": 88
  },
  "issues": [
    {
      "title": "Short descriptive title of the error or bug",
      "severity": "critical" | "high" | "medium" | "low",
      "category": "security" | "bug" | "reliability",
      "file": "path/to/file",
      "line": 42,
      "description": "Explanation of the issue and why it will fail",
      "suggestedFix": "Code fix or advice"
    }
  ],
  "performanceBottlenecks": [
    {
      "title": "Short title",
      "impact": "high" | "medium" | "low",
      "file": "path/to/file",
      "description": "Why this causes latency or bottleneck",
      "optimizationTip": "Specific optimization advice"
    }
  ],
  "recommendations": [
    "Practical architectural or operational recommendation"
  ]
}`;

    const callWithTimeout = Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Codebase AI audit timed out after 8s')), 8000)
      ),
    ]);

    const result = await callWithTimeout;
    const rawText = result.response.text();
    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    parsed.analyzedAt = new Date();
    parsed.filesAnalyzed = filesToAnalyze.length;
    parsed.modelUsed = 'gemini-1.5-flash';

    // Update project document with full analysis
    await Project.updateOne({ projectId }, { codeAnalysis: parsed });

    // Sync newly discovered issues as error events directly in MongoDB
    const syncedCount = await syncDiscoveredErrorsToDb(project.projectId, project.name, parsed.issues);
    parsed.newErrorsSyncedToDb = syncedCount;

    return parsed;
  } catch (error) {
    console.error('[Gemini Code Analysis Warning]', error.message);
    const fallback = generateFallbackCodeAnalysis(project.name, filesToAnalyze, project.sourceType, project.sourcePath);
    await Project.updateOne({ projectId }, { codeAnalysis: fallback });
    await syncDiscoveredErrorsToDb(project.projectId, project.name, fallback.issues);
    return fallback;
  }
}

module.exports = {
  generateDiagnosis,
  analyzeCodebase,
  readFilesFromDir,
};
