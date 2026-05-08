// fsEstimateLifecycle — shared estimate-status lifecycle helpers (Living Feet, DEC-146).
//
// Phase 2.2 extraction: the inline `status === 'accepted' || status === 'signed'`
// check repeated at five sites (FieldServiceEstimates preview header, list lock
// icon, list status pill, list reopen button; ClientPortal status pill).
// Phase 2.2's preset picker becomes the sixth consumer (lock the picker once
// the estimate is accepted/signed; reopen → 'sent' unlocks it again).
//
// Scope rule: this helper answers the lock question only. Other lifecycle
// distinctions (editable vs read-only, awaiting_signature handling, etc.) are
// stricter than this gate and stay inline until they cross the three-instance
// threshold themselves.
//
// Companion to: DEC-215 (rls.update absence on FSEstimate makes the lock a
// purely client-side render gate; server still permits writes via owner).

export function isEstimateLocked(estimate) {
  return estimate?.status === 'accepted' || estimate?.status === 'signed';
}
