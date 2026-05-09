/**
 * fsWorkersRoles — single source of truth for the workers_json role enum.
 *
 * Phase 2.3 extends the existing `worker | subcontractor` role enum to
 * include `vendor`. Each role carries config flags that drive conditional
 * field rendering in PersonModal and section filtering in FieldServicePeople:
 *
 *   hasHourlyRate       — workers only (the only role billed by the hour)
 *   hasBusinessName     — subs and vendors (their DBA / company)
 *   hasAssignedProjects — workers and subs (vendors are reference-only)
 *
 * (Phase 2.5 added a `hasPrimaryTradeId` flag for sub/vendor trade
 * derivation; rolled back when the single-trade-per-sub model proved
 * fragile across taxonomy switches. Field stripped from workers_json items
 * via migration; flag dropped from this config. Revisit when per-taxonomy
 * sub-to-trade mapping is the right shape.)
 *
 * Three sites consumed the role data before extraction (ROLE_BADGES map,
 * PersonModal <select>, section filter); adding vendor would have made it
 * four. Three-instance threshold met (DEC-148) — extracted once.
 *
 * Vendor color: bg-fuchsia-500/20 text-fuchsia-400. Distinct from worker
 * (gold/primary), subcontractor (sky/blue), and client (emerald) — semantic
 * token discipline (DEC-132).
 */
export const WORKERS_ROLES = [
  {
    value: 'worker',
    label: 'Worker',
    badgeLabel: 'Worker',
    badgeClass: 'bg-primary/20 text-primary-hover',
    hasHourlyRate: true,
    hasBusinessName: false,
    hasAssignedProjects: true,
  },
  {
    value: 'subcontractor',
    label: 'Subcontractor',
    badgeLabel: 'Sub',
    badgeClass: 'bg-sky-500/20 text-sky-400',
    hasHourlyRate: false,
    hasBusinessName: true,
    hasAssignedProjects: true,
  },
  {
    value: 'vendor',
    label: 'Vendor',
    badgeLabel: 'Vendor',
    badgeClass: 'bg-fuchsia-500/20 text-fuchsia-400',
    hasHourlyRate: false,
    hasBusinessName: true,
    hasAssignedProjects: false,
  },
];

const ROLE_MAP = Object.fromEntries(WORKERS_ROLES.map((r) => [r.value, r]));

/**
 * Resolve a role config by its enum value. Falls back to the worker config
 * for unknown / missing roles — preserves the legacy parse behavior at
 * FieldServicePeople.jsx:492 (`p.role === 'worker' || !p.role`).
 */
export function getRoleConfig(role) {
  return ROLE_MAP[role] || ROLE_MAP.worker;
}

/**
 * Backward-compat alias for the legacy ROLE_BADGES map shape:
 *   ROLE_BADGES[role] -> { label, className }
 * Components that imported the old shape can swap to this without diff churn.
 */
export const ROLE_BADGES = Object.fromEntries(
  WORKERS_ROLES.map((r) => [
    r.value,
    { label: r.badgeLabel, className: r.badgeClass },
  ])
);

/**
 * Stable-id generator for workers_json items. Mirrors the newItemId pattern
 * in src/utils/fsLineItems.js — `worker_${ts}_${counter}` is unique within a
 * single client session and across sessions because Date.now() advances.
 *
 * Phase 2.4 added stable ids to workers_json items so line items
 * (sub_person_id) and FSPayment (party_id) can carry stable references.
 * Items existed without ids prior to Phase 2.4 — the
 * migrate-add-workers-json-ids.js one-shot backfilled existing records;
 * PersonModal's quick-add flow generates ids for new records.
 */
let _nextWorkerId = 1;
export function newWorkerId() {
  return `worker_${Date.now()}_${_nextWorkerId++}`;
}
