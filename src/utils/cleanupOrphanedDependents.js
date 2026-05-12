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
 * Sequential per-entity-type (one-shot console invocation; rate-limit budget
 * not at risk from a low-cadence single call). Soft 429 retry baked in via
 * the same withRetry helper as the cascade.
 *
 * Requires the FSProject `is_unassigned` field from base44-prompts/
 * add-fsproject-soft-delete.md to be published first.
 *
 * Invocation (browser DevTools, logged in as the workspace owner):
 *   await window.cleanupOrphanedDependents('<profile_id>', '<user_id>');
 *
 * @param {string} profileId — FieldServiceProfile.id whose orphans to clean
 * @param {string} actingUserId — Users.id stamping the audit trail
 * @returns {Promise<{ workspace_id: string, sentinel_id: string, orphans_cleaned: Record<string, number>, total: number }>}
 */
const RETRY_DELAYS_MS = [250, 500, 1000];

function is429(err) {
  if (!err) return false;
  if (err.status === 429) return true;
  if (err.response?.status === 429) return true;
  const msg = String(err.message || '');
  return /\b429\b/.test(msg) || /rate.?limit/i.test(msg);
}

async function withRetry(fn, label) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!is429(err) || attempt === RETRY_DELAYS_MS.length) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  throw new Error(`withRetry: exhausted retries for ${label}`);
}

export async function cleanupOrphanedDependents(profileId, actingUserId) {
  if (!profileId) throw new Error('cleanupOrphanedDependents: profileId is required');

  // Build the live-project id-set for this workspace.
  const allProjects = await withRetry(
    () => base44.entities.FSProject.list(),
    'list FSProject (cleanup)',
  );
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

  // Sequential per-entity-type. Cleanup is a one-shot operation invoked
  // manually; rate-limit budget pressure is low. Per-entity try/catch
  // keeps cleanup resilient — if one entity type fails after retries,
  // others can still proceed; missed orphans persist for re-run.
  for (const entityType of DEPENDENT_ENTITIES) {
    let candidates;
    try {
      const raw = await withRetry(
        () => base44.entities[entityType].filter({ profile_id: profileId }),
        `cleanup list ${entityType} for ${profileId}`,
      );
      candidates = Array.isArray(raw) ? raw : raw ? [raw] : [];
    } catch (err) {
      console.warn(`[OrphanCleanup] list ${entityType} for ${profileId} failed after retries:`, err);
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
      // Use the same withRetry on each update; sequential per-orphan is
      // fine for cleanup (typically a handful of orphans per workspace).
      let cleaned = 0;
      for (const orphan of orphans) {
        try {
          await withRetry(
            () => base44.entities[entityType].update(orphan.id, { project_id: sentinelRow.id }),
            `cleanup update ${entityType} ${orphan.id}`,
          );
          cleaned += 1;
        } catch (err) {
          console.warn(`[OrphanCleanup] update ${entityType} ${orphan.id} failed:`, err);
        }
      }
      orphansCleaned[entityType] = cleaned;
      total += cleaned;
    } catch (err) {
      console.warn(`[OrphanCleanup] sentinel resolve for ${entityType} failed:`, err);
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
