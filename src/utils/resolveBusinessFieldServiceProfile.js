/**
 * Business-scoped Field Service profile resolver.
 *
 * The tile cockpit (Phase 4.2-tiles) descends into a business → Desk space
 * and needs the FieldServiceProfile that belongs to *that* business — not
 * the user's first personal profile (the spinner-cockpit assumption at
 * MyLaneDrillView.jsx:53). Bari's Red Umbrella has a business-scoped
 * profile created during the Phase 2 production migration on 2026-04-23
 * (id `69baba55a6b9cca0c7d5700b`, business_id `69ea5590481b7e15af7216b6`).
 * The personal-scope `[0]` resolver simply never picked it up.
 *
 * This helper is the load-bearing piece flagged at tiles-4 closeout:
 *   "the mapping from descendedBusinessId → that business's Field Service
 *    profile is the load-bearing piece."
 *
 * Living Feet (DEC-146): one resolver, many consumers. The Desk-as-roll-up
 * arc, the Jobs rename arc, and any future business-scoped space (Property
 * Pulse per-business, Events per-business) read from this single helper.
 * When Jobs rename happens this file gets renamed; the wiring layer doesn't
 * change.
 *
 * Edge cases:
 *   - Business has no FieldServiceProfile yet → returns null. Caller is
 *     expected to render an empty state ("Set up your Desk"), not crash.
 *   - Multiple FieldServiceProfile records carry the same business_id
 *     (shouldn't happen but defensive) → returns the first match and logs
 *     a warning so we notice in dev.
 *   - String/ObjectId coercion: business ids may be strings on one side and
 *     ObjectIds on the other (DEC-110 pattern). Use String() on both sides.
 */
export function resolveBusinessFieldServiceProfile(business, allFieldServiceProfiles) {
  if (!business?.id) return null;
  if (!Array.isArray(allFieldServiceProfiles) || allFieldServiceProfiles.length === 0) return null;

  const targetId = String(business.id);
  const matches = allFieldServiceProfiles.filter(
    (p) => p && p.business_id != null && String(p.business_id) === targetId,
  );

  if (matches.length === 0) return null;
  if (matches.length > 1) {
    console.warn(
      `[resolveBusinessFieldServiceProfile] ${matches.length} FieldServiceProfile records found for business ${targetId} — using first match (id=${matches[0]?.id}). Investigate; this should not happen.`,
    );
  }
  return matches[0];
}
