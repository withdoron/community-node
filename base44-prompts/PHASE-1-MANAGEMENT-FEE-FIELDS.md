# Phase 1 Polish — Management Fee fields on FSEstimate + FSChangeOrder

> PRE-REQUISITE for the Phase 1 Polish "Resurrect Management Fee" build.
> Per DEC-093: schema changes happen via Base44 prompts, not manual dashboard edits.
> Per DEC-178: code-level schema changes ship paired with this prompt.
> **Please stay in discussion mode until every section below is confirmed (DEC-144).**

This prompt:
1. Adds `management_fee_amount` to **FSEstimate**. (`management_fee_pct` already exists.)
2. Adds `management_fee_pct` AND `management_fee_amount` to **FSChangeOrder**.
3. Nothing destructive. No fields renamed or removed. Existing records work unchanged — defaults are 0 so absent values render as no fee.

## Why

A general contractor charging to manage projects (subcontractor coordination, scheduling, oversight) needs a Management Fee line on estimates and change orders that's distinct from O&P. O&P is the standard line on insurance/Xactimate scopes and stays exactly as-is. Management Fee is the GC-mode equivalent — different concept, different surface, independent toggle in Settings. The two coexist; a contractor can enable one, the other, both, or neither. Math is identical structure: percentage applied to line-items subtotal, never stacks on top of the other calculated lines.

## 1. FSEstimate — add 1 field

`management_fee_pct` already exists on FSEstimate per the .jsonc reference (committed previously). Please add the matching amount field.

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| management_fee_amount | Number | No | 0 | Computed management fee dollar amount = `subtotal * (management_fee_pct / 100)`. Persisted on save so render surfaces don't have to re-derive. Distinct from `overhead_profit_pct` / O&P, which addresses insurance-work scopes. |

## 2. FSChangeOrder — add 2 fields

Mirror what's on FSEstimate so the CO builder can pre-fill from the parent estimate's value and the parent project's `total_budget` recompute reads the full grand total of the signed CO (which includes the fee).

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| management_fee_pct | Number | No | 0 | Management fee percentage applied to subtotal. Mirrors `FSEstimate.management_fee_pct`. Pre-filled from the parent FSEstimate on CO create; editable per CO. |
| management_fee_amount | Number | No | 0 | Computed management fee dollar amount = `subtotal * (management_fee_pct / 100)`. Mirrors `FSEstimate.management_fee_amount`. |

## After applying

Verify in the Base44 dashboard that:

- `FSEstimate.management_fee_pct` is unchanged (already present, type number, default 0).
- `FSEstimate.management_fee_amount` exists (type number, default 0).
- `FSChangeOrder.management_fee_pct` exists (type number, default 0).
- `FSChangeOrder.management_fee_amount` exists (type number, default 0).
- No records were lost or modified — the entity browser shows the same row counts.

Then in the application:

- Open Settings → Workspace Features. Confirm the Management Fee toggle appears above Overhead & Profit (O&P), defaulted off.
- Toggle Management Fee on. Open Estimates → New Estimate. Confirm a Management Fee % input appears above the O&P input.
- Set Management Fee to 25%, leave O&P off. Add a $1000 line item. Total should be $1250.
- Save the estimate, accept it, create a project. Open the project's Change Orders → New Change Order. Confirm management_fee_pct pre-fills from the parent estimate.
- Add a $400 sub line item. Confirm Total = $500. Override to 10%, sign, refresh. Confirm Project Detail Budget = original_budget + the CO's full amount including management fee.
- Toggle O&P on alongside Management Fee. New estimate with $1000 line item. Confirm both lines render separately, each calculated against subtotal-only (each is 25% / 10% of $1000, not stacked).
