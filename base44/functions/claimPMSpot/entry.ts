// Claim a spot on a PM workspace — bypasses Creator Only RLS.
// Four actions: join_as_tenant, join_as_owner, join_as_manager, promote_to_manager.
// Mirrors claimTeamSpot.ts fractal pattern.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    const action = body.action as string;

    if (!action) {
      return Response.json({ error: 'action is required' }, { status: 400 });
    }

    const entities = base44.asServiceRole.entities;

    // Helper: safe array from filter
    const safeFilter = async (
      entity: { filter: (q: Record<string, unknown>) => Promise<unknown> },
      query: Record<string, unknown>
    ): Promise<Array<Record<string, unknown>>> => {
      const result = await entity.filter(query);
      return Array.isArray(result) ? result : [];
    };

    // Helper: find profile by invite code field
    const findProfileByCode = async (
      fieldName: string,
      code: string
    ): Promise<Record<string, unknown> | null> => {
      const profiles = await safeFilter(entities.PMPropertyProfile, { [fieldName]: code.trim() });
      return profiles[0] || null;
    };

    // Helper: check duplicate membership
    const checkDuplicate = async (profileId: string): Promise<boolean> => {
      const existing = await safeFilter(entities.PMWorkspaceMember, {
        profile_id: profileId,
        user_id: user.id,
      });
      return existing.length > 0;
    };

    // Derive display name from user
    const getDisplayName = (): string => {
      const data = (user as Record<string, unknown>).data as Record<string, unknown> | undefined;
      return (
        (data?.display_name as string) ||
        (data?.full_name as string) ||
        (user as Record<string, unknown>).email as string ||
        'Member'
      );
    };

    // ── join_as_tenant ──────────────────────────────────────────────
    if (action === 'join_as_tenant') {
      const inviteCode = body.invite_code as string;

      if (!inviteCode?.trim()) {
        return Response.json({ error: 'invite_code is required' }, { status: 400 });
      }

      const profile = await findProfileByCode('tenant_invite_code', inviteCode);
      if (!profile) {
        return Response.json({ error: 'Invalid invite code' }, { status: 404 });
      }

      const profileId = profile.id as string;

      if (await checkDuplicate(profileId)) {
        return Response.json({ error: 'You are already a member of this workspace.' }, { status: 409 });
      }

      const displayName = getDisplayName();

      // Create workspace member record
      await entities.PMWorkspaceMember.create({
        profile_id: profileId,
        user_id: user.id,
        role: 'tenant',
        name: displayName,
        status: 'active',
        joined_at: new Date().toISOString(),
      });

      // Create PMTenant record (pending until admin assigns property)
      try {
        await entities.PMTenant.create({
          profile_id: profileId,
          user_id: user.id,
          first_name: displayName.split(' ')[0] || displayName,
          last_name: displayName.split(' ').slice(1).join(' ') || '',
          email: (user as Record<string, unknown>).email as string || '',
          phone: '',
          status: 'pending',
        });
      } catch (err: unknown) {
        // PMTenant entity may not exist yet — non-critical
        console.error('PMTenant create (non-critical):', err);
      }

      return Response.json({
        success: true,
        profile_id: profileId,
        role: 'tenant',
        workspace_name: (profile.workspace_name as string) || (profile.business_name as string) || 'Property Management',
      });
    }

    // ── join_as_owner ───────────────────────────────────────────────
    if (action === 'join_as_owner') {
      const inviteCode = body.invite_code as string;
      const name = body.name as string;

      if (!inviteCode?.trim()) {
        return Response.json({ error: 'invite_code is required' }, { status: 400 });
      }

      const profile = await findProfileByCode('owner_invite_code', inviteCode);
      if (!profile) {
        return Response.json({ error: 'Invalid invite code' }, { status: 404 });
      }

      const profileId = profile.id as string;

      if (await checkDuplicate(profileId)) {
        return Response.json({ error: 'You are already a member of this workspace.' }, { status: 409 });
      }

      const displayName = name?.trim() || getDisplayName();

      // Create workspace member record
      await entities.PMWorkspaceMember.create({
        profile_id: profileId,
        user_id: user.id,
        role: 'owner',
        name: displayName,
        status: 'active',
        joined_at: new Date().toISOString(),
      });

      // Create PMOwner record so they appear in ownership management
      try {
        await entities.PMOwner.create({
          profile_id: profileId,
          user_id: user.id,
          name: displayName,
          email: (user as Record<string, unknown>).email as string || '',
          role: 'owner',
        });
      } catch (err: unknown) {
        console.error('PMOwner create (non-critical):', err);
      }

      return Response.json({
        success: true,
        profile_id: profileId,
        role: 'owner',
        workspace_name: (profile.workspace_name as string) || (profile.business_name as string) || 'Property Management',
      });
    }

    // ── join_as_manager ─────────────────────────────────────────────
    if (action === 'join_as_manager') {
      const inviteCode = body.invite_code as string;
      const name = body.name as string;

      if (!inviteCode?.trim()) {
        return Response.json({ error: 'invite_code is required' }, { status: 400 });
      }
      if (!name?.trim()) {
        return Response.json({ error: 'name is required' }, { status: 400 });
      }

      const profile = await findProfileByCode('manager_invite_code', inviteCode);
      if (!profile) {
        return Response.json({ error: 'Invalid invite code' }, { status: 404 });
      }

      const profileId = profile.id as string;

      if (await checkDuplicate(profileId)) {
        return Response.json({ error: 'You are already a member of this workspace.' }, { status: 409 });
      }

      await entities.PMWorkspaceMember.create({
        profile_id: profileId,
        user_id: user.id,
        role: 'property_manager',
        name: name.trim(),
        status: 'active',
        joined_at: new Date().toISOString(),
      });

      return Response.json({
        success: true,
        profile_id: profileId,
        role: 'property_manager',
        workspace_name: (profile.workspace_name as string) || (profile.business_name as string) || 'Property Management',
      });
    }

    // ── promote_to_manager ──────────────────────────────────────────
    if (action === 'promote_to_manager') {
      const memberId = body.member_id as string;
      const profileId = body.profile_id as string;

      if (!memberId?.trim()) {
        return Response.json({ error: 'member_id is required' }, { status: 400 });
      }
      if (!profileId?.trim()) {
        return Response.json({ error: 'profile_id is required' }, { status: 400 });
      }

      // Verify caller is admin (workspace owner)
      const profile = await entities.PMPropertyProfile.get(profileId);
      if (!profile || profile.user_id !== user.id) {
        return Response.json({ error: 'Only the workspace admin can promote members' }, { status: 403 });
      }

      // Fetch target member
      const targetMember = await entities.PMWorkspaceMember.get(memberId);
      if (!targetMember || targetMember.profile_id !== profileId) {
        return Response.json({ error: 'Member not found in this workspace' }, { status: 404 });
      }

      if (targetMember.role === 'property_manager' || targetMember.role === 'admin') {
        return Response.json({ error: 'Member is already a manager or admin' }, { status: 400 });
      }

      await entities.PMWorkspaceMember.update(memberId, {
        role: 'property_manager',
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('claimPMSpot error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
