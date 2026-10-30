# DevTrace AI — System Architecture

## Overview
DevTrace AI is a specialized developer observability and diagnosis platform designed to answer the core engineering question:
> **"Why did this application or AI-agent run fail, and what changed compared with a successful run?"**

## System Diagram

```
Sample App / Developer App
          |
          v
 DevTrace JavaScript SDK (devtrace-sdk)
          |
          | HTTP REST (POST /api/runs, POST /api/events, PATCH /api/runs/:runId)
          v
    Express Backend (Port 5000)
          |
          +------ Validates required fields (eventId, runId, type, status)
          |
          +------ Deduplicates eventId via unique indexes
          |
          v
       MongoDB Atlas
   (projects, runs, events)
          |
          v
   Analysis Service
   - Run comparison (identifies exact diverged step & duration delta)
   - Aggregation pipelines (failure metrics by event type)
          |
          v
      Gemini API (Google Generative AI)
   - Root cause analysis
   - Concrete event evidence citations
   - Actionable suggested checks
          |
          v
     React + Vite Dashboard (Port 5173)
```

## Component Details

### 1. JavaScript SDK (`sdk/`)
- Lightweight instrumentation library for Node.js and backend apps.
- `startRun({ projectId, name })`: Generates a stable run ID and initiates the run in the backend.
- `track({ runId, type, status, payload, durationMs })`: Emits granular step events.
- `endRun(runId, status)`: Closes the run and computes total duration.
- Non-blocking resilience: If the DevTrace backend is unavailable, SDK catches errors and logs warnings without crashing the host application.

### 2. Express Backend & MongoDB (`backend/`)
- **Node.js + Express**: Scalable REST endpoints.
- **Socket.IO**: Real-time event and run updates for the dashboard.
- **MongoDB Atlas collections**:
  - `projects`: Registered workspaces and metadata.
  - `runs`: Aggregated run statistics (`durationMs`, `totalEvents`, `errorCount`, `diagnosis`).
  - `events`: Granular execution steps with unique compound indexes.
- **Sanitization layer**: Strips API keys, passwords, and tokens before sending event telemetry to LLMs.

### 3. Gemini Failure Diagnosis Service
- Formats chronological run events into a structured debugging context.
- Prompts Gemini with strict evidence-extraction constraints.
- Emits structured JSON containing:
  - `summary`: High-level synopsis.
  - `rootCause`: Plain-English explanation of why the failure occurred.
  - `evidence`: Direct citations of specific event IDs and observed errors.
  - `suggestedChecks`: Practical debugging recommendations.
  - `confidence`: Confidence score (`high`, `medium`, `low`).
- Built-in heuristic fallback: Provides rule-based diagnosis even if the LLM key is absent.

### 4. React Dashboard (`frontend/`)
- Fast modern UI built with Vite, Tailwind CSS, Lucide React, and Recharts.
- Pages:
  - **Overview**: High-level KPIs, failure hotspot charts, recent runs.
  - **Run History**: Filterable list of all runs.
  - **Run Details**: Step-by-step expandable event timeline and payload viewer.
  - **Compare Runs**: Side-by-side run sequence comparator with status divergence highlighting.
  - **AI Diagnosis**: Detailed Gemini root-cause breakdown.

