// readTeamData — generic server function for reading team-scoped entities.
// Bypasses Creator Only RLS via asServiceRole after verifying team membership.
// This is the ONLY correct way to read shared team data.
//
// Why this exists: Base44 Creator Only RLS (DEC-136) restricts reads to the
// record creator's identity. Team data is shared — everyone on the team should
// see all of it. This function verifies membership server-side, then reads via
// asServiceRole to bypass RLS while preserving the security boundary.
//
// See: private/TEAM-VISIBILITY-ARCHITECTURE.md for full architecture context.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Entities that have a team_id field and should be scoped by it automatically.
const TEAM_ID_ENTITIES = [
  'Play',
  'TeamMember',
  'TeamEvent',
  'TeamMessage',
  'TeamPhoto',
  'PlayerStats',
  'QuizAttempt',
];

// Entities that are team-scoped but accessed via a parent FK (e.g., play_id).
// These still require team_id for membership verification, but the query
// uses the caller-provided filter instead of adding team_id to the query.
const CHILD_ENTITIES = ['PlayAssignment'];

// Complete whitelist — only these entities can be read through this function.
const ALLOWED_ENTITIES = [...TEAM_ID_ENTITIES, ...CHILD_ENTITIES];

// Safe string comparison — handles ObjectId, number, null, undefined.
// Copied from agentScopedQuery (same SDK version, same proven pattern).
function idMatch(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── Authenticate ──────────────────────────────────────────────
    const user = await base44.auth.me();
    if (!user || !user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Parse body ────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return Response.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const entity = body.entity as string;
    const teamId = body.team_id as string;
    const filter = (body.filter as Record<string, unknown>) || {};

    // ── Validate required params ──────────────────────────────────
    if (!entity || typeof entity !== 'string') {
      return Response.json({ error: 'entity is required (string)' }, { status: 400 });
    }
    if (!teamId || typeof teamId !== 'string') {
      return Response.json({ error: 'team_id is required (string)' }, { status: 400 });
    }
    if (!ALLOWED_ENTITIES.includes(entity)) {
      return Response.json(
        { error: `Entity "${entity}" is not a team-scoped entity. Allowed: ${ALLOWED_ENTITIES.join(', ')}` },
        { status: 400 }
      );
    }

    const entities = base44.asServiceRole.entities;

    // ── Verify team membership ────────────────────────────────────
    // The requesting user must have an active TeamMember record for this team.
    // This is the membrane — only team members pass through.
    //
    // Pattern: .list() + JS filter (matches agentScopedQuery lines 172-173).
    // SDK 0.8.23's .filter() does not return cross-creator records via
    // asServiceRole. The .list() + idMatch() pattern is proven on this SDK.
    const allMembers = await entities.TeamMember.list();
    const allMemberList = Array.isArray(allMembers) ? allMembers : [];
    const activeMember = allMemberList.find(
      (m: Record<string, unknown>) =>
        idMatch(m.team_id, teamId) &&
        idMatch(m.user_id, user.id) &&
        m.status === 'active'
    );

    if (!activeMember) {
      return Response.json({ error: 'Not a member of this team' }, { status: 403 });
    }

    // ── Read data ─────────────────────────────────────────────────
    // Use asServiceRole .list() to bypass Creator Only RLS, then scope
    // in JavaScript. Same pattern as agentScopedQuery (lines 172-173).
    const allRecords = await entities[entity].list();
    const allRecordList = Array.isArray(allRecords) ? allRecords : [];

    // For entities with team_id: scope by team_id + apply additional filters.
    // For child entities (PlayAssignment): apply caller-provided filter only.
    const recordList = allRecordList.filter((r: Record<string, unknown>) => {
      if (TEAM_ID_ENTITIES.includes(entity)) {
        if (!idMatch(r.team_id, teamId)) return false;
      }
      // Apply additional filters (e.g., { status: 'active' }, { play_id: '...' })
      for (const [key, val] of Object.entries(filter)) {
        if (!idMatch(r[key], val)) return false;
      }
      return true;
    });

    return Response.json({
      success: true,
      data: recordList,
      role: (activeMember as Record<string, unknown>).role,
    });
  } catch (error) {
    console.error('readTeamData error:', error);
    return Response.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
});
