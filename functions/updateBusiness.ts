// Business entity writes via service role — DEC-025 Phase 3b
// Handles update, update_profile, add_staff_from_invite with authorization.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PROFILE_ALLOWLIST = [
  'name', 'description', 'primary_category', 'sub_category', 'sub_category_id',
  'email', 'contact_email', 'phone', 'website',
  'address', 'city', 'state', 'zip_code', 'display_full_address',
  'logo_url', 'instagram_url', 'facebook_url', 'tagline',
];

const ADMIN_EXTRA_ALLOWLIST = [
  'subscription_tier', 'accepts_silver', 'is_locally_owned_franchise', 'network_ids', 'is_active',
];

function slugFromName(name: string): string {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'business';
}

async function findUniqueSlug(
  base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  baseSlug: string,
  excludeBusinessId: string
): Promise<string> {
  const all = await base44.asServiceRole.entities.Business.list();
  const bySlug = (all || []).filter((b: { slug?: string; id?: string }) => b.slug === baseSlug && b.id !== excludeBusinessId);
  if (bySlug.length === 0) return baseSlug;
  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;
  while ((all || []).some((b: { slug?: string }) => b.slug === candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
  return candidate;
}

async function canEditBusiness(
  base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  user: { id: string; role?: string; email?: string },
  businessId: string
): Promise<boolean> {
  if (user.role === 'admin') return true;

  const business = await base44.asServiceRole.entities.Business.get(businessId);
  if (!business) return false;
  if (business.owner_user_id === user.id) return true;

  const instructors = business.instructors || [];
  if (instructors.includes(user.id)) {
    const key = `staff_roles:${businessId}`;
    const settings = await base44.asServiceRole.entities.AdminSettings.filter({ key });
    if (settings?.length > 0) {
      try {
        const roles = JSON.parse(settings[0].value || '[]') || [];
        const myRole = roles.find((r: { user_id?: string }) => r.user_id === user.id);
        if (myRole?.role === 'co-owner' || myRole?.role === 'manager') return true;
      } catch {
        // fall through
      }
    }
    return true;
  }

  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { action } = body;

    if (action === 'add_staff_from_invite') {
      const { business_id } = body;
      if (!business_id || typeof business_id !== 'string') {
        return Response.json({ error: 'business_id is required for add_staff_from_invite' }, { status: 400 });
      }

      const inviteKey = `staff_invites:${business_id}`;
      const inviteRecords = await base44.asServiceRole.entities.AdminSettings.filter({ key: inviteKey });
      if (!inviteRecords?.length) {
        return Response.json({ success: false, reason: 'no_invite' });
      }

      const record = inviteRecords[0];
      let invites: Array<{ email?: string; role?: string }> = [];
      try {
        invites = JSON.parse(record.value || '[]') || [];
      } catch {
        return Response.json({ success: false, reason: 'no_invite' });
      }

      const userEmail = (user.email || '').toLowerCase();
      const myInvite = invites.find((inv) => (inv?.email || '').toLowerCase() === userEmail);
      if (!myInvite) {
        return Response.json({ success: false, reason: 'no_invite' });
      }

      const business = await base44.asServiceRole.entities.Business.get(business_id);
      if (!business) {
        return Response.json({ success: false, reason: 'business_not_found' });
      }

      const currentInstructors = business.instructors || [];
      if (!currentInstructors.includes(user.id)) {
        await base44.asServiceRole.entities.Business.update(business_id, {
          instructors: [...currentInstructors, user.id],
        });
      }

      const rolesKey = `staff_roles:${business_id}`;
      const rolesRecords = await base44.asServiceRole.entities.AdminSettings.filter({ key: rolesKey });
      let currentRoles: Array<{ user_id: string; role: string; added_at?: string }> = [];
      if (rolesRecords?.length > 0) {
        try {
          currentRoles = JSON.parse(rolesRecords[0].value || '[]') || [];
        } catch {}
      }
      if (!currentRoles.some((r) => r.user_id === user.id)) {
        const newRole = {
          user_id: user.id,
          role: myInvite.role || 'instructor',
          added_at: new Date().toISOString(),
        };
        const updatedRoles = [...currentRoles.filter((r) => r.user_id !== user.id), newRole];
        if (rolesRecords.length > 0) {
          await base44.asServiceRole.entities.AdminSettings.update(rolesRecords[0].id, {
            value: JSON.stringify(updatedRoles),
          });
        } else {
          await base44.asServiceRole.entities.AdminSettings.create({
            key: rolesKey,
            value: JSON.stringify(updatedRoles),
          });
        }
      }

      return Response.json({ success: true });
    }

    if (action === 'update_profile') {
      const { business_id, data } = body;
      if (!business_id || typeof business_id !== 'string') {
        return Response.json({ error: 'business_id is required for update_profile' }, { status: 400 });
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return Response.json({ error: 'data object is required for update_profile' }, { status: 400 });
      }

      const allowed = await canEditBusiness(base44, user, business_id);
      if (!allowed) {
        return Response.json({ error: 'Not authorized to update this business' }, { status: 403 });
      }

      const isAdmin = user.role === 'admin';
      const allowlist = isAdmin ? [...PROFILE_ALLOWLIST, ...ADMIN_EXTRA_ALLOWLIST] : PROFILE_ALLOWLIST;
      const filtered: Record<string, unknown> = {};
      for (const key of Object.keys(data as Record<string, unknown>)) {
        if (allowlist.includes(key)) {
          filtered[key] = (data as Record<string, unknown>)[key];
        }
      }

      if (filtered.name != null && String(filtered.name).trim() !== '') {
        const baseSlug = slugFromName(String(filtered.name));
        filtered.slug = await findUniqueSlug(base44, baseSlug, business_id);
      }

      if (Object.keys(filtered).length === 0) {
        const existing = await base44.asServiceRole.entities.Business.get(business_id);
        return Response.json(existing);
      }

      const updated = await base44.asServiceRole.entities.Business.update(business_id, filtered);
      return Response.json(updated);
    }

    if (action === 'update_counters') {
      const ALLOWED_COUNTER_KEYS = ['nod_count', 'story_count', 'vouch_count', 'recommendation_count', 'concern_count'];
      const { business_id, data } = body;
      if (!business_id || typeof business_id !== 'string') {
        return Response.json({ error: 'business_id is required for update_counters' }, { status: 400 });
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return Response.json({ error: 'data object is required for update_counters' }, { status: 400 });
      }
      const filtered: Record<string, unknown> = {};
      for (const key of Object.keys(data as Record<string, unknown>)) {
        if (ALLOWED_COUNTER_KEYS.includes(key)) {
          filtered[key] = (data as Record<string, unknown>)[key];
        }
      }
      if (Object.keys(filtered).length === 0) {
        return Response.json({ error: 'No allowed counter fields in data' }, { status: 400 });
      }
      const updated = await base44.asServiceRole.entities.Business.update(business_id, filtered);
      return Response.json(updated);
    }

    if (action === 'update') {
      const { business_id, data } = body;
      if (!business_id || typeof business_id !== 'string') {
        return Response.json({ error: 'business_id is required for update' }, { status: 400 });
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return Response.json({ error: 'data object is required for update' }, { status: 400 });
      }

      const allowed = await canEditBusiness(base44, user, business_id);
      if (!allowed) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const updated = await base44.asServiceRole.entities.Business.update(business_id, data as Record<string, unknown>);
      return Response.json(updated);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('updateBusiness error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
