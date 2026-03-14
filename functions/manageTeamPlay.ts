// Team play management via service role — bypasses Creator Only RLS
// Allows any coach/assistant_coach to create, update, delete Play and PlayAssignment
// entities on their team, regardless of who originally created the record.

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

    // Step 1: Verify caller is coach/assistant_coach on this team
    const allowed = await isTeamCoach(base44, user.id, team_id as string);
    if (!allowed) {
      return Response.json({ error: 'Forbidden — must be a coach on this team' }, { status: 403 });
    }

    // Step 2: Perform the requested action via service role
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
