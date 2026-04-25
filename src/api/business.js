// Thin SDK wrap for Business reads/writes. New code paths (Build F forward)
// route through this seam instead of importing `base44.entities.Business`
// directly. At Phase 6 (DEC-175), this file is the swap point for Supabase.
// Existing direct imports stay as-is — this wrap is for new code only.

import { base44 } from '@/api/base44Client';

// Owner-facing writes go through `updateProfile`. The `updateBusiness` server
// function gates by PROFILE_ALLOWLIST (DEC-025), so this is the security
// boundary, not direct entity writes. `update()` is kept as a service-side
// SDK primitive — do not call from owner UI flows.

export const Business = {
  list: (...args) => base44.entities.Business.list(...args),
  get: (id) => base44.entities.Business.get(id),
  filter: (criteria) => base44.entities.Business.filter(criteria),
  update: (id, patch) => base44.entities.Business.update(id, patch),
  updateProfile: (id, patch) =>
    base44.functions.invoke('updateBusiness', {
      action: 'update_profile',
      business_id: id,
      data: patch,
    }),
};
