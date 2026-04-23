#!/usr/bin/env node
// @ts-check
/**
 * phase-2-production-migration.js
 * ------------------------------------------------------------
 * Round 1 Phase 2 — Reparenting + Promotion + Legacy Marking.
 *
 * Steps (in order):
 *   1. Create Mycelia, LLC              (hidden parent)
 *   2. Create LocalLane                 (exempt, parent = Mycelia)
 *   3. Create TCA (The Camel Academy)   (listed, parent = Mycelia)
 *   4. Reparent existing Recess         (parent_business_id = Mycelia)
 *   5. Archive Doron's test FS sandbox  (FieldServiceProfile 69b6c265746397cbf8e184f3)
 *   6. Promote Bari's FS profile        (create Red Umbrella Business + link business_id)
 *   7. Mark Bari's User is_legacy_user
 *   8. Mark Dan Sikes' User is_legacy_user (if a User record exists)
 *
 * Consulting with Doron is intentionally NOT seeded in Phase 2 — Doron will
 * create it himself via the live onboarding flow once the business switcher ships.
 *
 * Auth: server functions are gated by a shared MIGRATION_SECRET passed in the
 * `X-Migration-Secret` header. The server functions use asServiceRole for all
 * privileged operations. No admin-role assumption is made on the caller.
 *
 * Usage:
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/phase-2-production-migration.js            # dry-run
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/phase-2-production-migration.js --apply    # execute
 *
 * Every mutation writes an AuditLog row (user_id = Doron, source = migration).
 * Re-running is idempotent — each server function short-circuits with
 * `skipped: true` when the record is already in the target state.
 */

/* eslint-env node */

const BASE44_APP_ID = process.env.BASE44_APP_ID || '69308d4dd5ee90afc9b011d3';
const BASE44_BASE_URL = process.env.BASE44_BASE_URL || 'https://base44.app';
const MIGRATION_SECRET = process.env.MIGRATION_SECRET;

if (!MIGRATION_SECRET) {
  console.error('MIGRATION_SECRET env var required — set it in your local .env to match the Base44 env var.');
  process.exit(1);
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const DRY_RUN = !APPLY;

// ── Known IDs from MANIFEST-2026-04-22 ────────────────────────────
const IDS = {
  doron_user: '69308d4dd5ee90afc9b011d4',
  bari_user: '69b9f8313b41521cc50c97d8',
  recess_business: '699e0d3deb3cfa670a28b275',
  dan_sikes_business: '69a4e71dd93737b9a46b0e23',
  dan_email: 'dannysikes.1@gmail.com',
  bari_fs_profile: '69baba55a6b9cca0c7d5700b',
  doron_test_sandbox_fs_profile: '69b6c265746397cbf8e184f3',
};

/* ------------------------------------------------------------------ */
/* HTTP helper                                                         */
/* ------------------------------------------------------------------ */

async function invoke(fnName, payload) {
  const url = `${BASE44_BASE_URL}/api/apps/${BASE44_APP_ID}/functions/${fnName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-migration-secret': MIGRATION_SECRET,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) {
    const errMsg = body?.error || body?.raw || res.statusText;
    const err = new Error(`${fnName} ${res.status}: ${errMsg}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

async function stepCreateMycelia(dryRun) {
  const fields = {
    name: 'Mycelia, LLC',
    legal_name: 'Mycelia, LLC',
    display_name: 'Mycelia',
    owner_user_id: IDS.doron_user,
    owner_email: 'doron.bsg@gmail.com',
    email: 'doron.bsg@gmail.com',
    tagline: 'Holding company for the LocalLane ecosystem',
    listed_in_directory: false,
    subscription_exempt: true,
    subscription_tier: null,
    is_active: true,
    parent_business_id: null,
  };
  return invoke('migrationHelpers', {
    action: 'create_business',
    fields,
    idempotency_key: 'phase-2-mycelia-llc',
    dry_run: dryRun,
  });
}

async function stepCreateLocalLane(dryRun, myceliaId) {
  const fields = {
    name: 'LocalLane',
    legal_name: 'LocalLane',
    display_name: 'LocalLane',
    owner_user_id: IDS.doron_user,
    owner_email: 'doron.bsg@gmail.com',
    email: 'hello@locallane.app',
    tagline: 'The garden.',
    listed_in_directory: true,
    subscription_exempt: true,
    subscription_tier: null,
    is_active: true,
    parent_business_id: myceliaId,
  };
  return invoke('migrationHelpers', {
    action: 'create_business',
    fields,
    idempotency_key: 'phase-2-locallane',
    dry_run: dryRun,
  });
}

async function stepCreateTCA(dryRun, myceliaId) {
  const fields = {
    name: 'The Camel Academy',
    legal_name: 'The Camel Academy',
    display_name: 'TCA',
    owner_user_id: IDS.doron_user,
    owner_email: 'doron.bsg@gmail.com',
    email: 'doron.bsg@gmail.com',
    tagline: 'Curriculum, study, and depth of practice.',
    listed_in_directory: true,
    subscription_exempt: false,
    subscription_tier: null,
    is_active: true,
    parent_business_id: myceliaId,
  };
  return invoke('migrationHelpers', {
    action: 'create_business',
    fields,
    idempotency_key: 'phase-2-tca',
    dry_run: dryRun,
  });
}

async function stepReparentRecess(dryRun, myceliaId) {
  return invoke('reparentBusiness', {
    action: 'reparent',
    business_id: IDS.recess_business,
    new_parent_id: myceliaId,
    reason: 'Phase 2: nesting Recess under Mycelia, LLC per v4.1 architecture',
    dry_run: dryRun,
  });
}

async function stepArchiveTestSandbox(dryRun) {
  return invoke('migrationHelpers', {
    action: 'archive_fs_profile',
    profile_id: IDS.doron_test_sandbox_fs_profile,
    dry_run: dryRun,
  });
}

async function stepPromoteBari(dryRun) {
  return invoke('migrationHelpers', {
    action: 'create_business_from_fs_profile',
    profile_id: IDS.bari_fs_profile,
    parent_business_id: null,
    overrides: {
      subscription_tier: null,
      subscription_exempt: false,
    },
    dry_run: dryRun,
  });
}

async function stepMarkLegacyBari(dryRun) {
  return invoke('migrationHelpers', {
    action: 'mark_legacy_user',
    user_id: IDS.bari_user,
    dry_run: dryRun,
  });
}

async function stepMarkLegacyDan(dryRun) {
  const lookup = await invoke('migrationHelpers', {
    action: 'find_user_by_email',
    email: IDS.dan_email,
  });
  if (!lookup.user) {
    return {
      success: true,
      skipped: true,
      reason: `No User record for ${IDS.dan_email} — Dan Sikes Construction Business remains unclaimed`,
      dry_run: dryRun,
      note: `Business record ${IDS.dan_sikes_business} stays untouched per Doron's decision`,
    };
  }
  return invoke('migrationHelpers', {
    action: 'mark_legacy_user',
    user_id: lookup.user.id,
    dry_run: dryRun,
  });
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

function line(ch = '─', n = 62) { return ch.repeat(n); }

function printStep(i, name, result) {
  console.log(`\n${line('·')}\nStep ${i}: ${name}`);
  if (result?.skipped) {
    console.log(`  [skip] ${result.reason}`);
    if (result.business_id) console.log(`         business_id: ${result.business_id}`);
    if (result.profile_id) console.log(`         profile_id:  ${result.profile_id}`);
    if (result.user_id) console.log(`         user_id:     ${result.user_id}`);
  } else if (result?.dry_run) {
    console.log('  [plan]', JSON.stringify(result.planned, null, 2).replace(/\n/g, '\n  '));
  } else {
    const id = result?.business_id || result?.profile_id || result?.user_id || '(n/a)';
    console.log(`  [apply] id=${id}`);
    if (result?.audit_log_id) console.log(`           audit_log_id: ${result.audit_log_id}`);
    if (result?.audit_log_ids) console.log(`           audit_log_ids: ${JSON.stringify(result.audit_log_ids)}`);
  }
}

async function main() {
  console.log('\n' + line('='));
  console.log(` Phase 2 Production Migration — ${DRY_RUN ? 'DRY RUN' : 'APPLY'}`);
  console.log(line('='));
  console.log(` mode:   ${DRY_RUN ? 'DRY_RUN (no writes)' : 'APPLY (mutating)'}`);
  console.log(` app:    ${BASE44_APP_ID}`);
  console.log(` time:   ${new Date().toISOString()}`);

  const completed = [];

  try {
    const mycelia = await stepCreateMycelia(DRY_RUN);
    printStep(1, 'Create Mycelia, LLC', mycelia);
    completed.push({ step: 1, kind: 'business', result: mycelia });
    const myceliaId = mycelia.business_id || '<pending>';

    const locallane = await stepCreateLocalLane(DRY_RUN, myceliaId);
    printStep(2, 'Create LocalLane (exempt)', locallane);
    completed.push({ step: 2, kind: 'business', result: locallane });

    const tca = await stepCreateTCA(DRY_RUN, myceliaId);
    printStep(3, 'Create TCA (The Camel Academy)', tca);
    completed.push({ step: 3, kind: 'business', result: tca });

    const recess = await stepReparentRecess(DRY_RUN, myceliaId);
    printStep(4, 'Reparent Recess under Mycelia', recess);
    completed.push({ step: 4, kind: 'reparent', result: recess });

    const sandbox = await stepArchiveTestSandbox(DRY_RUN);
    printStep(5, 'Archive Doron\'s test FS sandbox', sandbox);
    completed.push({ step: 5, kind: 'archive_fs', result: sandbox });

    const redUmbrella = await stepPromoteBari(DRY_RUN);
    printStep(6, 'Promote Bari FS profile → Red Umbrella Business', redUmbrella);
    completed.push({ step: 6, kind: 'promote', result: redUmbrella });

    const bariLegacy = await stepMarkLegacyBari(DRY_RUN);
    printStep(7, 'Mark Bari as legacy user', bariLegacy);
    completed.push({ step: 7, kind: 'legacy', result: bariLegacy });

    const danLegacy = await stepMarkLegacyDan(DRY_RUN);
    printStep(8, 'Mark Dan Sikes as legacy user', danLegacy);
    completed.push({ step: 8, kind: 'legacy', result: danLegacy });

    console.log('\n' + line('='));
    console.log(DRY_RUN ? 'DRY RUN COMPLETE — no writes performed.' : 'APPLY COMPLETE — all steps succeeded.');
    console.log(line('='));
    console.log('\nSummary:');
    completed.forEach((c) => {
      const r = c.result;
      const tag = r?.skipped ? 'SKIPPED' : r?.dry_run ? 'PLANNED' : 'APPLIED';
      console.log(`  [${tag}] step ${c.step}: ${c.kind}`);
    });
    if (DRY_RUN) {
      console.log('\nRe-run with --apply to execute.');
    }
  } catch (err) {
    console.error('\n' + line('!'));
    console.error('STEP FAILED:', err.message);
    console.error(line('!'));
    if (err.body) console.error('Body:', JSON.stringify(err.body, null, 2));
    if (!DRY_RUN && completed.length > 0) {
      console.error('\nRollback guidance: the following completed mutations need manual reversal');
      console.error('via reparentBusiness(rollback) / migrationHelpers(unarchive_* / unmark_*)');
      console.error('using each step\'s audit_log_id:\n');
      completed.forEach((c) => {
        const r = c.result;
        if (r?.skipped || r?.dry_run) return;
        console.error(`  step ${c.step} (${c.kind}): audit=${r?.audit_log_id || JSON.stringify(r?.audit_log_ids || {})}`);
      });
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
