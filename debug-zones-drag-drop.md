# Debug Session: zones-drag-drop

- Status: OPEN
- Scope: Admin > Tournaments > Zones drag and drop
- Reported issue: Reordering pairs inside a zone via drag & drop does not trigger any action on drop.

## Initial hypotheses

1. The drop target is not receiving `drop` because `dragover` does not call `preventDefault()`.
2. The dragged item state is captured, but the drop handler exits early due to missing IDs or invalid indices.
3. The UI reorder occurs only after a backend response, and the persistence request is never fired or fails silently.
4. A library or custom component wrapper intercepts pointer/drag events and prevents the sortable logic from running.
5. The reorder request reaches the backend, but the frontend state is not updated or is immediately overwritten by a stale refetch.

## Planned evidence collection

1. Identify the zone admin components and current drag & drop implementation.
2. Instrument the relevant event handlers and persistence call path.
3. Reproduce the issue in development and collect runtime evidence.
4. Confirm root cause, apply a minimal fix, and verify behavior.

## Evidence collected

- The frontend drag and drop flow is implemented in `app/admin/torneo/[id]/page.tsx`.
- The backend persistence flow is implemented in `app/api/admin/torneo/[id]/zonas/mover-pareja/route.ts`.
- Same-zone reorder currently swaps only `parejas_zona.posicion_final`.
- Database inspection confirmed active zones with `posicion_final = NULL` on multiple rows:
  - Zona 456: 3/3 rows null
  - Zona 455: 3/3 rows null
  - Zona 451: 4/4 rows null
  - Zona 450: 4/4 rows null

## Confirmed root cause

- Reordering inside the same zone is a no-op when source and target rows both have `posicion_final = NULL`.
- Cross-zone moves also insert rows into `parejas_zona` without assigning `posicion_final`, which leaves future same-zone reorders in an invalid state.
- The UI waits for the backend round-trip and does not perform an optimistic reorder, so failures or no-op persistence produce no visible feedback.

## Fix applied

- Backend:
  - Normalize `posicion_final` before same-zone reorder.
  - Persist the entire reordered sequence with sequential positions.
  - Preserve or assign `posicion_final` on cross-zone swap/move operations.
  - Normalize affected zones after cross-zone writes.
- Frontend:
  - Keep explicit drag event handling for start, over, drop and end.
  - Apply optimistic same-zone visual swap immediately on drop.
  - Revert the visual change and show an error toast if persistence fails.

## Verification

- Direct database check confirmed active zones with null positions before the fix.
- Reproduction script `scripts/verify-zone-reorder-fix.js` created a temporary zone with both rows in `NULL` state and called the real API endpoint.
- Verification result:
  - Before: pair 823 null, pair 824 null
  - After: pair 824 position 1, pair 823 position 2
- Debug log confirmed the normalized pre-swap rows and committed reordered sequence.
