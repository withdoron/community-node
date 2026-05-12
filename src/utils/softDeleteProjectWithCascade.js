import { base44 } from '@/api/base44Client';

/**
 * Project-deletion-with-dependents cascade (IF-008 Session 1).
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

async function listLive(entityType, projectId) {
  try {
    const result = await base44.entities[entityType].filter({ project_id: projectId });
    const arr = Array.isArray(result) ? result : result ? [result] : [];
    return arr.filter((r) => !r.deleted_at);
  } catch (err) {
    console.warn(`[ProjectCascade] list ${entityType} for ${projectId} failed:`, err);
    return [];
  }
}

/**
 * Count live dependents per entity type for a given project.
 * Returns { [entityType]: count, _total: number }.
 */
export async function countDependents(projectId) {
  const counts = {};
  let total = 0;
  await Promise.all(
    DEPENDENT_ENTITIES.map(async (entityType) => {
      const records = await listLive(entityType, projectId);
      counts[entityType] = records.length;
      total += records.length;
    }),
  );
  counts._total = total;
  return counts;
}

/**
 * Find or create the workspace's Unassigned sentinel project. Idempotent.
 * One row per profile_id with `is_unassigned: true` and `deleted_at` null.
 */
export async function findOrCreateUnassignedSentinel(profileId, fallbackUserId) {
  // List + client-side filter per the Base44 .filter() service-role-created
  // records quirk documented in CLAUDE.md.
  const all = await base44.entities.FSProject.list();
  const arr = Array.isArray(all) ? all : all ? [all] : [];
  const existing = arr.find(
    (p) => p.profile_id === profileId && p.is_unassigned === true && !p.deleted_at,
  );
  if (existing) return existing;

  const created = await base44.entities.FSProject.create({
    profile_id: profileId,
    user_id: fallbackUserId,
    name: 'Unassigned',
    status: 'active',
    is_unassigned: true,
    notes:
      'System bucket for orphaned dependents whose parent project was deleted. Re-parented records can be reviewed and reassigned later. Do not delete this row.',
  });
  return created;
}

/**
 * Soft-delete a project, choosing how its dependents are handled.
 *
 * @param {string} projectId
 * @param {'delete'|'reassign'|'unassigned'} mode
 * @param {{ reassignTo?: string, actingUserId?: string }} [options]
 * @returns {Promise<{ success: boolean, dependentsAffected: Record<string, number>, sentinelId?: string }>}
 */
export async function softDeleteProjectWithCascade(projectId, mode, options = {}) {
  if (!projectId) throw new Error('softDeleteProjectWithCascade: projectId is required');
  if (!['delete', 'reassign', 'unassigned'].includes(mode)) {
    throw new Error(`softDeleteProjectWithCascade: invalid mode "${mode}"`);
  }
  const actingUserId = options.actingUserId || null;

  // 1. Fetch the project. Profile_id is load-bearing for sentinel scoping.
  const projects = await base44.entities.FSProject.filter({ id: projectId });
  const project = Array.isArray(projects) ? projects[0] : projects;
  if (!project) throw new Error(`Project ${projectId} not found`);

  // 2. Verify reassign target if applicable, before touching anything.
  if (mode === 'reassign') {
    if (!options.reassignTo) {
      throw new Error('softDeleteProjectWithCascade: options.reassignTo is required for reassign mode');
    }
    if (options.reassignTo === projectId) {
      throw new Error('softDeleteProjectWithCascade: cannot reassign a project to itself');
    }
    const targets = await base44.entities.FSProject.filter({ id: options.reassignTo });
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

  // 4. Cascade across dependents. Per-entity try/catch — a single failed
  //    entity type doesn't halt the rest. Parallel within an entity type;
  //    sequential across types to keep the log readable on failure.
  const dependentsAffected = {};
  for (const entityType of DEPENDENT_ENTITIES) {
    const records = await listLive(entityType, projectId);
    if (records.length === 0) {
      dependentsAffected[entityType] = 0;
      continue;
    }
    try {
      let updates;
      if (mode === 'delete') {
        const stamp = new Date().toISOString();
        const patch = { deleted_at: stamp, deleted_by: actingUserId };
        updates = records.map((r) => base44.entities[entityType].update(r.id, patch));
      } else if (mode === 'reassign') {
        const patch = { project_id: options.reassignTo };
        updates = records.map((r) => base44.entities[entityType].update(r.id, patch));
      } else {
        const patch = { project_id: sentinelId };
        updates = records.map((r) => base44.entities[entityType].update(r.id, patch));
      }
      await Promise.all(updates);
      dependentsAffected[entityType] = records.length;
    } catch (err) {
      console.warn(`[ProjectCascade] ${mode} ${entityType} failed:`, err);
      dependentsAffected[entityType] = 0;
    }
  }

  // 5. Soft-delete the parent project LAST. If this throws, the cascade above
  //    has already moved or marked the dependents; the parent stays live and
  //    a retry will simply skip already-handled dependents.
  await base44.entities.FSProject.update(projectId, {
    deleted_at: new Date().toISOString(),
    deleted_by: actingUserId,
  });

  return {
    success: true,
    dependentsAffected,
    ...(sentinelId ? { sentinelId } : {}),
  };
}
