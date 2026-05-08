// fsEstimateLifecycle — shared estimate + CO lifecycle helpers (Living Feet, DEC-146).
//
// Phase 2.2 extraction: `isEstimateLocked` collapsed the inline
// `status === 'accepted' || status === 'signed'` check from five sites
// (FieldServiceEstimates preview header, list lock icon, list status pill,
// list reopen button; ClientPortal status pill).
//
// Phase 2.4 extraction: `isChangeOrderLocked` collapses the same gate
// repeated at five CO sites in FieldServiceProjects.jsx (recomputeProjectBudget
// counted-COs filter, list-grouping counted-COs filter, contract total
// rollup filter, CO badge styling, expanded-CO render gate). Same shape as
// estimates — accepted-or-signed is the locked-into-contract gate.
//
// Scope rule: these helpers answer the lock question only. Status-display
// distinctions (e.g., "Signed" vs "Accepted" labels in the CO list) need
// to discriminate between the two values and stay inline.
//
// Companion to: DEC-215 (rls.update absence on FSEstimate makes the lock a
// purely client-side render gate; server still permits writes via owner).

export function isEstimateLocked(estimate) {
  return estimate?.status === 'accepted' || estimate?.status === 'signed';
}

export function isChangeOrderLocked(co) {
  return co?.status === 'accepted' || co?.status === 'signed';
}
