// Claim a spot on a Team workspace — bypasses Creator Only RLS
// Three actions: join_as_parent, join_as_coach, promote_to_coach
// Mirrors claimWorkspaceSpot.ts fractal pattern (DEC-091).

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

    // ── join_as_parent ──────────────────────────────────────────────
    if (action === 'join_as_parent') {
      const inviteCode = body.invite_code as string;
      const linkedPlayerIds = body.linked_player_ids as string[];

      if (!inviteCode?.trim()) {
        return Response.json({ error: 'invite_code is required' }, { status: 400 });
      }
      if (!Array.isArray(linkedPlayerIds) || linkedPlayerIds.length === 0) {
        return Response.json({ error: 'linked_player_ids is required (array of TeamMember IDs)' }, { status: 400 });
      }

      // Find team by family invite code
      const teams = await base44.asServiceRole.entities.Team.filter({
        invite_code: inviteCode.trim(),
        status: 'active',
      });
      const teamList = Array.isArray(teams) ? teams : [];
      const team = teamList[0];

      if (!team) {
        return Response.json({ error: 'Invalid invite code' }, { status: 404 });
      }

      // Check if user already has a member record on this team
      const existing = await base44.asServiceRole.entities.TeamMember.filter({
        team_id: team.id,
        user_id: user.id,
      });
      const existingList = Array.isArray(existing) ? existing : [];
      if (existingList.length > 0) {
        // Already a member (e.g. coach) — link children without creating new records
        const allMembersForLink = await base44.asServiceRole.entities.TeamMember.filter({
          team_id: team.id,
          status: 'active',
        });
        const memberListForLink = Array.isArray(allMembersForLink) ? allMembersForLink : [];
        const memberIdSetForLink = new Set(memberListForLink.map((m: { id: string }) => m.id));

        for (const pid of linkedPlayerIds) {
          if (!memberIdSetForLink.has(pid)) {
            return Response.json({ error: `Player ${pid} not found on this team` }, { status: 404 });
          }
        }

        // Add user to parent_user_ids array on each linked player's TeamMember record
        const linkedNames: string[] = [];
        for (const playerId of linkedPlayerIds) {
          const player = memberListForLink.find((m: { id: string }) => m.id === playerId) as Record<string, unknown> | undefined;
          // Read existing array, add if not present
          const existing_ids = Array.isArray((player as Record<string, unknown>)?.parent_user_ids)
            ? [...((player as Record<string, unknown>).parent_user_ids as string[])]
            : (player as Record<string, unknown>)?.parent_user_id
              ? [(player as Record<string, unknown>).parent_user_id as string]
              : [];
          if (!existing_ids.includes(user.id)) {
            existing_ids.push(user.id);
          }
          await base44.asServiceRole.entities.TeamMember.update(playerId, {
            parent_user_ids: existing_ids,
          });
          linkedNames.push((player?.jersey_name as string) || 'Player');
        }

        return Response.json({
          success: true,
          team_id: team.id,
          role: (existingList[0] as Record<string, unknown>).role,
          team_name: team.name || 'Team',
          linked_players: linkedNames,
          already_member: true,
        });
      }

      // Verify each linked_player_id belongs to this team
      const allMembers = await base44.asServiceRole.entities.TeamMember.filter({
        team_id: team.id,
        status: 'active',
      });
      const memberList = Array.isArray(allMembers) ? allMembers : [];
      const memberIds = new Set(memberList.map((m: { id: string }) => m.id));

      for (const pid of linkedPlayerIds) {
        if (!memberIds.has(pid)) {
          return Response.json({ error: `Player ${pid} not found on this team` }, { status: 404 });
        }
      }

      // Derive display name from user
      const displayName =
        (user as Record<string, unknown>).data
          ? ((user as Record<string, unknown>).data as Record<string, unknown>).display_name ||
            ((user as Record<string, unknown>).data as Record<string, unknown>).full_name
          : null;
      const jerseyName = (displayName as string) || (user as Record<string, unknown>).email || 'Parent';

      // Create one parent TeamMember per linked child + add to parent_user_ids on player
      for (const linkedPlayerId of linkedPlayerIds) {
        await base44.asServiceRole.entities.TeamMember.create({
          team_id: team.id,
          user_id: user.id,
          role: 'parent',
          jersey_name: jerseyName,
          status: 'active',
          linked_player_id: linkedPlayerId,
        });
        // Add to parent_user_ids array on the player record for context switching
        const playerRecord = await base44.asServiceRole.entities.TeamMember.get(linkedPlayerId);
        const pr = playerRecord as Record<string, unknown>;
        const currentIds = Array.isArray(pr?.parent_user_ids)
          ? [...(pr.parent_user_ids as string[])]
          : pr?.parent_user_id
            ? [pr.parent_user_id as string]
            : [];
        if (!currentIds.includes(user.id)) {
          currentIds.push(user.id);
        }
        await base44.asServiceRole.entities.TeamMember.update(linkedPlayerId, {
          parent_user_ids: currentIds,
        });
      }

      return Response.json({
        success: true,
        team_id: team.id,
        role: 'parent',
        team_name: team.name || 'Team',
      });
    }

    // ── join_as_coach ───────────────────────────────────────────────
    if (action === 'join_as_coach') {
      const coachInviteCode = body.coach_invite_code as string;
      const jerseyName = body.jersey_name as string;

      if (!coachInviteCode?.trim()) {
        return Response.json({ error: 'coach_invite_code is required' }, { status: 400 });
      }
      if (!jerseyName?.trim()) {
        return Response.json({ error: 'jersey_name is required' }, { status: 400 });
      }

      // Find team by coach invite code
      const teams = await base44.asServiceRole.entities.Team.filter({
        coach_invite_code: coachInviteCode.trim(),
        status: 'active',
      });
      const teamList = Array.isArray(teams) ? teams : [];
      const team = teamList[0];

      if (!team) {
        return Response.json({ error: 'Invalid coach invite code' }, { status: 404 });
      }

      // Check duplicate
      const existing = await base44.asServiceRole.entities.TeamMember.filter({
        team_id: team.id,
        user_id: user.id,
      });
      const existingList = Array.isArray(existing) ? existing : [];
      if (existingList.length > 0) {
        return Response.json({ error: 'You are already on this team.' }, { status: 409 });
      }

      // Create coach member
      await base44.asServiceRole.entities.TeamMember.create({
        team_id: team.id,
        user_id: user.id,
        role: 'coach',
        jersey_name: jerseyName.trim(),
        status: 'active',
      });

      return Response.json({
        success: true,
        team_id: team.id,
        role: 'coach',
        team_name: team.name || 'Team',
      });
    }

    // ── promote_to_coach ────────────────────────────────────────────
    if (action === 'promote_to_coach') {
      const memberId = body.member_id as string;

      if (!memberId?.trim()) {
        return Response.json({ error: 'member_id is required' }, { status: 400 });
      }

      // Fetch the target member
      const targetMember = await base44.asServiceRole.entities.TeamMember.get(memberId);
      if (!targetMember) {
        return Response.json({ error: 'Member not found' }, { status: 404 });
      }

      const teamId = targetMember.team_id as string;

      // Verify caller is a coach on this team
      const callerMembers = await base44.asServiceRole.entities.TeamMember.filter({
        team_id: teamId,
        user_id: user.id,
      });
      const callerList = Array.isArray(callerMembers) ? callerMembers : [];
      const isCallerCoach = callerList.some(
        (m: { role?: string }) => m.role === 'coach' || m.role === 'assistant_coach'
      );

      if (!isCallerCoach) {
        return Response.json({ error: 'Only coaches can promote members' }, { status: 403 });
      }

      // Verify target is a parent (only parents can be promoted)
      if (targetMember.role !== 'parent') {
        return Response.json({ error: 'Only parents can be promoted to coach' }, { status: 400 });
      }

      // Promote
      await base44.asServiceRole.entities.TeamMember.update(memberId, {
        role: 'coach',
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('claimTeamSpot error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
