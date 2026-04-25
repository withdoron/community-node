#!/usr/bin/env node
// @ts-check
/**
 * load-bari-templates.js
 * ------------------------------------------------------------
 * Loads Bari's two user-owned FSDocumentTemplate records into the Red Umbrella
 * Services LLC workspace — the General Construction Contract and Subcontractor
 * Agreement he paid an attorney to draft. Scoped to his Business so no other
 * contractor can see them.
 *
 * Source content is read verbatim from the attached .md files in
 * base44-prompts/assets/. The metadata header (everything up to and including
 * the first `---` divider) is stripped; the rendered contract body starts at
 * `## Letterhead` and is preserved exactly — typos and all — per the
 * "preserve source verbatim" constraint on the Bari-prep build.
 *
 * Both templates are created with:
 *   profile_id    = Bari's FieldServiceProfile (69baba55a6b9cca0c7d5700b)
 *   business_id   = Red Umbrella Services LLC   (69ea5590481b7e15af7216b6)
 *   is_system     = false
 *   template_type = 'contract' | 'sub_agreement'
 *
 * Idempotent on business_id + title (server-side dedup).
 *
 * Usage:
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/load-bari-templates.js            # dry-run
 *   MIGRATION_SECRET=<secret> node src/scripts/migrations/load-bari-templates.js --apply    # execute
 */

/* eslint-env node */
/* global process */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// ── Known IDs ─────────────────────────────────────────────────────
const BARI_FS_PROFILE_ID = '69baba55a6b9cca0c7d5700b';
const RED_UMBRELLA_BUSINESS_ID = '69ea5590481b7e15af7216b6';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ASSETS_DIR = resolve(__dirname, '../../../base44-prompts/assets');

// ── Strip metadata header from asset markdown ─────────────────────
// The file opens with a human-readable metadata block (Template type / Scope /
// Source / Branding / Per-project variables) terminated by the first `---`
// line. Everything from the first `---` forward is the rendered contract body
// (starting with `## Letterhead`) and must be preserved.
function stripMetadataHeader(raw) {
  const lines = raw.split('\n');
  const firstDividerIdx = lines.findIndex((line) => line.trim() === '---');
  if (firstDividerIdx < 0) {
    throw new Error('Asset file missing expected `---` divider between metadata header and content');
  }
  // Skip the `---` line itself + any leading blank lines
  let startIdx = firstDividerIdx + 1;
  while (startIdx < lines.length && lines[startIdx].trim() === '') startIdx += 1;
  return lines.slice(startIdx).join('\n');
}

// Strip italic *(Note: ...)* implementer-facing annotations from rendered content.
// These notes live in the .md source files to document Bari's source typos for
// future developers. They MUST NOT appear in the preview modal or rendered
// documents — that would surface "hey Bari, you have typos" inline in his
// contracts. The typos themselves in the contract language are preserved
// verbatim (Section 6 twice, "fifteen percent (25%)", duplicate 21.2,
// missing 22.4); only the meta-commentary about them is removed.
//
// Greedy leading \s* eats the blank line / leading space before the note,
// so both standalone-paragraph and inline note forms collapse cleanly.
function stripImplementerNotes(content) {
  return content.replace(/\s*\*\(Note:[\s\S]*?\)\*/g, '');
}

function extractMergeFields(content) {
  const matches = [...content.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  return [...new Set(matches)];
}

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
    err.body = body;
    throw err;
  }
  return body;
}

// ── Templates to load ─────────────────────────────────────────────
const TEMPLATES = [
  {
    filename: 'bari-red-umbrella-construction-contract.md',
    title: 'Red Umbrella General Construction Contract',
    template_type: 'contract',
    description: 'Bari\'s attorney-drafted general construction contract for Red Umbrella Services LLC. Preserves source language verbatim (including duplicate Section 6 in source — flag for Bari to review).',
    sort_order: 1,
  },
  {
    filename: 'bari-red-umbrella-subcontract.md',
    title: 'Red Umbrella Subcontractor Agreement',
    template_type: 'sub_agreement',
    description: 'Bari\'s attorney-drafted subcontractor agreement for Red Umbrella Services LLC. Preserves source language verbatim (Section 15 "fifteen percent (25%)" typo, duplicate 21.2, missing 22.4 — flag for Bari to review).',
    sort_order: 2,
  },
];

async function loadOne(tpl) {
  const assetPath = resolve(ASSETS_DIR, tpl.filename);
  let raw;
  try {
    raw = readFileSync(assetPath, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read asset ${assetPath}: ${err.message}`);
  }
  const bodyWithNotes = stripMetadataHeader(raw);
  const content = stripImplementerNotes(bodyWithNotes);
  const strippedNoteCount = (bodyWithNotes.match(/\*\(Note:/g) || []).length;
  const mergeFields = extractMergeFields(content);

  const fields = {
    profile_id: BARI_FS_PROFILE_ID,
    business_id: RED_UMBRELLA_BUSINESS_ID,
    template_type: tpl.template_type,
    title: tpl.title,
    description: tpl.description,
    content,
    merge_fields: mergeFields,
    is_system: false,
    sort_order: tpl.sort_order,
  };

  console.log(`\n── ${tpl.title}`);
  console.log(`   asset:        ${tpl.filename}`);
  console.log(`   content:      ${content.length} chars (after stripping ${strippedNoteCount} implementer note${strippedNoteCount === 1 ? '' : 's'})`);
  console.log(`   merge fields: ${mergeFields.length} unique (${mergeFields.slice(0, 6).join(', ')}${mergeFields.length > 6 ? ', ...' : ''})`);
  console.log(`   business_id:  ${RED_UMBRELLA_BUSINESS_ID}`);
  console.log(`   profile_id:   ${BARI_FS_PROFILE_ID}`);

  const result = await invoke('migrationHelpers', {
    action: 'create_fs_document_template',
    fields,
    dry_run: DRY_RUN,
  });

  if (result.skipped) {
    console.log(`   → SKIPPED (already exists). template_id: ${result.template_id}`);
  } else if (result.dry_run) {
    console.log(`   → DRY-RUN ok (no write performed).`);
  } else {
    console.log(`   → CREATED. template_id: ${result.template_id}   audit: ${result.audit_log_id}`);
  }
  return result;
}

async function main() {
  console.log(`load-bari-templates.js — ${DRY_RUN ? 'DRY-RUN' : 'APPLY'}`);
  console.log(`  BASE44_APP_ID:  ${BASE44_APP_ID}`);
  console.log(`  templates:      ${TEMPLATES.length}`);

  const results = [];
  for (const tpl of TEMPLATES) {
    try {
      results.push(await loadOne(tpl));
    } catch (err) {
      console.error(`\n   ✗ FAILED for ${tpl.title}: ${err.message}`);
      if (err.body) console.error(`     body: ${JSON.stringify(err.body)}`);
      process.exitCode = 1;
      return;
    }
  }

  console.log(`\n── Summary`);
  console.log(`   mode:        ${DRY_RUN ? 'DRY-RUN' : 'APPLIED'}`);
  console.log(`   templates:   ${results.length}`);
  console.log(`   created:     ${results.filter((r) => !r.skipped && !r.dry_run).length}`);
  console.log(`   skipped:     ${results.filter((r) => r.skipped).length}`);
  if (DRY_RUN) console.log(`\n   Re-run with --apply to execute.`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});