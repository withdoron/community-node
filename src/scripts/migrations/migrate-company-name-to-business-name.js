#!/usr/bin/env node
// @ts-check
//
// PRE-CHECK: FieldServiceProfile rls.update must be ABSENT (DEC-215). Verify
// before --apply by running:
//   node src/scripts/migrations/_pre-migration-rls-audit.js FieldServiceProfile
//
/**
 * migrate-company-name-to-business-name.js
 * ------------------------------------------------------------
 * Phase 2.3 one-shot: rename `company_name` → `business_name` on every item
 * in every FieldServiceProfile.workers_json blob. Subcontractor records
 * carried company_name historically; Phase 2.3 makes business_name the
 * canonical field reused across subcontractor and vendor roles.
 *
 * Why a data migration: workers_json items are JSON blobs, not entity-level
 * fields, so a Base44 schema rename is a no-op. Each item must be rewritten.
 *
 * Run order:
 *   1. (Optional) Mycelia writes the Base44 agent prompt updating the
 *      workers_json schema description to reflect the post-Phase 2.3 shape.
 *      Description-only update; safe to land any time.
 *   2. Doron runs this script with --dry-run to preview the rename.
 *   3. Doron runs this script with --apply to execute the rename.
 *   4. Hyphae lands the code-side rename (FieldServicePeople.jsx +
 *      FieldServiceProjects.jsx) AFTER --apply succeeds.
 *
 * Idempotency: each profile gets one AuditLog row with action
 * 'company_name_renamed_to_business_name'. On re-run, the action skips
 * profiles already migrated. Profiles with no workers_json or empty arrays
 * still write an AuditLog row to mark them migrated.
 *
 * Edge case handling (in the server function):
 *   - Item has both company_name AND business_name → preserve business_name's
 *     existing value, drop company_name.
 *   - Item has company_name = '' → drop the empty company_name; do not write
 *     an empty business_name.
 *   - Item has no company_name field → untouched.
 *
 * Usage:
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/migrate-company-name-to-business-name.js            # dry-run
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/migrate-company-name-to-business-name.js --apply    # execute
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
  console.log(`\nmigrate-company-name-to-business-name ${banner}\n`);

  const payload = {
    action: 'migrate_company_name_to_business_name',
    dry_run: DRY_RUN,
  };

  const result = await callMigrationHelper(payload);

  if (DRY_RUN) {
    const planned = result.planned || {};
    console.log('Scanned FieldServiceProfile records: ', planned.scanned);
    console.log('Already migrated (skipped):          ', planned.already_migrated);
    console.log('Will migrate on --apply:             ', planned.will_migrate);
    console.log('Total items to rename across all WS: ', planned.total_items_changed);
    if (Array.isArray(planned.sample) && planned.sample.length > 0) {
      console.log('\nSample (first 10 profiles):');
      for (const s of planned.sample) {
        console.log(`  ${s.workspace_name || '(unnamed)'}  [${s.profile_id}]`);
        console.log(`    items: ${s.items_count}, will rename: ${s.changed_count}`);
        if (s.sample_change) {
          console.log(`    sample item before: ${JSON.stringify(s.sample_change.before)}`);
          console.log(`    sample item after:  ${JSON.stringify(s.sample_change.after)}`);
        }
      }
    }
    console.log('\nRe-run with --apply to execute.\n');
    return;
  }

  console.log('Scanned:                       ', result.scanned);
  console.log('Profiles migrated:             ', result.migrated);
  console.log('Already-migrated skipped:      ', result.already_migrated_skipped);
  console.log('Total workers_json items renamed:', result.total_items_renamed);
  if (Array.isArray(result.audit_log_ids)) {
    console.log(`AuditLog rows written:         ${result.audit_log_ids.length}`);
  }
  console.log('\nDone. Verify by opening any FieldServicePeople surface in Base44 Act-As-User preview.\n');
}

main().catch((err) => {
  console.error('migrate-company-name-to-business-name failed:', err.message || err);
  process.exit(1);
});
