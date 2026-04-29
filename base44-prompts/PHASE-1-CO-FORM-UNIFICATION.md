# Phase 1 — CO form unification (FSChangeOrder calculated-lines fields)

> PRE-REQUISITE for the Phase 1 CO form unification commit.
> Per DEC-093: please apply these schema changes in the Base44 dashboard before/with the matching code push.
> Per DEC-178: code-level schema changes ship paired with this prompt.
> **Please stay in discussion mode until every section below is confirmed (DEC-144).**

This prompt:
1. Adds 4 calculated-line fields to **FSChangeOrder** so a CO carries the same percentage-based math as an FSEstimate (O&P, tax, tax_amount, other).

That's the entire scope. No new entities. No permission changes. No new server functions.

The CO is structurally a small estimate amending the original contract — the form, the math, and the percentages all mirror FSEstimate. After this prompt is applied, the matching code commit unifies the CO builder with the estimate builder, pre-fills the percentages from the parent estimate, and writes the full calculated total to `FSChangeOrder.amount` so the parent project's `total_budget` recompute (shipped in Phase 1 Item 2c) captures the full client-billed value of every signed CO — not just the line items subtotal.

---

## 1. FSChangeOrder — add 4 fields

Mirrors what already exists on FSEstimate. Field names match exactly (so `calcTotals` can read CO and Estimate records with the same code).

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| overhead_profit_pct | Number | No | 0 | Overhead & profit percentage applied to the line-items subtotal. Mirrors FSEstimate.overhead_profit_pct. The CO builder pre-fills this from the parent FSEstimate on CO create; the contractor can override per CO. |
| tax_rate | Number | No | 0 | Tax rate percentage applied after O&P + other. Mirrors FSEstimate.tax_rate. |
| tax_amount | Number | No | 0 | Computed tax dollar amount. Mirrors FSEstimate.tax_amount. |
| other_amount | Number | No | 0 | Flat dollar addition before tax. Mirrors FSEstimate.other_amount. |

Notes:
- These fields are nullable / default 0. Existing CO records work unchanged.
- The application code reads `co.overhead_profit_pct ?? 0` etc., so missing values render as zero.
- The CO field `amount` (which already exists) becomes the **full grand total** of the CO including these calculated lines — not just the line-items subtotal. This is canonical for the FSProject.total_budget recompute signal already shipped in `signChangeOrder`. The recompute reads `amount`, so signed COs that include O&P + tax now contribute their full client-billed value to the parent project's contract total.

---

## Confirmation

Please confirm:
- [ ] FSChangeOrder gets the 4 new fields (overhead_profit_pct, tax_rate, tax_amount, other_amount).
- [ ] No other changes.

That's it.
