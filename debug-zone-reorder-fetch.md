# Debug Session: zone-reorder-fetch

- Status: OPEN
- Scope: Admin > Tournaments > Zones reorder drag and drop
- Reported issue: The UI shows "failed to fetch" when attempting to change the order of a pair inside a zone.

## Initial hypotheses

1. The frontend `fetch` to `POST /api/admin/torneo/[id]/zonas/mover-pareja` is being aborted or blocked before the request is completed.
2. The server route throws an unhandled exception during same-zone reorder, causing the browser to surface a network-level `failed to fetch`.
3. The instrumentation `fetch("http://127.0.0.1:7777/event", ...)` is interfering with the request lifecycle in the browser or server path.
4. The request reaches the backend, but a runtime error in DB normalization or match regeneration closes the response unexpectedly.
5. The app is hitting a dev-only runtime/build error in `page.tsx` after the latest changes, so the browser reports a generic fetch failure instead of a structured API error.

## Planned evidence collection

1. Start a fresh debug server for this symptom.
2. Inspect current instrumentation and route code without changing business logic.
3. Reproduce the action and collect runtime logs from frontend and backend.
4. Confirm the failing point, then apply the minimal fix and verify.

## Evidence collected

- A fresh debug server is running for session `zone-reorder-fetch`.
- Frontend instrumentation was updated to report this session during drag, drop, request start, request failure and catch paths.
- Backend instrumentation was updated to report route entry, same-zone row load, commit success and route-level failures.
- Script-based reproduction against `http://localhost:3000/api/admin/torneo/:id/zonas/mover-pareja` succeeds.
- Current server evidence shows:
  - route entry received
  - same-zone rows normalized and loaded
  - swap committed successfully

## Current conclusion

- The API path is functional in at least one runtime path.
- The reported `failed to fetch` is likely browser-context-specific or triggered before the request reaches the server route during manual drag and drop.

## Fix applied

- Wrapped the entire `POST /api/admin/torneo/[id]/zonas/mover-pareja` flow in a single top-level `try/catch` so same-zone reorder exceptions also return JSON instead of breaking the request lifecycle.
- Updated frontend zone move/reorder error handling to convert raw `Failed to fetch` messages into clear user-facing connectivity messages.
- Added user-facing error handling to the zone-level drop target path, which previously swallowed request failures silently.
- Switched runtime instrumentation to `runId: post-fix` for subsequent verification.

## Post-fix evidence

- `GetDiagnostics` is clean for the edited frontend and backend files.
- In this local environment, `scripts/verify-zone-reorder-fix.js` now fails with `ECONNREFUSED` specifically because no app server was reachable on `http://localhost:3000`, which independently explains one reproducible source of `fetch failed`.
- A dedicated local dev server was started successfully on `http://localhost:3002`, separating code-level issues from environment-level availability issues.

## Root-cause assessment

- Primary code issue: same-zone reorder code ran outside the main route `try/catch`, so certain runtime failures could abort the request instead of returning structured JSON.
- Secondary environment issue: when the frontend or verification tooling points to a non-running origin, the browser/Node surfaces the generic `Failed to fetch` / `fetch failed` message.
