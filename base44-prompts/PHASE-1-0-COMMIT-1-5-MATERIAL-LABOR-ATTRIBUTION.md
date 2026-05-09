# Phase 1.0 commit 1.5 — line-item attribution on FSMaterialEntry + FSLaborEntry

> PRE-REQUISITE for the Phase 1.0 commit 1.5 build (per LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL.md §13.6 at 4d6c0fb).
> Per DEC-093: schema changes happen via Base44 prompts, not manual dashboard edits.
> Per DEC-178: code-level schema changes ship paired with this prompt.
> Per DEC-162: explicit four-category confirmation expected. Apply scoped changes directly; report observations separately.
> **Please stay in discussion mode (DEC-144) until every section below is confirmed before applying.**

This prompt:
1. Adds `line_item_id` (string, nullable) to **FSMaterialEntry**.
2. Adds `line_item_id` (string, nullable) to **FSLaborEntry**.

No backfill required. Null defaults treat existing material/labor entries as not-attributed — they flow into the project-level Unallocated bucket on the per-line rollup view shipped in commit 1 (04162a8). No fields renamed or removed; existing records work unchanged.

## Why

Phase 1.0 commit 1 shipped `line_item_id` on FSPayment so Sub Payment + Client Payment forms could attribute payments to a specific contract line. Commit 1 walkthrough surfaced asymmetry: Material entry rows + Labor entry rows in Daily Log section had no equivalent picker. Doron's framing: "Anything log should get attributed whether that be a sub payment or a material or labor log. Otherwise, what good is capturing it if it doesn't show the connection?"

Per-row attribution on each FSMaterialEntry and each FSLaborEntry is the architecturally correct shape. Each row is a discrete cost record:
- A 2x4 lumber purchase IS one line item
- A specific labor hour entry IS one piece of work
- Each FSMaterialEntry / FSLaborEntry already has its own database row connected to FSDailyLog (via daily_log_id) and FSProject (via project_id)

Adding `line_item_id` to each follows the same shape as FSPayment.line_item_id from commit 1. The frontend reuses commit 1's primitives (`<LineItemPicker>` component, `useContractLineItems` hook) — no new architecture, just two new consumer surfaces.

This patch does NOT introduce per-day inheritance on FSDailyLog. The "FSDailyLog primary_line_item_id with row override" pattern is intentionally NOT shipping per §13.6 — per-row attribution covers all real cases without inheritance, and inheritance would encourage default-attribution that's wrong by default if a day spans multiple work areas.

## 1. FSMaterialEntry — add 1 field

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| line_item_id | String | No | (none) | Nullable FK to a line item ID inside the project's FSEstimate.line_items or any signed FSChangeOrder.line_items. No FK enforcement at entity layer (line items live as JSON inside the estimate/CO; FK is application-level). When null, material entry is "unallocated" — flows into the project-level Unallocated bucket per LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL §13.6. Same semantic as FSPayment.line_item_id from commit 1 (Phase 1.0). |

## 2. FSLaborEntry — add 1 field

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| line_item_id | String | No | (none) | Nullable FK to a line item ID inside the project's FSEstimate.line_items or any signed FSChangeOrder.line_items. No FK enforcement at entity layer. When null, labor entry is "unallocated" — flows into the project-level Unallocated bucket. Same semantic as FSPayment.line_item_id and FSMaterialEntry.line_item_id. |

## After applying

Verify in the Base44 dashboard that:

- `FSMaterialEntry` now has `line_item_id` (type String, nullable, no required flag, no default).
- `FSLaborEntry` now has `line_item_id` (type String, nullable, no required flag, no default).
- All other fields on both entities unchanged. `deleted_at` and `deleted_by` (added in commit 1's Gate 1) still present.
- No records lost or modified — entity browser row counts unchanged for both entities.
- No existing fields renamed, removed, or had defaults changed.
- Permissions blocks unchanged for both entities.

## RLS / Security check (no change expected)

Per commit 1 Gate 1 audit, neither FSMaterialEntry nor FSLaborEntry needed `rls.update` removal because commit 1 had no `asServiceRole` writes against them. Commit 1.5 ALSO does not introduce any `asServiceRole` writes against these entities — the new `line_item_id` field is written by client-side write paths (FieldServiceLog.jsx materials/labor save handlers), same as existing `description` / `quantity` / `unit_cost` / `total_cost` writes.

Commit 2's `softDeleteWithCascade` server function will need `rls.update` removal on both entities (KI #28 territory, blocked on Base44 platform issue). That work is independent of commit 1.5 and stays gated.

## Confirmation expected

Per DEC-162 four-category structure:

(a) **Scoped change applied** — `line_item_id` added to FSMaterialEntry and FSLaborEntry, confirmation row counts unchanged.
(b) **Files read but not modified** — entity definitions consulted for context.
(c) **Out-of-scope observations** — anything noticed in other entities or settings.
(d) **Files consciously not touched** — explicit confirmation that other entity schemas were not modified, including FSPayment (which already has line_item_id from commit 1).

After Doron applies this prompt and the schema is verified live, Hyphae proceeds with Phase 1.0 commit 1.5 code work (Material/Labor LineItemPicker integration + per-line rollup view expansion per spec §13.6).
