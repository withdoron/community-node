# Phase 1 Polish — Deprecate legacy top-level feature flag fields on FieldServiceProfile

> OPTIONAL paired prompt for the code-side fix (community-node commit that consolidates feature-flag reads through `@/utils/fsFeatures`).
> Per DEC-093: schema changes happen via Base44 prompts, not manual dashboard edits.
> Per DEC-178: this prompt complements code that has already shipped — runnable on Doron's schedule, not a blocker.
> **Please stay in discussion mode until every section below is confirmed (DEC-144).**

## Context

FieldServiceProfile historically stored some feature flags as top-level boolean fields. The canonical location moved to a single `features_json` object blob — Settings UI writes only to `features_json`, the new `@/utils/fsFeatures` helper reads only from `features_json`, and profile initialization seeds only `features_json`. The top-level fields are no longer read or written anywhere in the application code.

This prompt removes the orphaned top-level fields from the schema. Doing this is **purely additive cleanup** — by the time this prompt runs, the live application has already stopped touching these fields.

**Important:** Run the corresponding application changes first, confirm dogfood-test passes for the O&P / Xactimate gating, and only then apply this schema change. If for any reason the application is rolled back, this schema change should be rolled back too.

## Affected fields (all on FieldServiceProfile)

| Field Name | Current State | Action |
|---|---|---|
| `overhead_profit_enabled` | Top-level boolean, default `false`. Replaced by `features_json.overhead_profit_enabled`. | Remove. |
| `xactimate_enabled` | Top-level boolean (if present in your schema). Replaced by `features_json.xactimate_enabled`. | Remove if present; skip if not. |
| `insurance_work_enabled` | Top-level boolean, marked `DEPRECATED` in schema description. Was the legacy combined toggle for O&P + Xactimate. The application's `getFeatures()` helper migrates `insurance_work_enabled === true` → `overhead_profit_enabled = true` AND `xactimate_enabled = true` on read. | Remove. |

Anything else (workers_json, phase_labels, trade_categories_json, etc.) is unaffected and should remain as-is.

## Pre-flight check

Before removing any field, please confirm:

1. **No active records depend on the removed field for state that's not also captured elsewhere.** For `insurance_work_enabled`, the application's read-time migration (`getFeatures()`) covers existing data — but only if it has been called at least once on each profile. Any profile that hasn't loaded Settings since the migration helper was added still has only the legacy flag. If you want a safety net, run a one-shot Hyphae script that pre-applies the migration: for every FieldServiceProfile where `insurance_work_enabled === true` and `features_json.overhead_profit_enabled !== true`, set `features_json.overhead_profit_enabled = true` and `features_json.xactimate_enabled = true`. Doron can also skip this — the read-time migration is idempotent and self-healing.

2. **No external integrations or agent-layer reads consult these top-level fields.** Search the Base44 agent configurations and any external integration scripts for the literal field names `overhead_profit_enabled`, `xactimate_enabled`, `insurance_work_enabled` outside of `features_json` access. None expected, but worth a check before removing.

## Action

Remove these three properties from the FieldServiceProfile schema:

- `overhead_profit_enabled`
- `xactimate_enabled` (if present)
- `insurance_work_enabled`

Leave `features_json` (the canonical blob) and all other fields intact.

## After applying

Verify in the Base44 dashboard that:

- FieldServiceProfile.features_json still exists, with type `object` and default `{}`.
- The three top-level fields are gone from the schema editor.
- No records were lost — the entity browser shows the same row count.

Then in the application:

- Open Settings for any FS workspace, confirm all toggles render with their current state intact.
- Toggle O&P off and on, confirm the state persists across navigation.
- Toggle Xactimate, confirm Trade Categories section appears/disappears.
- Open a Change Order, confirm the O&P input renders/hides based on the toggle.

If anything looks wrong, the schema change is reversible — re-add the fields with their original defaults. The application code does not depend on them existing, so re-adding is also a no-op for code behavior.
