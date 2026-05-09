import { useMemo } from 'react';
import { parseWrappedArray } from '@/utils/wrapShape';

/**
 * useWorkspacePeople — workspace-scoped people reader for the workers_json
 * blob on FieldServiceProfile.
 *
 * Pairs with the future useContractLineItems(projectId) hook (Log-Line-Item
 * Attribution Proposal, May 5) — both feed Phase 2.4's <SubVendorPicker>
 * primitive. Setting up the hook shape now means Phase 2.4 plugs in cleanly
 * with one read seam, not an inline filter at every call site.
 *
 * Consumers receive the profile object directly (single source of truth in
 * scope). When the picker lands as a typeahead with quick-add, it'll consume
 * this hook + an action wrapper; the read seam is stable.
 *
 * Filter:
 *   roleFilter = undefined → all people in workers_json
 *   roleFilter = 'worker' | 'subcontractor' | 'vendor' → just that role
 *
 * Legacy `role === undefined || null` records (pre-Phase 2.3) fold into the
 * 'worker' bucket — same convention as FieldServicePeople.jsx:492.
 *
 * Returns:
 *   people     — role-filtered list (or all if roleFilter undefined)
 *   allPeople  — every workers_json item, unfiltered
 *   peopleMap  — { [id]: person } hash lookup, derived from allPeople.
 *                Currently no active consumer — added in Phase 2.5 to feed
 *                deriveLineTrade and kept after the Phase 2.5 rollback as
 *                pre-built scaffolding for future O(1) lookup needs (e.g.,
 *                future SubVendorPicker selection lookup, future inline
 *                parseWorkers consumer migrations).
 */
export function useWorkspacePeople(profile, roleFilter) {
  const all = useMemo(
    () => parseWrappedArray(profile?.workers_json),
    [profile?.workers_json]
  );

  const filtered = useMemo(() => {
    if (!roleFilter) return all;
    if (roleFilter === 'worker') {
      return all.filter((p) => p.role === 'worker' || !p.role);
    }
    return all.filter((p) => p.role === roleFilter);
  }, [all, roleFilter]);

  const peopleMap = useMemo(
    () => Object.fromEntries(all.map((p) => [p.id, p])),
    [all]
  );

  return { people: filtered, allPeople: all, peopleMap };
}
