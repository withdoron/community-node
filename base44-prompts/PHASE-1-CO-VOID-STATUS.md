# Phase 1 — Change Order Void status (FSChangeOrder + voidChangeOrder server function)

> PRE-REQUISITE for community-node Phase 1 polish bundle (CO Delete/Void).
> Per DEC-093: please apply these schema changes in the Base44 dashboard before/with the matching code push.
> Per DEC-178: code-level schema changes ship paired with this prompt.
> **Please stay in discussion mode until every section below is confirmed (DEC-144).**

This prompt:

1. Adds a new `voided` value to the **FSChangeOrder** `status` enum.
2. Adds two new optional fields to **FSChangeOrder** to capture the void event.
3. Creates a new server function **`voidChangeOrder`** that mirrors `signChangeOrder`'s pattern — marks a CO voided and recomputes the parent project's `total_budget` to exclude the voided record.

Nothing destructive. No fields renamed or removed. No existing records modified. Existing CO statuses (`draft`, `sent`, `awaiting_signature`, `signed`, `accepted`, `declined`) are untouched.

---

## 1. FSChangeOrder — extend status enum

Add `voided` to the existing `status` enum.

**Current values:** `draft`, `sent`, `accepted`, `awaiting_signature`, `signed`, `declined`
**Add:** `voided`
**New full enum:** `draft`, `sent`, `accepted`, `awaiting_signature`, `signed`, `declined`, `voided`

Default stays `draft`. No existing records are migrated — `voided` only gets written when a contractor explicitly voids a signed/accepted CO via the new UI flow.

Description (replace the existing `status` description):
```
The lifecycle state of this change order. Mirrors FSEstimate.status pattern. Transitions: draft → sent → awaiting_signature → signed | declined. Signed/accepted COs can later transition to 'voided' (see voidChangeOrder server function). Legacy 'accepted' value preserved for existing records. Voided COs stay in the database for audit but are excluded from FSProject.total_budget recompute math.
```

---

## 2. FSChangeOrder — add 2 fields

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| voided_at | Text (datetime ISO string) | No | — | ISO datetime when the CO was voided. Set when status transitions to `voided`. Null otherwise. |
| voided_reason | Text | No | — | Optional contractor-supplied reason for voiding. Surfaced in audit trails; not shown to client. |

Both fields are nullable. Existing CO records work unchanged.

---

## 3. Create server function — `voidChangeOrder`

Create a new server function called **`voidChangeOrder`** (camelCase, exact spelling — the client code calls `base44.functions.invoke('voidChangeOrder', ...)`).

Mirrors the existing `signChangeOrder` function pattern. Code lives in `community-node/base44/functions/voidChangeOrder/entry.ts` and will sync from GitHub on the next publish (per DEC-113).

Behavior:

1. Accept `{ change_order_id, reason }` from the request body. `reason` is optional.
2. Validate `change_order_id` is present.
3. Fetch the CO via `asServiceRole.entities.FSChangeOrder.get(change_order_id)`.
4. Verify status is `'signed'` or `'accepted'` (the only voidable states — drafts get hard-deleted client-side, awaiting_signature gets recalled).
5. Update the CO: `status: 'voided'`, `voided_at: now`, `voided_reason: reason || null`, `portal_link_active: false`.
6. **Recompute parent project's `total_budget`:** fetch all COs for the same `project_id`, filter to `status === 'signed'` (this naturally excludes the just-voided record + any other voided/draft/declined COs), sum their `amount` field (fall back to `total` for legacy COs without `amount`), add to `original_budget`, write back to FSProject via `asServiceRole`.
7. Return `{ success: true, change_order: updatedCO }`.

The exact source code is in the GitHub repo at `base44/functions/voidChangeOrder/entry.ts`. The Base44 publish step picks it up from there (DEC-113).

---

## 4. Permissions — already in place

No permission changes needed:

- **FSChangeOrder Update:** already "No restrictions" (set in PHASE-1-ITEM-2C-CO-SIGNING-FLOW.md). The new `voidChangeOrder` server function uses `asServiceRole` exactly like `signChangeOrder`.
- **FSProject Update:** already "No restrictions" (same prompt). The `total_budget` recompute uses the same write path as the signing flow.

The security boundary stays at the function level (DEC-140 pattern) — only authenticated contractors can hit this function from the app, and the function validates the CO is in a voidable state before any update.

---

## Why void instead of delete

Per [FINANCIAL-WORKFLOW-SPEC.md](../Spec-Repo/spaces/field-service/FINANCIAL-WORKFLOW-SPEC.md) §2.1 (estimate as project spine, signed COs as amendments) and §2.4 (layer-aware tracking): a signed CO is a legal artifact. Hard-deleting it leaves a gap in the contract trail. Voiding preserves the record (who signed, when, what for) while removing it from the active contract math. The client portal renders voided COs visibly as voided so the client sees what happened — they're not erased from history, they're marked as undone.

Drafts have no legal weight, so they hard-delete via `FSChangeOrder.delete()` directly from the client (no server function needed). Awaiting-signature COs use the existing recall flow (already shipped) to return them to draft, then delete if needed.
