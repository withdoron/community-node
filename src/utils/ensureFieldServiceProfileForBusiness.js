/**
 * Ensure a FieldServiceProfile exists for a given Business.
 *
 * Idempotent. Safe to call multiple times — returns the existing profile
 * if one already matches the business's id, otherwise creates one with
 * sensible defaults (invite_code, features_json, industry_preset) and
 * seeds the Oregon lien-law document templates via initializeWorkspace.
 *
 * Why this helper exists (Phase 4.2-tiles-6 follow-up):
 *   The Settings → Add Space mechanic previously only appended `'desk'`
 *   to `Business.enabled_spaces` and did no profile initialization. The
 *   user contract — "clicking Add Desk lands me in a working Desk" —
 *   required a single shared init step both Settings and the placeholder
 *   CTA could call. Living Feet (DEC-146): one helper, two consumers.
 *
 * Match key: `business_id`. Same key the resolver (resolveBusinessField
 * ServiceProfile.js) uses, so what the helper finds the resolver also
 * sees on the next render after cache invalidation.
 *
 * .filter() vs .list() (CLAUDE.md SDK quirk): we use `.list()` + client
 * filter because `.filter()` returns empty arrays for service-role-
 * created records on the client SDK.
 */
import { base44 } from '@/api/base44Client';

const FEATURE_DEFAULTS = {
  permits_enabled: true,
  subs_enabled: true,
  management_fees_enabled: false,
  overhead_profit_enabled: false,
  xactimate_enabled: false,
  payments_enabled: true,
  timeline_enabled: true,
};

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[arr[i] % chars.length];
  return code;
}

async function resolveCurrentUser(currentUser) {
  if (currentUser?.id) return currentUser;
  try {
    const me = await base44.auth.me();
    return me || null;
  } catch {
    return null;
  }
}

export async function ensureFieldServiceProfileForBusiness({ business, currentUser } = {}) {
  if (!business?.id) throw new Error('ensureFieldServiceProfileForBusiness: business.id is required');

  const user = await resolveCurrentUser(currentUser);
  if (!user?.id) throw new Error('ensureFieldServiceProfileForBusiness: currentUser.id is required');

  const targetBusinessId = String(business.id);

  let existing = null;
  try {
    const all = await base44.entities.FieldServiceProfile.list();
    const arr = Array.isArray(all) ? all : [];
    existing = arr.find(
      (p) => p && p.business_id != null && String(p.business_id) === targetBusinessId,
    ) || null;
  } catch (err) {
    console.warn('[ensureFieldServiceProfileForBusiness] list failed', err);
  }

  if (existing) {
    return { profile: existing, created: false };
  }

  const ownerName = user.full_name || user.name || user.email || 'Owner';
  const businessName = business.name || business.business_name || 'Field Service';

  const profile = await base44.entities.FieldServiceProfile.create({
    user_id: user.id,
    business_id: targetBusinessId,
    workspace_name: businessName,
    business_name: businessName,
    owner_name: ownerName,
    license_number: '',
    phone: business.phone || '',
    email: business.email || user.email || '',
    website: business.website || '',
    hourly_rate: 0,
    service_area: '',
    tagline: '',
    workers_json: {},
    user_roles: {},
    default_terms: '',
    phase_labels: {},
    linked_business_workspace_id: null,
    linked_finance_workspace_id: null,
    brand_color: null,
    logo_url: null,
    invite_code: generateInviteCode(),
    features_json: { ...FEATURE_DEFAULTS },
    industry_preset: 'general_contractor',
  });

  try {
    await base44.functions.invoke('initializeWorkspace', {
      action: 'initialize',
      workspace_type: 'field_service',
      profile_id: profile.id,
    });
  } catch (err) {
    console.warn('[ensureFieldServiceProfileForBusiness] initializeWorkspace failed (non-fatal)', err);
  }

  return { profile, created: true };
}
