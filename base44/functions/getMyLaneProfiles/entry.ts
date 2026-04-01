/**
 * getMyLaneProfiles — Combine 6 profile queries into 1 server function call.
 *
 * DEC-130 query optimization: drops MyLane page load from ~17 integration
 * credits (6 separate .filter() calls) to ~2 credits (1 server function call).
 *
 * Returns all workspace profiles for the authenticated user in one response:
 *   - financeProfiles     (FinancialProfile filtered by user_id)
 *   - ownedFSProfiles     (FieldServiceProfile filtered by user_id)
 *   - propertyMgmtProfiles (PMPropertyProfile filtered by user_id)
 *   - teamMemberships     (TeamMember with status=active filtered by user_id)
 *   - teams               (Team records for each membership, status=active)
 *
 * Note: joinedFSProfiles come from localStorage (client-only) — not included here.
 *
 * Pattern: .list() + client-side filter (safe for service-role-created records).
 * See CLAUDE.md — Base44 .filter() quirk for service-role records.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Safe string comparison — handles ObjectId vs string type mismatch
function idMatch(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

Deno.serve(async (req) => {
  try {
    var base44 = createClientFromRequest(req);
    var body = await req.json();
    var user_id = body.user_id; // optional — fallback for MCP calls

    var entities = base44.asServiceRole.entities;

    // ── Resolve authenticated user ──
    var resolvedUserId = null;
    try {
      var me = await base44.auth.me();
      if (me && me.id) resolvedUserId = String(me.id);
    } catch (e) {
      // auth.me() failed — MCP or service role context
    }
    if (!resolvedUserId && user_id) {
      resolvedUserId = String(user_id);
    }
    if (!resolvedUserId) {
      return Response.json({ success: false, error: 'Could not identify the authenticated user.' }, { status: 401 });
    }

    // ── Fetch all profile types in parallel ──
    var results = await Promise.allSettled([
      entities.FinancialProfile.list(),       // [0]
      entities.FieldServiceProfile.list(),    // [1]
      entities.PMPropertyProfile.list(),      // [2]
      entities.TeamMember.list(),             // [3]
    ]);

    // Extract arrays safely — resolve or fallback to empty
    function safeList(result) {
      if (result.status === 'fulfilled') {
        var val = result.value;
        return Array.isArray(val) ? val : [];
      }
      return [];
    }

    var allFinance   = safeList(results[0]);
    var allFS        = safeList(results[1]);
    var allPM        = safeList(results[2]);
    var allMembers   = safeList(results[3]);

    // ── Filter by user ──
    var financeProfiles      = allFinance.filter(function(p) { return idMatch(p.user_id, resolvedUserId); });
    var ownedFSProfiles      = allFS.filter(function(p)      { return idMatch(p.user_id, resolvedUserId); });
    var propertyMgmtProfiles = allPM.filter(function(p)      { return idMatch(p.user_id, resolvedUserId); });
    var teamMemberships      = allMembers.filter(function(m) {
      return idMatch(m.user_id, resolvedUserId) && m.status === 'active';
    });

    // ── Resolve team records for each membership ──
    var teamIds = Array.from(new Set(
      teamMemberships.map(function(m) { return m.team_id; }).filter(Boolean).map(String)
    ));

    var teams = [];
    if (teamIds.length > 0) {
      var teamResults = await Promise.allSettled(
        teamIds.map(function(id) { return entities.Team.get(id); })
      );
      teams = teamResults
        .filter(function(r) { return r.status === 'fulfilled' && r.value && r.value.status === 'active'; })
        .map(function(r) { return r.value; });
    }

    return Response.json({
      success: true,
      user_id: resolvedUserId,
      financeProfiles: financeProfiles,
      ownedFSProfiles: ownedFSProfiles,
      propertyMgmtProfiles: propertyMgmtProfiles,
      teamMemberships: teamMemberships,
      teams: teams,
    });

  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});
