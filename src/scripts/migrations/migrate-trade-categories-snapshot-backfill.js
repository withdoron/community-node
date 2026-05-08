#!/usr/bin/env node
// @ts-check
//
// PRE-CHECK: FSEstimate rls.update must be ABSENT (DEC-215). Verify before --apply.
//
/**
 * migrate-trade-categories-snapshot-backfill.js
 * ------------------------------------------------------------
 * Phase 2.2 backfill: populate trade_categories_snapshot on every existing
 * FSEstimate from its workspace's current trade_categories_json. Run AFTER
 * migrate-flat-layout-rename has landed.
 *
 * Why: before this migration, render-time reads fall back to the workspace
 * working list whenever an estimate has no snapshot. That works for legacy
 * estimates but means workspace mutations (Settings → Trade Categories edit)
 * retroactively affect their render shape. The whole point of Phase 2.2 is
 * the snapshot freezing the estimate's identity. Backfilling brings every
 * existing record into the new architecture: each estimate gets the workspace's
 * current category list frozen as its snapshot.
 *
 * Resolution per record:
 *   1. Look up the estimate's profile_id → FieldServiceProfile.
 *   2. Resolve workspace's trade_categories_json into [{id, name, order}, ...].
 *      Handles all three legacy shapes (plain string array, {items: [...]} wrap,
 *      already-resolved array).
 *   3. If the workspace has no list, fall back to the platform 18-default seed.
 *      Counter `backfilled_from_default` surfaces this case.
 *   4. Write the resolved array as trade_categories_snapshot.
 *   5. AuditLog row with source='backfill', action='trade_categories_snapshot_backfilled'.
 *
 * Edge cases:
 *   - Orphaned FSEstimate (no FieldServiceProfile): skipped, surfaced in
 *     `orphaned_skipped` counter. Don't block the run.
 *   - Existing snapshot present: skipped via AuditLog idempotency (so re-runs
 *     after partial failures pick up where they left off).
 *
 * Run order:
 *   1. migrate-flat-layout-rename --dry-run / --apply (must complete first).
 *   2. THIS script --dry-run.
 *   3. THIS script --apply.
 *
 * Idempotency: AuditLog action 'trade_categories_snapshot_backfilled'.
 * Safe to re-run.
 *
 * Usage:
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/migrate-trade-categories-snapshot-backfill.js            # dry-run
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/migrate-trade-categories-snapshot-backfill.js --apply    # execute
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

async function main() {
  const banner = DRY_RUN ? '── DRY RUN — no writes ──' : '── APPLY — writing changes ──';
  console.log(`\nmigrate-trade-categories-snapshot-backfill ${banner}\n`);

  const payload = {
    action: 'backfill_trade_categories_snapshot',
    dry_run: DRY_RUN,
  };

  const result = await callMigrationHelper(payload);

  if (DRY_RUN) {
    const planned = result.planned || {};
    console.log('Scanned FSEstimate records:', planned.scanned);
    console.log('Already migrated (skipped):', planned.already_migrated);
    console.log('Will backfill on --apply:  ', planned.will_backfill);
    console.log('Orphaned (no profile):     ', planned.orphaned_skipped);
    console.log('From default 18-trade seed:', planned.backfilled_from_default);
    if (Array.isArray(planned.sample) && planned.sample.length > 0) {
      console.log('\nSample (first 5 records):');
      for (const s of planned.sample) {
        const flag = s.orphaned ? ' [ORPHANED — skipped]' : (s.used_default ? ' [from default seed]' : '');
        console.log(`  ${s.estimate_number || s.id}  ${s.title || ''}${flag}`);
        if (!s.orphaned) {
          console.log(`    profile_id: ${s.profile_id}, snapshot_size: ${s.snapshot_size} categories`);
        }
      }
    }
    console.log('\nRe-run with --apply to execute.\n');
    return;
  }

  console.log('Scanned:                       ', result.scanned);
  console.log('Backfilled:                    ', result.backfilled);
  console.log('Already-migrated skipped:      ', result.already_migrated_skipped);
  console.log('Orphaned skipped:              ', result.orphaned_skipped);
  console.log('From default 18-trade seed:    ', result.backfilled_from_default);
  if (Array.isArray(result.audit_log_ids)) {
    console.log(`AuditLog rows written:         ${result.audit_log_ids.length}`);
  }
  console.log('\nDone. Verify by opening any FSEstimate in Base44 Act-As-User preview.\n');
}

main().catch((err) => {
  console.error('migrate-trade-categories-snapshot-backfill failed:', err.message || err);
  process.exit(1);
});
