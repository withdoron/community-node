#!/usr/bin/env node
// @ts-check
//
// PRE-CHECK: FieldServiceProfile rls.update must be ABSENT (DEC-215). Verify
// before --apply by running:
//   node src/scripts/migrations/_pre-migration-rls-audit.js FieldServiceProfile
//
/**
 * migrate-add-workers-json-ids.js
 * ------------------------------------------------------------
 * Phase 2.4 §0a one-shot: backfill stable `id` field on every item in every
 * FieldServiceProfile.workers_json blob.
 *
 * Why: Architecture proposal Approach A's data shape included `id: string`
 * on workers_json items. Phase 2.3 implementation overlooked it — items
 * shipped without ids. Phase 2.4's <SubVendorPicker> writes
 * `sub_person_id` (line items) and `party_id` (FSPayment, sub/vendor
 * branch) — both require stable ids on workers_json items. Without this
 * backfill, the picker has no stable reference target.
 *
 * Per-item logic (server-side, in migrationHelpers): if `id` is missing
 * OR empty string, assign `worker_${Date.now()}_${counter}`. Items with
 * an existing id are left untouched (defensive — in case quick-add
 * writes ids between dry-run and apply).
 *
 * Idempotency: each profile gets one AuditLog row with action
 * 'workers_json_ids_backfilled'. On re-run, the action skips profiles
 * already migrated. Profiles with no workers_json or empty arrays still
 * write an AuditLog row to mark them migrated.
 *
 * Run order:
 *   1. Doron publishes Base44 (auto-syncs migrationHelpers/entry.ts from main).
 *   2. Doron runs dry-run with MIGRATION_SECRET set — surfaces planned ids.
 *   3. Doron reviews + runs --apply.
 *   4. Hyphae's §1+§2+§3 picker integration ships AFTER --apply succeeds.
 *
 * Usage:
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/migrate-add-workers-json-ids.js            # dry-run
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/migrate-add-workers-json-ids.js --apply    # execute
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
  console.log(`\nmigrate-add-workers-json-ids ${banner}\n`);

  const payload = {
    action: 'add_workers_json_ids',
    dry_run: DRY_RUN,
  };

  const result = await callMigrationHelper(payload);

  if (DRY_RUN) {
    const planned = result.planned || {};
    console.log('Scanned FieldServiceProfile records: ', planned.scanned);
    console.log('Already migrated (skipped):          ', planned.already_migrated);
    console.log('Will migrate on --apply:             ', planned.will_migrate);
    console.log('Total items receiving fresh ids:     ', planned.total_items_assigned);
    if (Array.isArray(planned.sample) && planned.sample.length > 0) {
      console.log('\nSample (first 10 profiles):');
      for (const s of planned.sample) {
        console.log(`  ${s.workspace_name || '(unnamed)'}  [${s.profile_id}]`);
        console.log(`    items: ${s.items_count}, will assign: ${s.assigned_count}`);
        if (s.sample_assignment) {
          console.log(`    sample item: name="${s.sample_assignment.name}" → id="${s.sample_assignment.id}"`);
        }
      }
    }
    console.log('\nRe-run with --apply to execute.\n');
    return;
  }

  console.log('Scanned:                       ', result.scanned);
  console.log('Profiles migrated:             ', result.migrated);
  console.log('Already-migrated skipped:      ', result.already_migrated_skipped);
  console.log('Total workers_json items assigned ids:', result.total_items_assigned);
  if (Array.isArray(result.audit_log_ids)) {
    console.log(`AuditLog rows written:         ${result.audit_log_ids.length}`);
  }
  console.log('\nDone. New workers_json items will receive ids client-side via newWorkerId().\n');
}

main().catch((err) => {
  console.error('migrate-add-workers-json-ids failed:', err.message || err);
  process.exit(1);
});
