#!/usr/bin/env node
// @ts-check
/**
 * _pre-migration-rls-audit.js
 * ------------------------------------------------------------
 * Living Feet helper (DEC-215). Audits a Base44 entity's .jsonc schema for
 * rls.update presence — the load-bearing structural rule before any migration
 * that writes via asServiceRole.
 *
 * From DEC-215: "When a Base44 entity needs to receive writes via
 * asServiceRole, the entity's rls.update key MUST be absent from the rls
 * block. Setting it to true, removing the inner constraint, or any other
 * relaxation is reportedly insufficient in SDK 0.8.23 — key absence is
 * load-bearing."
 *
 * Three-instance evidence at promotion (FieldServiceProfile + FSEstimate +
 * Business). Phase 2.2 makes it four (FSEstimate carries the snapshot
 * backfill writes); future migrations inherit this checklist.
 *
 * Usage:
 *   node src/scripts/migrations/_pre-migration-rls-audit.js FSEstimate
 *   node src/scripts/migrations/_pre-migration-rls-audit.js FieldServiceProfile
 *
 * Exit codes:
 *   0 — green (rls.update absent or rls block missing entirely; safe for
 *              asServiceRole writes)
 *   1 — red (rls.update present; remove before running migration)
 *   2 — usage error (entity name missing or .jsonc not found)
 */

/* eslint-env node */
/* global process */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// repo root: scripts → migrations → scripts → src → repo
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const ENTITIES_DIR = join(REPO_ROOT, 'base44', 'entities');

const entityName = process.argv[2];
if (!entityName) {
  console.error('Usage: node _pre-migration-rls-audit.js <EntityName>');
  console.error('Example: node _pre-migration-rls-audit.js FSEstimate');
  process.exit(2);
}

const jsoncPath = join(ENTITIES_DIR, `${entityName}.jsonc`);
if (!existsSync(jsoncPath)) {
  console.error(`Entity .jsonc not found: ${jsoncPath}`);
  console.error('Available entities:');
  // Best-effort list of available entities, no fancy error handling.
  try {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync(ENTITIES_DIR).filter((f) => f.endsWith('.jsonc'));
    for (const f of files) console.error(`  ${f.replace('.jsonc', '')}`);
  } catch {
    /* ignore — usage hint above is enough */
  }
  process.exit(2);
}

const raw = readFileSync(jsoncPath, 'utf-8');
// Strip line comments (// ...) and block comments (/* ... */) so JSON.parse
// works on the .jsonc file. Crude but sufficient for Base44's schema files
// which only carry trailing line comments inside string values when authored
// by hand. The Base44 auto-sync produces clean JSON; defensive only.
const cleaned = raw
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let schema;
try {
  schema = JSON.parse(cleaned);
} catch (err) {
  console.error(`Failed to parse ${jsoncPath}:`, err instanceof Error ? err.message : err);
  process.exit(2);
}

const rls = schema?.rls || null;
const security = schema?.security || null;
const securityUpdate = security?.update;
const rlsUpdate = rls?.update;
const rlsKeys = rls ? Object.keys(rls) : [];

console.log(`\n── Pre-migration RLS audit: ${entityName} ──`);
console.log(`Schema file: ${jsoncPath}`);
console.log('');

if (rls === null) {
  console.log('  rls block:        ABSENT (entirely)');
  console.log('  rls.update:       N/A');
} else {
  console.log(`  rls keys present: [${rlsKeys.join(', ') || '(empty)'}]`);
  console.log(`  rls.update:       ${rlsUpdate === undefined ? 'ABSENT' : JSON.stringify(rlsUpdate)}`);
}
console.log(`  security.update:  ${securityUpdate === undefined ? 'ABSENT' : JSON.stringify(securityUpdate)}`);
console.log('');

if (rlsUpdate === undefined) {
  console.log('🟢 GREEN — rls.update is absent. asServiceRole writes will succeed.');
  console.log('   security.update value above governs production access control independently.');
  console.log('   Safe to proceed with migration.\n');
  process.exit(0);
}

console.log('🔴 RED — rls.update is PRESENT. asServiceRole writes will fail.');
console.log('');
console.log('   DEC-215: rls.update must be absent (not relaxed). Setting it to true');
console.log('   or removing the inner constraint is insufficient in SDK 0.8.23 —');
console.log('   key absence is load-bearing.');
console.log('');
console.log('   To fix: write a Base44 agent prompt that removes the rls.update key');
console.log('   from this entity entirely. After Base44 applies + auto-syncs the');
console.log('   schema, re-run this audit to confirm GREEN before --apply.\n');
process.exit(1);
