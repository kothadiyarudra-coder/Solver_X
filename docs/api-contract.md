# DevTrace AI — Shared API Contract

All endpoints follow consistent JSON envelopes:

### Success Response Envelope
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed"
}
```

### Error Response Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "eventId is required"
  }
}
```

---

## 1. Project Endpoints

### Create Project
- **Method:** `POST`
- **Path:** `/api/projects`
- **Request Body:**
  ```json
  {
    "projectId": "demo-project",
    "name": "Demo AI Assistant",
    "description": "Sample application used for DevTrace demo"
  }
  ```
- **Response:** `201 Created`

### List Projects
- **Method:** `GET`
- **Path:** `/api/projects`
- **Response:** `200 OK`

---

## 2. Run Endpoints

### Start Run
- **Method:** `POST`
- **Path:** `/api/runs`
- **Request Body:**
  ```json
  {
    "projectId": "demo-project",
    "runId": "run-001",
    "name": "question-answer"
  }
  ```
- **Response:** `201 Created`

### Finish / Update Run
- **Method:** `PATCH`
- **Path:** `/api/runs/:runId`
- **Request Body:**
  ```json
  {
    "status": "failed",
    "completedAt": "2026-10-30T10:00:05.000Z"
  }
  ```
- **Response:** `200 OK`

### Get Run Details
- **Method:** `GET`
- **Path:** `/api/runs/:runId`
- **Response:** `200 OK`

### List Project Runs
- **Method:** `GET`
- **Path:** `/api/projects/:projectId/runs?status=failed&limit=50&skip=0`
- **Response:** `200 OK`

---

## 3. Event Endpoints

### Ingest Single Event
- **Method:** `POST`
- **Path:** `/api/events`
- **Request Body:**
  ```json
  {
    "eventId": "event-001",
    "projectId": "demo-project",
    "runId": "run-001",
    "type": "llm_call",
    "status": "success",
    "timestamp": "2026-10-30T10:00:00.000Z",
    "durationMs": 850,
    "payload": {
      "model": "gemini",
      "operation": "generate"
    }
  }
  ```
- **Response:** `201 Created` (or `409 Conflict` if `eventId` already exists)

### Ingest Batch Events
- **Method:** `POST`
- **Path:** `/api/events/batch`
- **Request Body:**
  ```json
  {
    "events": [ /* array of event objects */ ]
  }
  ```

### Get Run Event Timeline
- **Method:** `GET`
- **Path:** `/api/runs/:runId/events`
- **Response:** `200 OK`

---

## 4. Analysis & Diagnosis Endpoints

### Compare Two Runs
- **Method:** `GET`
- **Path:** `/api/compare/:runId1/:runId2`
- **Response:** `200 OK`
  Returns sequence-by-sequence comparison, status divergence indicators, and duration delta.

### Project Analytics
- **Method:** `GET`
- **Path:** `/api/projects/:projectId/analytics`
- **Response:** `200 OK`
  Returns aggregated counts, success rate, average duration, and failure counts by event type.

### Generate AI Diagnosis
- **Method:** `POST`
- **Path:** `/api/diagnosis/:runId`
- **Response:** `200 OK`
  Returns Gemini root cause analysis, evidence array citing event IDs, suggested checks, and confidence rating.

