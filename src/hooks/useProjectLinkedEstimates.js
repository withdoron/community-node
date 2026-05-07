import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Workspace-wide estimates + project_id → estimate map for the empty-field
 * link derivation pattern. Established by 2111d11 (bidirectional read) and
 * 5f35c0f (list grouping) — extracted here once 3+ surfaces needed the same
 * lookup (DEC-148 "two is coincidence, three is a pattern").
 *
 * Every project↔estimate consuming surface (Project Detail header, flat list,
 * tile drill-in subtitles, FSLog project picker, FSDocument client filter)
 * uses this hook + the deriveProjectClient pure fn below to chain through
 * the link when a project's own client_id is empty.
 *
 * Multi-estimate edge case: a project can carry more than one linked estimate
 * (the original convertMutation estimate plus a duplicate). The map prefers
 * the most-recently-created estimate that carries a client_id. Skipping
 * null-client_id upgrades prevents a fresh blank duplicate from blanking
 * out an older entry that has useful client info.
 *
 * Cache key matches FieldServiceEstimates' canonical `['fs-estimates',
 * profileId]` so existing FSEstimate mutations (which use bare-prefix
 * `['fs-estimates']` invalidation per DEC-202) cascade automatically.
 */
export function useProjectLinkedEstimates(profileId) {
  const { data: estimates = [] } = useQuery({
    queryKey: ['fs-estimates', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      try {
        const list = await base44.entities.FSEstimate.filter({ profile_id: profileId });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch {
        return [];
      }
    },
    enabled: !!profileId,
  });

  const projectIdToEstimate = useMemo(
    () => buildProjectIdToEstimateMap(estimates),
    [estimates]
  );

  return { estimates, projectIdToEstimate };
}

/**
 * Pure map builder. Useful when a consumer already has a workspace-wide
 * estimates list in scope (e.g., FieldServiceDocuments' CreateDocumentFlow
 * receives `estimates` as a prop) and doesn't want to refetch via the hook.
 * Same multi-estimate dedup rule as the hook.
 */
export function buildProjectIdToEstimateMap(estimates) {
  const map = {};
  [...(estimates || [])]
    .sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''))
    .forEach((e) => {
      if (!e.project_id) return;
      if (!e.client_id && map[e.project_id]) return;
      map[e.project_id] = e;
    });
  return map;
}

/**
 * Pure derivation chain. Direct field always wins (explicit user intent is
 * sacred); empty falls through to the linked estimate's client; only truly
 * orphaned projects return null.
 *
 * Returns { clientId, clientName, source } where `source` is:
 *   'project'  — explicit project.client_id
 *   'estimate' — derived from linked estimate.client_id
 *   'inline'   — denormalized project.client_name only (no FK either side)
 *   null       — no client info anywhere
 *
 * `source` lets consumers decide whether to render a clickable link to the
 * client detail (only safe when there's an actual client id).
 */
export function deriveProjectClient(project, projectIdToEstimate, clientMap) {
  if (!project) return { clientId: null, clientName: null, source: null };

  const linkedEst = projectIdToEstimate?.[project.id];
  const directId = project.client_id || null;
  const derivedId = directId || linkedEst?.client_id || null;

  if (derivedId) {
    const liveClient = clientMap?.[derivedId];
    const name =
      liveClient?.name ||
      (directId ? project.client_name : null) ||
      linkedEst?.client_name ||
      project.client_name ||
      null;
    return {
      clientId: derivedId,
      clientName: name,
      source: directId ? 'project' : 'estimate',
    };
  }

  // No FK either side — fall back to denormalized inline labels.
  const inlineName = project.client_name || linkedEst?.client_name || null;
  return {
    clientId: null,
    clientName: inlineName,
    source: inlineName ? 'inline' : null,
  };
}
