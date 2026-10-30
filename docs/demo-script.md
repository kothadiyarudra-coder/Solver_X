# DevTrace AI — Demonstration Script & Scenarios

This guide details how to demonstrate DevTrace AI for judges and reviewers.

---

## Prerequisites
1. Start the DevTrace backend:
   ```bash
   cd backend
   npm run dev
   ```
2. Start the DevTrace frontend:
   ```bash
   cd frontend
   npm run dev
   ```
3. Open the dashboard in browser at: `http://localhost:5173`

---

## Scenario A: Successful Run
**Objective:** Demonstrate end-to-end tracing of a healthy application workflow.

1. Run the sample success workflow:
   ```bash
   node sample-app/success.js
   ```
2. Observe terminal output:
   - Run initiated.
   - 3 events emitted: `api_request`, `database_query`, `response_send`.
   - Run completed with status `success`.
3. Open `http://localhost:5173/runs` in the dashboard.
4. Click on the newly recorded run.
5. Verify that all 3 events are marked green/successful in the timeline with execution times.

---

## Scenario B: Controlled Failure & AI Diagnosis
**Objective:** Demonstrate automatic failure capture, run comparison, and evidence-based AI diagnosis.

1. Run the sample failure workflow:
   ```bash
   node sample-app/failure.js
   ```
2. Observe terminal output:
   - `api_request` succeeds.
   - `database_query` fails with simulated `MongoServerSelectionError` timeout.
   - Run is marked `failed`.
3. In the dashboard, click **Run History** and open the failed run.
4. Click **"Generate AI Diagnosis"**:
   - Gemini analyzes the event history.
   - Identifies the root cause (MongoDB timeout).
   - Points specifically to the failed event ID.
   - Provides concrete remediation suggestions.
5. Click **"Compare Run"**:
   - Compare the failed run with Scenario A's successful run.
   - Highlight the exact step where status diverged from `success` to `failed`.

---

## Scenario C: Duplicate Event Protection
**Objective:** Verify MongoDB unique index prevents duplicate `eventId` injection.

1. Run the duplicate test script:
   ```bash
   node sample-app/duplicate-event.js
   ```
2. Observe:
   - First event with unique `eventId` is accepted (`201 Created`).
   - Second event with identical `eventId` is rejected with `409 Conflict` (`DUPLICATE_EVENT_ID`).
   - Database confirms only 1 record exists.

---

## Scenario D: Incomplete Input Validation
**Objective:** Verify robust backend schema validation rejects missing required fields.

1. Test invalid event without `eventId`:
   ```bash
   curl -X POST http://localhost:5000/api/events \
     -H "Content-Type: application/json" \
     -d '{"runId": "run-test", "type": "api_request"}'
   ```
2. Observe response:
   ```json
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "eventId is required"
     }
   }
   ```
3. Confirms data integrity and resilience against malformed telemetry.

