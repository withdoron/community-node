#!/usr/bin/env node
// @ts-check
/**
 * migrate-flat-layout-inversion.js
 * ------------------------------------------------------------
 * Phase 2.1 one-shot: invert flat_layout values on every FSEstimate after
 * the Base44 field rename from is_insurance_estimate → flat_layout.
 *
 * Pre-rename, is_insurance_estimate=true meant "trade-grouped" and false
 * meant "flat." Base44's native rename preserves values, so post-rename
 * flat_layout=true still semantically means "was grouped." After this
 * script runs, flat_layout=true means "render flat" and flat_layout=false
 * (the platform default) means "trade-grouped." Code in
 * src/components/fieldservice/FieldServiceEstimates.jsx + src/pages/
 * ClientPortal.jsx already reads the new semantic.
 *
 * Run order:
 *   1. Mycelia writes the Base44 agent prompt for the schema rename.
 *   2. Doron applies the Base44 prompt → Base44 renames the field, preserves values.
 *   3. Doron runs this script with --dry-run to preview the inversion.
 *   4. Doron runs this script with --apply to invert all records.
 *   5. Doron pushes the new code (already merged on main).
 *
 * Idempotency: the migrationHelpers action looks up prior AuditLog rows
 * with action='flat_layout_inverted' and skips any FSEstimate already
 * migrated. Safe to re-run.
 *
 * Usage:
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/migrate-flat-layout-inversion.js            # dry-run
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/migrate-flat-layout-inversion.js --apply    # execute
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
  console.log(`\nmigrate-flat-layout-inversion ${banner}\n`);

  const payload = {
    action: 'migrate_flat_layout_inversion',
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
        console.log(`    flat_layout: ${s.old_flat_layout} → ${s.new_flat_layout}`);
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
  console.log('\nDone. Verify by opening any FSEstimate in Base44 Act-As-User preview.\n');
}

main().catch((err) => {
  console.error('migrate-flat-layout-inversion failed:', err.message || err);
  process.exit(1);
});
