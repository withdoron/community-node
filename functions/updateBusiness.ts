// Business entity writes via service role — DEC-025 Phase 3b
// Handles update, update_profile, add_staff_from_invite with authorization.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PROFILE_ALLOWLIST = [
  'name', 'description', 'primary_category', 'sub_category', 'sub_category_id', 'main_category', 'category',
  'email', 'contact_email', 'phone', 'website',
  'address', 'city', 'state', 'zip_code', 'display_full_address',
  'logo_url', 'instagram_url', 'facebook_url', 'instagram', 'facebook', 'tagline',
  'accepts_joy_coins', 'accepts_silver', 'services',
  'business_hours', 'subcategory', 'archetype',
  'shop_url', 'services_offered', 'service_area',
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

/** Add business_id to a user's associated_businesses (so Dashboard nav and staff list can use it). */
async function addBusinessToUserAssociated(
  base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  userId: string,
  businessId: string
): Promise<void> {
  try {
    const existing = await base44.asServiceRole.entities.User.get(userId) as { associated_businesses?: string[]; data?: { associated_businesses?: string[] } } | null;
    if (!existing) return;
    const current = existing.associated_businesses ?? existing.data?.associated_businesses ?? [];
    const list = Array.isArray(current) ? current : [];
    if (list.includes(businessId)) return;
    const next = [...list, businessId];
    if (existing.data && typeof existing.data === 'object' && !Array.isArray(existing.data)) {
      await base44.asServiceRole.entities.User.update(userId, {
        data: { ...existing.data, associated_businesses: next },
      } as Record<string, unknown>);
    } else {
      await base44.asServiceRole.entities.User.update(userId, { associated_businesses: next } as Record<string, unknown>);
    }
  } catch (e) {
    console.error('addBusinessToUserAssociated error', e);
  }
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
        await addBusinessToUserAssociated(base44, user.id, business_id);
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

      const dataInstructors = (data as { instructors?: string[] }).instructors;
      const prevInstructors = (await base44.asServiceRole.entities.Business.get(business_id))?.instructors ?? [];
      const newInstructorIds = Array.isArray(dataInstructors)
        ? dataInstructors.filter((id: string) => !prevInstructors.includes(id))
        : [];

      const updated = await base44.asServiceRole.entities.Business.update(business_id, data as Record<string, unknown>);
      for (const uid of newInstructorIds) {
        await addBusinessToUserAssociated(base44, uid, business_id);
      }
      return Response.json(updated);
    }

    // --- AccessWindow & Location: writes go through server; lock in Base44 dashboard after ship:
    // AccessWindow: Update → Creator Only, Delete → Creator Only
    // Location: Update → Creator Only, Delete → Creator Only
    if (action === 'manage_access_window') {
      const { business_id, operation, window_id, data } = body;
      if (!business_id || typeof business_id !== 'string') {
        return Response.json({ error: 'business_id is required for manage_access_window' }, { status: 400 });
      }
      const op = operation as string;
      if (!['create', 'update', 'delete'].includes(op)) {
        return Response.json({ error: 'operation must be create, update, or delete' }, { status: 400 });
      }

      const allowed = await canEditBusiness(base44, user, business_id);
      if (!allowed) {
        return Response.json({ error: 'Not authorized to manage access windows for this business' }, { status: 403 });
      }

      if (op === 'create') {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          return Response.json({ error: 'data is required for create' }, { status: 400 });
        }
        const d = data as Record<string, unknown>;
        if (d.day_of_week == null || d.start_time == null || d.end_time == null || d.joy_coin_cost == null) {
          return Response.json({ error: 'day_of_week, start_time, end_time, and joy_coin_cost are required' }, { status: 400 });
        }
        const created = await base44.asServiceRole.entities.AccessWindow.create({
          ...d,
          business_id,
        } as Record<string, unknown>);
        return Response.json(created);
      }

      if (op === 'update' || op === 'delete') {
        if (!window_id || typeof window_id !== 'string') {
          return Response.json({ error: 'window_id is required for update/delete' }, { status: 400 });
        }
        const existing = await base44.asServiceRole.entities.AccessWindow.get(window_id);
        if (!existing) {
          return Response.json({ error: 'Access window not found' }, { status: 404 });
        }
        if ((existing as { business_id?: string }).business_id !== business_id) {
          return Response.json({ error: 'Access window does not belong to this business' }, { status: 403 });
        }
        if (op === 'update') {
          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return Response.json({ error: 'data is required for update' }, { status: 400 });
          }
          const updated = await base44.asServiceRole.entities.AccessWindow.update(window_id, data as Record<string, unknown>);
          return Response.json(updated);
        }
        await base44.asServiceRole.entities.AccessWindow.delete(window_id);
        return Response.json({ success: true });
      }
    }

    if (action === 'manage_location') {
      const { business_id, operation, location_id, data } = body;
      if (!business_id || typeof business_id !== 'string') {
        return Response.json({ error: 'business_id is required for manage_location' }, { status: 400 });
      }
      const op = operation as string;
      if (!['create', 'update', 'delete'].includes(op)) {
        return Response.json({ error: 'operation must be create, update, or delete' }, { status: 400 });
      }

      const allowed = await canEditBusiness(base44, user, business_id);
      if (!allowed) {
        return Response.json({ error: 'Not authorized to manage locations for this business' }, { status: 403 });
      }

      if (op === 'create') {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          return Response.json({ error: 'data is required for create' }, { status: 400 });
        }
        const created = await base44.asServiceRole.entities.Location.create({
          ...(data as Record<string, unknown>),
          business_id,
        });
        return Response.json(created);
      }

      if (op === 'update' || op === 'delete') {
        if (!location_id || typeof location_id !== 'string') {
          return Response.json({ error: 'location_id is required for update/delete' }, { status: 400 });
        }
        const existing = await base44.asServiceRole.entities.Location.get(location_id);
        if (!existing) {
          return Response.json({ error: 'Location not found' }, { status: 404 });
        }
        if ((existing as { business_id?: string }).business_id !== business_id) {
          return Response.json({ error: 'Location does not belong to this business' }, { status: 403 });
        }
        if (op === 'update') {
          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return Response.json({ error: 'data is required for update' }, { status: 400 });
          }
          const updated = await base44.asServiceRole.entities.Location.update(location_id, data as Record<string, unknown>);
          return Response.json(updated);
        }
        await base44.asServiceRole.entities.Location.delete(location_id);
        return Response.json({ success: true });
      }
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('updateBusiness error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
