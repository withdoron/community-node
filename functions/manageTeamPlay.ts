// Team play management via service role — bypasses Creator Only RLS
// Allows any coach to create, update, delete Play and PlayAssignment
// entities on their team, regardless of who originally created the record.
// Players can CRUD experimental plays they own (DEC-064 Creation Station).
// Keeps 'assistant_coach' as backward-compatible fallback for existing records.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function isTeamCoach(
  base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  userId: string,
  teamId: string
): Promise<boolean> {
  const members = await base44.asServiceRole.entities.TeamMember.filter({
    team_id: teamId,
    user_id: userId,
  });
  const memberList = Array.isArray(members) ? members : [];
  return memberList.some(
    (m: { role?: string }) => m.role === 'coach' || m.role === 'assistant_coach'
  );
}

async function isTeamMember(
  base44: Awaited<ReturnType<typeof createClientFromRequest>>,
  userId: string,
  teamId: string
): Promise<boolean> {
  const members = await base44.asServiceRole.entities.TeamMember.filter({
    team_id: teamId,
    user_id: userId,
  });
  const memberList = Array.isArray(members) ? members : [];
  return memberList.length > 0;
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

    const { action, entity_type, entity_id, data, team_id } = body;

    // Validate required fields
    if (!action || typeof action !== 'string') {
      return Response.json({ error: 'action is required (create/update/delete)' }, { status: 400 });
    }
    if (!entity_type || (entity_type !== 'play' && entity_type !== 'play_assignment')) {
      return Response.json({ error: 'entity_type must be "play" or "play_assignment"' }, { status: 400 });
    }
    if (!team_id || typeof team_id !== 'string') {
      return Response.json({ error: 'team_id is required' }, { status: 400 });
    }

    // Step 1: Check caller role
    const isCoach = await isTeamCoach(base44, user.id, team_id as string);

    // Step 2: If not coach, check if team member and apply granular rules
    if (!isCoach) {
      const isMember = await isTeamMember(base44, user.id, team_id as string);
      if (!isMember) {
        return Response.json({ error: 'Forbidden — must be a member of this team' }, { status: 403 });
      }

      // Player path: only allowed to CRUD experimental plays they own
      const Play = base44.asServiceRole.entities.Play;
      const PlayAssignment = base44.asServiceRole.entities.PlayAssignment;

      if (entity_type === 'play') {
        if (action === 'create') {
          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return Response.json({ error: 'data object is required for create' }, { status: 400 });
          }
          // Force experimental status and ownership
          const playData = { ...(data as Record<string, unknown>), status: 'experimental', created_by: user.id };
          const created = await Play.create(playData);
          return Response.json(created);
        }

        if (action === 'update' || action === 'delete') {
          if (!entity_id || typeof entity_id !== 'string') {
            return Response.json({ error: 'entity_id is required' }, { status: 400 });
          }
          // Fetch existing play to verify ownership + experimental status
          const existing = await Play.get(entity_id as string);
          if (!existing || (existing.status || 'active') !== 'experimental' || existing.created_by !== user.id) {
            return Response.json({ error: 'Forbidden — can only modify your own experimental plays' }, { status: 403 });
          }

          if (action === 'update') {
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
              return Response.json({ error: 'data object is required for update' }, { status: 400 });
            }
            // Prevent status escalation
            const updateData = { ...(data as Record<string, unknown>) };
            if (updateData.status && updateData.status !== 'experimental') {
              return Response.json({ error: 'Forbidden — only coaches can promote plays' }, { status: 403 });
            }
            const updated = await Play.update(entity_id as string, updateData);
            return Response.json(updated);
          }

          // delete
          await Play.delete(entity_id as string);
          return Response.json({ success: true });
        }
      }

      if (entity_type === 'play_assignment') {
        // Look up parent play to verify ownership
        let parentPlayId: string | undefined;

        if (action === 'create') {
          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return Response.json({ error: 'data object is required for create' }, { status: 400 });
          }
          parentPlayId = (data as Record<string, unknown>).play_id as string;
        } else {
          // For update/delete, fetch the assignment first to get play_id
          if (!entity_id || typeof entity_id !== 'string') {
            return Response.json({ error: 'entity_id is required' }, { status: 400 });
          }
          const assignment = await PlayAssignment.get(entity_id as string);
          if (!assignment) {
            return Response.json({ error: 'Assignment not found' }, { status: 404 });
          }
          parentPlayId = assignment.play_id;
        }

        if (!parentPlayId) {
          return Response.json({ error: 'play_id is required for assignment operations' }, { status: 400 });
        }

        const parentPlay = await Play.get(parentPlayId);
        if (!parentPlay || (parentPlay.status || 'active') !== 'experimental' || parentPlay.created_by !== user.id) {
          return Response.json({ error: 'Forbidden — can only modify assignments on your own experimental plays' }, { status: 403 });
        }

        if (action === 'create') {
          const created = await PlayAssignment.create(data as Record<string, unknown>);
          return Response.json(created);
        }
        if (action === 'update') {
          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return Response.json({ error: 'data object is required for update' }, { status: 400 });
          }
          const updated = await PlayAssignment.update(entity_id as string, data as Record<string, unknown>);
          return Response.json(updated);
        }
        if (action === 'delete') {
          await PlayAssignment.delete(entity_id as string);
          return Response.json({ success: true });
        }
      }

      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Coach path: full access (existing behavior)
    const Play = base44.asServiceRole.entities.Play;
    const PlayAssignment = base44.asServiceRole.entities.PlayAssignment;
    const entity = entity_type === 'play' ? Play : PlayAssignment;

    if (action === 'create') {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return Response.json({ error: 'data object is required for create' }, { status: 400 });
      }
      const created = await entity.create(data as Record<string, unknown>);
      return Response.json(created);
    }

    if (action === 'update') {
      if (!entity_id || typeof entity_id !== 'string') {
        return Response.json({ error: 'entity_id is required for update' }, { status: 400 });
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return Response.json({ error: 'data object is required for update' }, { status: 400 });
      }
      const updated = await entity.update(entity_id as string, data as Record<string, unknown>);
      return Response.json(updated);
    }

    if (action === 'delete') {
      if (!entity_id || typeof entity_id !== 'string') {
        return Response.json({ error: 'entity_id is required for delete' }, { status: 400 });
      }
      await entity.delete(entity_id as string);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action — must be create, update, or delete' }, { status: 400 });
  } catch (error) {
    console.error('manageTeamPlay error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
