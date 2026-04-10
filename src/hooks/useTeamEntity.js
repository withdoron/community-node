/**
 * useTeamEntity — the ONLY correct way to read team-scoped entities from React components.
 *
 * Direct .filter() or .list() calls on team entities (Play, TeamMember, TeamEvent,
 * TeamMessage, TeamPhoto, PlayAssignment, PlayerStats, QuizAttempt) will silently
 * return per-user filtered data due to Base44 Creator Only RLS (DEC-136).
 *
 * This hook calls the readTeamData server function, which verifies team membership
 * server-side and uses asServiceRole to bypass RLS, returning all records for the team.
 *
 * See: private/TEAM-VISIBILITY-ARCHITECTURE.md for full architecture context.
 *
 * @example
 * // Read all active plays for a team
 * const { data: plays } = useTeamEntity('Play', teamId, { status: 'active' });
 *
 * // Read all team members
 * const { data: members } = useTeamEntity('TeamMember', teamId, { status: 'active' });
 *
 * // Read play assignments (child entity, scoped by play_id)
 * const { data: assignments } = useTeamEntity('PlayAssignment', teamId, { play_id: playId });
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Fetch team-scoped data via readTeamData server function.
 * Use this directly in mutation callbacks, effects, or non-React contexts.
 * For React components, prefer the useTeamEntity hook.
 *
 * @param {string} entity - Entity name (Play, TeamMember, TeamEvent, etc.)
 * @param {string} teamId - Team ID for membership verification
 * @param {Object} [filter={}] - Additional filter params (e.g., { status: 'active' })
 * @returns {Promise<Array>} Records for this team
 */
export async function fetchTeamData(entity, teamId, filter = {}) {
  if (!teamId) return [];
  try {
    const result = await base44.functions.invoke('readTeamData', {
      entity,
      team_id: teamId,
      filter,
    });
    console.log('fetchTeamData raw result:', entity, typeof result, Array.isArray(result), result);
    const data = result?.data?.data;
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`fetchTeamData(${entity}, ${teamId}) failed:`, err?.message || err);
    return [];
  }
}

/**
 * React Query hook for reading team-scoped entities.
 *
 * @param {string} entity - Entity name
 * @param {string} teamId - Team ID
 * @param {Object} [filter={}] - Additional filters
 * @param {Object} [options={}] - React Query options (enabled, staleTime, etc.)
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useTeamEntity(entity, teamId, filter = {}, options = {}) {
  const filterKey = JSON.stringify(filter);
  return useQuery({
    queryKey: ['team-entity', entity, teamId, filterKey],
    queryFn: () => fetchTeamData(entity, teamId, filter),
    enabled: !!teamId && (options.enabled !== false),
    ...options,
  });
}
