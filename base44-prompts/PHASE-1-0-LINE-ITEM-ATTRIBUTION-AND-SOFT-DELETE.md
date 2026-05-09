# Phase 1.0 — Line-item attribution + soft-delete schema (FSPayment + cost-tracking entities)

> PRE-REQUISITE for the Phase 1.0 build (commit 1 + commit 2 of LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL.md at f4e179f).
> Per DEC-093: schema changes happen via Base44 prompts, not manual dashboard edits.
> Per DEC-178: code-level schema changes ship paired with this prompt.
> Per DEC-162: explicit four-category confirmation expected. Apply scoped changes directly; report observations separately.
> **Please stay in discussion mode (DEC-144) until every section below is confirmed before applying.**

This prompt:
1. Adds `line_item_id` (string, nullable) to **FSPayment** — the attribution FK.
2. Adds `parent_payment_id` (string, nullable) to **FSPayment** — forward-compat for the Reverse flow per FINANCIAL-WORKFLOW-SPEC §3.2.5.
3. Adds `deleted_at` (datetime, nullable) and `deleted_by` (string, nullable) to **FSPayment**, **FSMaterialEntry**, **FSLaborEntry**, and **FSDailyLog** — soft-delete metadata.

No backfill required. Null defaults treat existing records as not-deleted and not-attributed. No fields renamed or removed; existing records work unchanged.

## Why

Two architectural threads ship as one Phase 1.0 build:

**Thread 2 (line-item attribution)** — FSPayment gains a nullable FK to a specific line item on the project's FSEstimate or any signed FSChangeOrder. When set, the payment contributes to that line's per-line rollup (Estimated / Billed / Cost / Variance). When null, it lives in an Unallocated bucket. This is the schema half of FINANCIAL-WORKFLOW-SPEC §3.2.5–§3.2.6's destination architecture, brought forward into Phase 1 so Patricia's contract (and every future estimate) tracks attribution from day one — no backfill at migration time.

**Thread 1 (edit/delete)** — All four cost-tracking entities gain `deleted_at` + `deleted_by` for soft-delete. Surfaced 2026-05-09 afternoon when a $810 test FSPayment record on Project Detail had no UI fix path (DEC-214 had deferred the edit form). Bari is in field this week; "tell me what to change and I'll fix it in admin" is not sustainable. Soft-delete preserves audit trail (DEC-218 half-done discipline — ship the full pattern), and reversibility ("undo" is possible).

`parent_payment_id` ships in the same prompt as forward-compat for the cleared-payment Reverse flow (commit 2). Cleared payments are immutable per the financial-layer architecture; the Reverse flow creates a negative-amount FSPayment with `parent_payment_id` set to the original — both records stay intact, net to zero.

## 1. FSPayment — add 4 fields

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| line_item_id | String | No | (none) | Nullable FK to a line item ID inside the project's FSEstimate.line_items or any signed FSChangeOrder.line_items. No FK enforcement at entity layer (line items live as JSON inside the estimate/CO; FK is application-level). When null, payment is "unallocated" — flows into the project-level Unallocated bucket per FINANCIAL-WORKFLOW-SPEC §3.2.5. |
| parent_payment_id | String | No | (none) | Nullable FK to another FSPayment record. Used by the cleared-payment Reverse flow (commit 2) — a reversing payment carries the original payment's ID here. Forward-compat with FINANCIAL-WORKFLOW-SPEC §3.2.5 destination architecture. |
| deleted_at | Date | No | (none) | Datetime stamp when the record was soft-deleted via the `softDeleteWithCascade` server function (commit 2). Null means the record is live. Excluded from default reads via `.filter()` chains; the `withAuditLog` server function captures the snapshot at delete time. |
| deleted_by | String | No | (none) | User ID (the `Users.id` value) of the user who soft-deleted the record. Captured for audit. |

## 2. FSMaterialEntry — add 2 fields

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| deleted_at | Date | No | (none) | Same semantic as `FSPayment.deleted_at`. Cascade-soft-deleted when the parent FSDailyLog is soft-deleted via `softDeleteWithCascade`. |
| deleted_by | String | No | (none) | Same semantic as `FSPayment.deleted_by`. |

## 3. FSLaborEntry — add 2 fields

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| deleted_at | Date | No | (none) | Same semantic as `FSPayment.deleted_at`. Cascade-soft-deleted when the parent FSDailyLog is soft-deleted. |
| deleted_by | String | No | (none) | Same semantic as `FSPayment.deleted_by`. |

## 4. FSDailyLog — add 2 fields

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| deleted_at | Date | No | (none) | Same semantic as `FSPayment.deleted_at`. When set, `softDeleteWithCascade` also soft-deletes child FSMaterialEntry and FSLaborEntry rows. |
| deleted_by | String | No | (none) | Same semantic as `FSPayment.deleted_by`. |

## After applying

Verify in the Base44 dashboard that:

- `FSPayment` now has `line_item_id`, `parent_payment_id`, `deleted_at`, `deleted_by` — all nullable, no defaults, no required flag.
- `FSMaterialEntry` now has `deleted_at`, `deleted_by` — both nullable.
- `FSLaborEntry` now has `deleted_at`, `deleted_by` — both nullable.
- `FSDailyLog` now has `deleted_at`, `deleted_by` — both nullable.
- No records lost or modified — entity browser row counts unchanged for all four entities.
- No existing fields renamed, removed, or had defaults changed.
- Permissions blocks unchanged for all four entities (DEC-215 — `rls.update` absence is load-bearing for `asServiceRole` writes; verify it's still absent on FSPayment).

## Permissions / RLS check (DEC-215 reminder)

The commit 2 build introduces two server functions (`withAuditLog`, `softDeleteWithCascade`) that perform `asServiceRole` writes against all four entities. Before approving the schema additions, verify that none of these four entities have `rls.update` re-introduced — DEC-215 requires `rls.update` to be ABSENT (not relaxed) for `asServiceRole` writes to land. The historical state per DECISIONS.md DEC-215:

- `FSPayment` — `rls.update` known PRESENT (KI #26 in ACTIVE-CONTEXT.md). Phase 2.4 left this untouched because no `asServiceRole` writes targeted FSPayment in that build. **For Phase 1.0 commit 2: `rls.update` MUST be removed from FSPayment** before `withAuditLog` server function can update it.
- `FSDailyLog`, `FSMaterialEntry`, `FSLaborEntry` — please verify the `rls.update` state on these three; if present, request removal before Phase 1.0 commit 2 ships.

If `rls.update` removal is needed on any entity, surface as a separate confirmation step, not bundled with the schema additions.

## Confirmation expected

Per DEC-162 four-category structure:

(a) **Scoped change applied** — what fields were added, and confirmation row counts unchanged.
(b) **Files read but not modified** — entity definitions consulted for context.
(c) **Out-of-scope observations** — anything noticed in other entities or settings.
(d) **Files consciously not touched** — explicit confirmation that other entity schemas were not modified.

After Doron applies this prompt and the schema is verified live, Hyphae proceeds with Phase 1.0 commit 1 code work (build sequence per LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL.md §14.1).
