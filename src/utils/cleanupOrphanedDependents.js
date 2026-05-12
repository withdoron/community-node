import { base44 } from '@/api/base44Client';
import {
  DEPENDENT_ENTITIES,
  findOrCreateUnassignedSentinel,
} from './softDeleteProjectWithCascade';

/**
 * One-shot orphan cleanup for IF-008 Session 1.
 *
 * For a given workspace (profile_id), find every dependent record whose
 * project_id points at a non-existent or soft-deleted parent project, and
 * re-parent it to the workspace's Unassigned sentinel. Real records survive
 * deliberately — orphan payments, daily logs, estimates, etc. are not lost.
 *
 * Idempotent: re-running yields `orphans_cleaned: { ...all zeros... }` and
 * does NOT duplicate the sentinel (findOrCreateUnassignedSentinel handles
 * the dedup).
 *
 * Requires the FSProject `is_unassigned` field from base44-prompts/
 * add-fsproject-soft-delete.md to be published first.
 *
 * Invocation (browser DevTools, logged in as the workspace owner):
 *   const m = await import('/src/utils/cleanupOrphanedDependents.js');
 *   const result = await m.cleanupOrphanedDependents('<profile_id>', '<user_id>');
 *   console.log(result);
 *
 * The function attaches itself to window (when present) for quick console
 * invocation:  window.cleanupOrphanedDependents('<profile_id>', '<user_id>')
 *
 * @param {string} profileId — FieldServiceProfile.id whose orphans to clean
 * @param {string} actingUserId — Users.id stamping the audit trail
 * @returns {Promise<{ workspace_id: string, sentinel_id: string, orphans_cleaned: Record<string, number>, total: number }>}
 */
export async function cleanupOrphanedDependents(profileId, actingUserId) {
  if (!profileId) throw new Error('cleanupOrphanedDependents: profileId is required');

  // Build the live-project id-set for this workspace.
  const allProjects = await base44.entities.FSProject.list();
  const projects = Array.isArray(allProjects) ? allProjects : allProjects ? [allProjects] : [];
  const liveProjectIds = new Set(
    projects.filter((p) => p.profile_id === profileId && !p.deleted_at).map((p) => p.id),
  );

  // Lazily create the sentinel only if at least one orphan is found.
  let sentinel = null;
  const ensureSentinel = async () => {
    if (sentinel) return sentinel;
    sentinel = await findOrCreateUnassignedSentinel(profileId, actingUserId);
    return sentinel;
  };

  const orphansCleaned = {};
  let total = 0;

  for (const entityType of DEPENDENT_ENTITIES) {
    let candidates;
    try {
      // Workspace-scoped read. `profile_id` is the canonical workspace anchor
      // across the FS family; every dependent entity carries it.
      const raw = await base44.entities[entityType].filter({ profile_id: profileId });
      candidates = Array.isArray(raw) ? raw : raw ? [raw] : [];
    } catch (err) {
      console.warn(`[OrphanCleanup] list ${entityType} for ${profileId} failed:`, err);
      orphansCleaned[entityType] = 0;
      continue;
    }

    const orphans = candidates.filter((r) => {
      if (r.deleted_at) return false; // already soft-deleted — leave alone
      if (!r.project_id) return false; // null project_id is "unlinked", not orphan
      return !liveProjectIds.has(r.project_id);
    });

    if (orphans.length === 0) {
      orphansCleaned[entityType] = 0;
      continue;
    }

    try {
      const sentinelRow = await ensureSentinel();
      await Promise.all(
        orphans.map((r) =>
          base44.entities[entityType].update(r.id, { project_id: sentinelRow.id }),
        ),
      );
      orphansCleaned[entityType] = orphans.length;
      total += orphans.length;
    } catch (err) {
      console.warn(`[OrphanCleanup] reassign ${entityType} failed:`, err);
      orphansCleaned[entityType] = 0;
    }
  }

  return {
    workspace_id: profileId,
    sentinel_id: sentinel ? sentinel.id : null,
    orphans_cleaned: orphansCleaned,
    total,
  };
}

// Expose for one-shot console invocation. Attaching a function reference is
// harmless; the function only acts under the current user's owner context.
if (typeof window !== 'undefined') {
  window.cleanupOrphanedDependents = cleanupOrphanedDependents;
}
