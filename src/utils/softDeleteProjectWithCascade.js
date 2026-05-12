import { base44 } from '@/api/base44Client';

/**
 * Project-deletion-with-dependents cascade (IF-008 Session 1 + rate-limit fix).
 *
 * Dependent entity inventory (entities carrying `project_id` FK to FSProject).
 * Order matters: dependents touched first, parent project last — a mid-failure
 * leaves recoverable orphans rather than a stranded parent. Mirrors the
 * deleteBusinessCascade shape (Living Feet candidate — DEC-146 — second
 * cascade-delete instance; promote to a registry at three).
 *
 * Note: FSInspection + FSLineItem are intentionally absent. FSInspection has
 * no Base44 entity definition; FSLineItem lives as embedded JSON inside
 * FSEstimate.line_items, not as a standalone entity.
 */
export const DEPENDENT_ENTITIES = [
  'FSPayment',
  'FSDailyLog',
  'FSEstimate',
  'FSChangeOrder',
  'FSMaterialEntry',
  'FSLaborEntry',
  'FSDocument',
  'FSPermit',
  'FSDailyPhoto',
  'Engagement',
];

/**
 * Chunk size for parallel Base44 requests. 10 entity types fired
 * simultaneously hits Base44's rate limit (429) — observed in production
 * on 2026-05-11 during the "test test test" delete attempt. 3 keeps the
 * dispatch well under the cap while staying fast: 10 entities = 4 chunks =
 * ~4 round trips total. The Base44 docs don't publish a concrete cap so
 * this number is empirical; raise it once the cap is known.
 */
const CHUNK_SIZE = 3;
const RETRY_DELAYS_MS = [250, 500, 1000];

function is429(err) {
  if (!err) return false;
  if (err.status === 429) return true;
  if (err.response?.status === 429) return true;
  const msg = String(err.message || '');
  return /\b429\b/.test(msg) || /rate.?limit/i.test(msg);
}

/**
 * Run an async operation with exponential-backoff retry on Base44 429
 * (Rate limit exceeded). Other errors throw immediately — only rate limit
 * is retried. After all delays exhaust, the final error bubbles up.
 */
async function withRetry(fn, label) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!is429(err) || attempt === RETRY_DELAYS_MS.length) {
        throw err;
      }
      const delay = RETRY_DELAYS_MS[attempt];
      console.warn(`[ProjectCascade] ${label} hit 429; retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  // Unreachable — loop body always returns or throws.
  throw new Error(`withRetry: exhausted retries for ${label}`);
}

/**
 * Process an array of items in chunks of size N, awaiting each chunk
 * sequentially. Returns results in the same order as input.
 *
 * This is the load-bearing fan-out control for the cascade: by capping
 * concurrent in-flight requests at CHUNK_SIZE we stay under Base44's
 * rate limit while still parallelizing within each chunk.
 */
async function chunkedMap(items, chunkSize, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

/**
 * Fetch live (non-soft-deleted) dependents of a project for a given
 * entity type. Throws on persistent error after retries — does NOT swallow
 * errors as empty arrays (that masking is what produced the false-positive
 * success in the 2026-05-11 production bug).
 */
export async function listDependentsFor(entityType, projectId) {
  const result = await withRetry(
    () => base44.entities[entityType].filter({ project_id: projectId }),
    `list ${entityType} for ${projectId}`,
  );
  const arr = Array.isArray(result) ? result : result ? [result] : [];
  return arr.filter((r) => !r.deleted_at);
}

/**
 * Update a single dependent record with retry on 429.
 */
async function updateWithRetry(entityType, recordId, patch) {
  return withRetry(
    () => base44.entities[entityType].update(recordId, patch),
    `update ${entityType} ${recordId}`,
  );
}

/**
 * Count live dependents per entity type for a given project.
 * Returns { [entityType]: count, _total: number }. Throws on persistent
 * 429 or other errors after retries — callers must surface the failure
 * (don't render the modal in a "0 dependents" state if the count failed).
 */
export async function countDependents(projectId) {
  const lists = await chunkedMap(
    DEPENDENT_ENTITIES,
    CHUNK_SIZE,
    (entityType) => listDependentsFor(entityType, projectId),
  );
  const counts = { _total: 0 };
  DEPENDENT_ENTITIES.forEach((entityType, idx) => {
    counts[entityType] = lists[idx].length;
    counts._total += lists[idx].length;
  });
  return counts;
}

/**
 * Find or create the workspace's Unassigned sentinel project. Idempotent.
 * One row per profile_id with `is_unassigned: true` and `deleted_at` null.
 */
export async function findOrCreateUnassignedSentinel(profileId, fallbackUserId) {
  // List + client-side filter per the Base44 .filter() service-role-created
  // records quirk documented in CLAUDE.md.
  const all = await withRetry(
    () => base44.entities.FSProject.list(),
    'list FSProject (sentinel lookup)',
  );
  const arr = Array.isArray(all) ? all : all ? [all] : [];
  const existing = arr.find(
    (p) => p.profile_id === profileId && p.is_unassigned === true && !p.deleted_at,
  );
  if (existing) return existing;

  const created = await withRetry(
    () =>
      base44.entities.FSProject.create({
        profile_id: profileId,
        user_id: fallbackUserId,
        name: 'Unassigned',
        status: 'active',
        is_unassigned: true,
        notes:
          'System bucket for orphaned dependents whose parent project was deleted. Re-parented records can be reviewed and reassigned later. Do not delete this row.',
      }),
    'create Unassigned sentinel',
  );
  return created;
}

/**
 * Soft-delete a project, choosing how its dependents are handled.
 *
 * Throws on ANY persistent failure — silent partial-success is the bug class
 * the 2026-05-11 rate-limit incident surfaced. Each dependent-list call has
 * its own retry-on-429; if the retries exhaust, the cascade aborts before
 * touching any data and the user can retry from a clean state.
 *
 * Idempotent on retry: dependents already soft-deleted (deleted_at set) are
 * filtered out by listDependentsFor; the parent short-circuits if it's
 * already soft-deleted.
 *
 * @param {string} projectId
 * @param {'delete'|'reassign'|'unassigned'} mode
 * @param {{ reassignTo?: string, actingUserId?: string }} [options]
 * @returns {Promise<{ success: boolean, dependentsAffected: Record<string, number>, sentinelId?: string, alreadyDeleted?: boolean }>}
 */
export async function softDeleteProjectWithCascade(projectId, mode, options = {}) {
  if (!projectId) throw new Error('softDeleteProjectWithCascade: projectId is required');
  if (!['delete', 'reassign', 'unassigned'].includes(mode)) {
    throw new Error(`softDeleteProjectWithCascade: invalid mode "${mode}"`);
  }
  const actingUserId = options.actingUserId || null;

  // 1. Fetch the project. Profile_id is load-bearing for sentinel scoping.
  const projects = await withRetry(
    () => base44.entities.FSProject.filter({ id: projectId }),
    `lookup project ${projectId}`,
  );
  const project = Array.isArray(projects) ? projects[0] : projects;
  if (!project) throw new Error(`Project ${projectId} not found`);

  // 1a. Idempotency short-circuit: project is already soft-deleted. A retry
  //     after a partial-success run lands here. The dependent processing
  //     skips already-soft-deleted records anyway, so re-running the cascade
  //     is mostly a no-op — but short-circuiting here gives a cleaner
  //     "already deleted" signal to the caller.
  if (project.deleted_at) {
    return { success: true, dependentsAffected: {}, alreadyDeleted: true };
  }

  // 2. Verify reassign target if applicable, before touching anything.
  if (mode === 'reassign') {
    if (!options.reassignTo) {
      throw new Error('softDeleteProjectWithCascade: options.reassignTo is required for reassign mode');
    }
    if (options.reassignTo === projectId) {
      throw new Error('softDeleteProjectWithCascade: cannot reassign a project to itself');
    }
    const targets = await withRetry(
      () => base44.entities.FSProject.filter({ id: options.reassignTo }),
      `lookup reassign target ${options.reassignTo}`,
    );
    const target = Array.isArray(targets) ? targets[0] : targets;
    if (!target) throw new Error(`Reassign target ${options.reassignTo} not found`);
    if (target.profile_id !== project.profile_id) {
      throw new Error('Reassign target must be in the same workspace');
    }
    if (target.deleted_at) {
      throw new Error('Reassign target has been soft-deleted; pick a live project');
    }
    if (target.is_unassigned === true) {
      throw new Error('Reassign target cannot be the Unassigned sentinel — use mode="unassigned" instead');
    }
  }

  // 3. Resolve the sentinel for unassigned mode (lazy create).
  let sentinelId;
  if (mode === 'unassigned') {
    const sentinel = await findOrCreateUnassignedSentinel(
      project.profile_id,
      actingUserId || project.user_id,
    );
    sentinelId = sentinel.id;
  }

  // 4. Cascade across dependents. Chunked Promise.all to stay under
  //    Base44's rate-limit cap. listDependentsFor throws on persistent
  //    429 — if any single entity's check fails, the whole chunkedMap
  //    rejects and the cascade aborts (no partial soft-deletes hidden
  //    behind a "success" toast).
  const dependentLists = await chunkedMap(
    DEPENDENT_ENTITIES,
    CHUNK_SIZE,
    (entityType) => listDependentsFor(entityType, projectId),
  );

  // Build the flat list of write tasks across all entity types. Tasks
  // carry their entityType so dependentsAffected gets the right tally.
  const dependentsAffected = {};
  const writeTasks = [];
  DEPENDENT_ENTITIES.forEach((entityType, idx) => {
    const records = dependentLists[idx];
    dependentsAffected[entityType] = records.length;
    if (records.length === 0) return;
    let patch;
    if (mode === 'delete') {
      patch = { deleted_at: new Date().toISOString(), deleted_by: actingUserId };
    } else if (mode === 'reassign') {
      patch = { project_id: options.reassignTo };
    } else {
      patch = { project_id: sentinelId };
    }
    records.forEach((r) => writeTasks.push({ entityType, recordId: r.id, patch }));
  });

  // Chunk-execute writes the same way as reads. Writes also count against
  // the rate-limit budget; for projects with many dependents (Patricia's
  // ADU has 40+ line items + daily logs) this matters.
  if (writeTasks.length > 0) {
    await chunkedMap(writeTasks, CHUNK_SIZE, (task) =>
      updateWithRetry(task.entityType, task.recordId, task.patch),
    );
  }

  // 5. Soft-delete the parent project LAST. If this throws, the dependent
  //    cascade above has already landed; a retry sees the dependents
  //    already-handled (via deleted_at filter or project_id != projectId)
  //    and short-circuits cleanly through the alreadyDeleted check on next
  //    run if this update happens to succeed despite the throw on response.
  await withRetry(
    () =>
      base44.entities.FSProject.update(projectId, {
        deleted_at: new Date().toISOString(),
        deleted_by: actingUserId,
      }),
    `soft-delete parent project ${projectId}`,
  );

  return {
    success: true,
    dependentsAffected,
    ...(sentinelId ? { sentinelId } : {}),
  };
}
