#!/usr/bin/env node
// @ts-check
//
// PRE-CHECK: FieldServiceProfile rls.update must be ABSENT (DEC-215). Verify
// before --apply by running:
//   node src/scripts/migrations/_pre-migration-rls-audit.js FieldServiceProfile
//
/**
 * migrate-strip-primary-trade-id.js
 * ------------------------------------------------------------
 * Phase 2.5 rollback one-shot: remove the `primary_trade_id` field from
 * every item in every FieldServiceProfile.workers_json blob.
 *
 * Why: Phase 2.3 added `primary_trade_id` to workers_json items as a
 * workspace-current trade reference; Phase 2.5 used it to drive name-
 * bridged trade derivation on line items. Doron's workflow walkthrough
 * showed the single-trade-per-sub model fails across taxonomy switches
 * (Tony Tile maps to "Tile" in GC but no name match in CSI MasterFormat),
 * causing silent soft-fail to Unallocated. Phase 2.5 was rolled back in
 * 197805e; this migration removes the underlying data so contractors don't
 * see stale primary trades they can't act on.
 *
 * Per-item logic (server-side, in migrationHelpers): if `primary_trade_id`
 * key exists, destructure it out and persist the rest. Items without the
 * key untouched. Other fields unchanged.
 *
 * Idempotency: each profile gets one AuditLog row with action
 * 'workers_json_primary_trade_id_stripped'. On re-run, the action skips
 * profiles already migrated. Profiles with no workers_json or empty
 * arrays still write an AuditLog row to mark them migrated.
 *
 * Run order:
 *   1. Doron publishes Base44 (auto-syncs migrationHelpers/entry.ts from main).
 *   2. Doron runs dry-run with MIGRATION_SECRET set — surfaces planned strips.
 *   3. Doron reviews + runs --apply.
 *   4. MIGRATION_SECRET retired from Base44 Configured Secrets and local .env.
 *
 * Usage:
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/migrate-strip-primary-trade-id.js          # dry-run
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/migrate-strip-primary-trade-id.js --apply  # execute
 */

/* eslint-env node */
/* global process */

const BASE44_APP_ID = process.env.BASE44_APP_ID || '69308d4dd5ee90afc9b011d3';
const BASE44_BASE_URL = process.env.BASE44_BASE_URL || 'https://base44.app';
const MIGRATION_SECRET = process.env.MIGRATION_SECRET;

if (!MIGRATION_SECRET) {
  console.error('MIGRATION_SECRET env var required — set it in your local env to match the Base44 env var.');
  process.exit(1);
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const DRY_RUN = !APPLY;

// ── HTTP helper ──────────────────────────────────────────────────
async function callMigrationHelper(payload) {
  const url = `${BASE44_BASE_URL}/api/apps/${BASE44_APP_ID}/functions/migrationHelpers`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Migration-Secret': MIGRATION_SECRET,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  if (!res.ok) {
    const detail = parsed?.error || parsed?.raw || `HTTP ${res.status}`;
    throw new Error(`migrationHelpers call failed: ${detail}`);
  }
  return parsed;
}

// ── Run ──────────────────────────────────────────────────────────
async function main() {
  const banner = DRY_RUN ? '── DRY RUN — no writes ──' : '── APPLY — writing changes ──';
  console.log(`\nmigrate-strip-primary-trade-id ${banner}\n`);

  const payload = {
    action: 'strip_primary_trade_id',
    dry_run: DRY_RUN,
  };

  const result = await callMigrationHelper(payload);

  if (DRY_RUN) {
    const planned = result.planned || {};
    console.log('Scanned FieldServiceProfile records: ', planned.scanned);
    console.log('Already migrated (skipped):          ', planned.already_migrated);
    console.log('Will migrate on --apply:             ', planned.will_migrate);
    console.log('Total items with primary_trade_id key:', planned.total_items_with_field);
    console.log('  ...of which populated (non-empty): ', planned.total_items_with_populated_value);
    if (Array.isArray(planned.sample) && planned.sample.length > 0) {
      console.log('\nSample (first 10 profiles):');
      for (const s of planned.sample) {
        console.log(`  ${s.workspace_name || '(unnamed)'}  [${s.profile_id}]`);
        console.log(`    items: ${s.items_count}, with field: ${s.stripped_count}, populated: ${s.populated_count}`);
      }
    }
    console.log('\nRe-run with --apply to execute.\n');
    return;
  }

  console.log('Scanned:                             ', result.scanned);
  console.log('Profiles migrated:                   ', result.migrated);
  console.log('Already-migrated skipped:            ', result.already_migrated_skipped);
  console.log('Total items with field stripped:     ', result.total_items_with_field);
  console.log('  ...of which had populated values:  ', result.total_items_with_populated_value);
  if (Array.isArray(result.audit_log_ids)) {
    console.log(`AuditLog rows written:               ${result.audit_log_ids.length}`);
  }
  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error('migrate-strip-primary-trade-id failed:', err.message || err);
  process.exit(1);
});
