// AdminSettings write operations via service role — DEC-025 Phase 3a
// Handles create/update/filter for AdminSettings with authorization.
// Keys: platform_config:* | staff_roles:* | staff_invites:* | show_*

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function isAuthorized(base44: Awaited<ReturnType<typeof createClientFromRequest>>, user: { id: string; role?: string; email?: string }, key: string, action: string): Promise<boolean> {
  // Admin can do anything
  if (user.role === 'admin') return true;

  // staff_roles:* and staff_invites:* allow business owner
  if (key.startsWith('staff_roles:') || key.startsWith('staff_invites:')) {
    const businessId = key.replace(/^staff_(?:roles|invites):/, '');
    if (!businessId) return false;
    try {
      const business = await base44.asServiceRole.entities.Business.get(businessId);
      return business?.owner_user_id === user.id;
    } catch {
      return false;
    }
  }

  // platform_config:*, show_*, and all other keys require admin
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

    // check_my_invites: list invite settings for the current user by email (no key needed)
    if (action === 'check_my_invites') {
      const { email } = body;
      if (!email || typeof email !== 'string') {
        return Response.json({ error: 'email is required for check_my_invites' }, { status: 400 });
      }
      if ((user.email || '').toLowerCase() !== email.toLowerCase()) {
        return Response.json({ error: 'Email must match current user' }, { status: 403 });
      }

      const allSettings = await base44.asServiceRole.entities.AdminSettings.list();
      const inviteSettings = (allSettings || []).filter((s: { key?: string }) =>
        (s.key || '').startsWith('staff_invites:')
      );

      const results: Array<{ id: string; key: string; value: string; invites: unknown[] }> = [];
      for (const s of inviteSettings) {
        let invites: unknown[] = [];
        try {
          invites = JSON.parse(s.value || '[]') || [];
        } catch {
          continue;
        }
        const myInvite = invites.find(
          (inv: { email?: string }) =>
            (inv?.email || '').toLowerCase() === email.toLowerCase()
        );
        if (myInvite) {
          results.push({ id: s.id, key: s.key, value: s.value, invites });
        }
      }

      return Response.json(results);
    }

    // search_user_by_email: lookup user by email (service role); for Add Staff flow (DEC-042)
    // Any authenticated user can call — used by business owners to add staff by email.
    // Case-insensitive match (Base44 .filter() is exact match; list + find avoids case issues).
    if (action === 'search_user_by_email') {
      const { email } = body;
      if (!email || typeof email !== 'string') {
        return Response.json({ error: 'email is required for search_user_by_email' }, { status: 400 });
      }
      const searchLower = String(email).trim().toLowerCase();
      if (!searchLower) {
        return Response.json({ user: null });
      }
      const allUsers = await base44.asServiceRole.entities.User.list();
      const u = (allUsers || []).find(
        (u: { email?: string }) => (u.email ?? '').toLowerCase() === searchLower
      );
      if (!u) {
        return Response.json({ user: null });
      }
      return Response.json({
        user: {
          id: u.id,
          email: u.email ?? searchLower,
          full_name: u.full_name ?? null,
        },
      });
    }

    // accept_invite: user removes their own pending invite (no admin/owner required)
    if (action === 'accept_invite') {
      const { business_id } = body;
      if (!business_id || typeof business_id !== 'string') {
        return Response.json({ error: 'business_id is required for accept_invite' }, { status: 400 });
      }

      const key = `staff_invites:${business_id}`;
      const admin = base44.asServiceRole.entities.AdminSettings;
      const records = await admin.filter({ key });
      if (!records || records.length === 0) {
        return Response.json({ success: false, reason: 'no_matching_invite' });
      }

      const record = records[0];
      let invites: unknown[] = [];
      try {
        invites = JSON.parse(record.value || '[]') || [];
      } catch {
        return Response.json({ success: false, reason: 'no_matching_invite' });
      }

      const userEmail = (user.email || '').toLowerCase();
      const myInvite = invites.find(
        (inv: { email?: string }) => (inv?.email || '').toLowerCase() === userEmail
      );
      if (!myInvite) {
        return Response.json({ success: false, reason: 'no_matching_invite' });
      }

      const updatedInvites = invites.filter(
        (inv: { email?: string }) => (inv?.email || '').toLowerCase() !== userEmail
      );
      await admin.update(record.id, { value: JSON.stringify(updatedInvites) });

      return Response.json({ success: true });
    }

    // filter, create, update require key
    const { key, value, id } = body;
    if (!key || typeof key !== 'string') {
      return Response.json({ error: 'key is required' }, { status: 400 });
    }

    const allowed = await isAuthorized(base44, user, key, action as string);
    if (!allowed) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const admin = base44.asServiceRole.entities.AdminSettings;

    if (action === 'filter') {
      const records = await admin.filter({ key });
      return Response.json(records);
    }

    if (action === 'create') {
      if (value === undefined || value === null) {
        return Response.json({ error: 'value is required for create' }, { status: 400 });
      }
      const record = await admin.create({ key, value: String(value) });
      return Response.json(record);
    }

    if (action === 'update') {
      if (!id || typeof id !== 'string') {
        return Response.json({ error: 'id is required for update' }, { status: 400 });
      }
      if (value === undefined || value === null) {
        return Response.json({ error: 'value is required for update' }, { status: 400 });
      }
      const record = await admin.update(id, { value: String(value) });
      return Response.json(record);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('updateAdminSettings error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
