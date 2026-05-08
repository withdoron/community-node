#!/usr/bin/env node
// @ts-check
//
// PRE-CHECK: FSEstimate rls.update must be ABSENT (DEC-215). Verify before --apply.
//
/**
 * migrate-flat-layout-rename.js
 * ------------------------------------------------------------
 * Phase 2.2 one-shot: invert group_by_trade values on every FSEstimate after
 * the Base44 field rename from flat_layout → group_by_trade.
 *
 * Pre-rename, flat_layout=true meant "render flat" and false meant "trade-
 * grouped" (Phase 2.1 semantic). Base44's native rename preserves values, so
 * post-rename group_by_trade still carries the OLD flat_layout semantic until
 * this script runs. After --apply, group_by_trade=true means "trade-grouped"
 * (the new platform default) and group_by_trade=false means "render flat."
 * Code in src/components/fieldservice/FieldServiceEstimates.jsx and
 * src/pages/ClientPortal.jsx already reads the new semantic; the visible
 * outcome on every existing estimate is preserved by the inversion.
 *
 * Run order:
 *   1. Mycelia writes the Base44 agent prompt for the schema rename + new fields.
 *   2. Doron applies the Base44 prompt → Base44 renames + adds the new fields, preserves values.
 *   3. Hyphae ships code with new semantic + helper extensions (commit 44a3866 onward).
 *   4. Doron runs this script with --dry-run to preview the inversion.
 *   5. Doron runs this script with --apply to invert all records.
 *   6. Doron runs migrate-trade-categories-snapshot-backfill --dry-run / --apply (next migration).
 *
 * Idempotency: the migrationHelpers action looks up prior AuditLog rows
 * with action='flat_layout_renamed_to_group_by_trade' and skips any
 * FSEstimate already migrated. Safe to re-run.
 *
 * Usage:
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/migrate-flat-layout-rename.js            # dry-run
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/migrate-flat-layout-rename.js --apply    # execute
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
  console.log(`\nmigrate-flat-layout-rename ${banner}\n`);

  const payload = {
    action: 'migrate_flat_layout_rename',
    dry_run: DRY_RUN,
  };

  const result = await callMigrationHelper(payload);

  if (DRY_RUN) {
    const planned = result.planned || {};
    console.log('Scanned FSEstimate records:', planned.scanned);
    console.log('Already migrated (skipped):', planned.already_migrated);
    console.log('Will invert on --apply:    ', planned.will_invert);
    if (Array.isArray(planned.sample) && planned.sample.length > 0) {
      console.log('\nSample (first 5 records to be inverted):');
      for (const s of planned.sample) {
        console.log(`  ${s.estimate_number || s.id}  ${s.title || ''}`);
        console.log(`    group_by_trade: ${s.old_group_by_trade} → ${s.new_group_by_trade}`);
      }
    }
    console.log('\nRe-run with --apply to execute.\n');
    return;
  }

  console.log('Scanned:                   ', result.scanned);
  console.log('Inverted:                  ', result.inverted);
  console.log('Already-migrated skipped:  ', result.already_migrated_skipped);
  if (Array.isArray(result.audit_log_ids)) {
    console.log(`AuditLog rows written:     ${result.audit_log_ids.length}`);
  }
  console.log('\nDone. Next: migrate-trade-categories-snapshot-backfill --dry-run.\n');
}

main().catch((err) => {
  console.error('migrate-flat-layout-rename failed:', err.message || err);
  process.exit(1);
});
