import { base44 } from '@/api/base44Client';

/**
 * Delete a business and all its related data.
 * Deletes: Locations, Events, staff_invites, staff_roles, then the Business itself.
 */
export async function deleteBusinessCascade(businessId) {
  console.log('[Cascade Delete] Starting for business:', businessId);

  try {
    const locations = await base44.entities.Location.filter({ business_id: businessId });
    if (locations.length > 0) {
      await Promise.all(locations.map(loc => base44.entities.Location.delete(loc.id)));
      console.log(`[Cascade Delete] Deleted ${locations.length} locations`);
    }
  } catch (err) {
    console.warn('[Cascade Delete] Location cleanup failed:', err);
  }

  try {
    const events = await base44.entities.Event.filter({ business_id: businessId });
    if (events.length > 0) {
      await Promise.all(events.map(evt => base44.entities.Event.delete(evt.id)));
      console.log(`[Cascade Delete] Deleted ${events.length} events`);
    }
  } catch (err) {
    console.warn('[Cascade Delete] Event cleanup failed:', err);
  }

  try {
    const inviteKey = `staff_invites:${businessId}`;
    const inviteSettings = await base44.entities.AdminSettings.filter({ key: inviteKey });
    if (inviteSettings.length > 0) {
      await Promise.all(inviteSettings.map(s => base44.entities.AdminSettings.delete(s.id)));
      console.log('[Cascade Delete] Deleted staff invites');
    }
  } catch (err) {
    console.warn('[Cascade Delete] Staff invites cleanup failed:', err);
  }

  try {
    const rolesKey = `staff_roles:${businessId}`;
    const rolesSettings = await base44.entities.AdminSettings.filter({ key: rolesKey });
    if (rolesSettings.length > 0) {
      await Promise.all(rolesSettings.map(s => base44.entities.AdminSettings.delete(s.id)));
      console.log('[Cascade Delete] Deleted staff roles');
    }
  } catch (err) {
    console.warn('[Cascade Delete] Staff roles cleanup failed:', err);
  }

  if (typeof base44.entities.Business.delete === 'function') {
    await base44.entities.Business.delete(businessId);
  } else {
    try {
      await base44.entities.Business.update(businessId, { is_deleted: true });
    } catch {
      await base44.entities.Business.update(businessId, { status: 'deleted' });
    }
  }
  console.log('[Cascade Delete] Complete for business:', businessId);
}

/**
 * Find and delete orphaned locations whose business no longer exists.
 */
export async function cleanupOrphanedLocations() {
  const [allLocations, allBusinesses] = await Promise.all([
    base44.entities.Location.list('-created_date', 1000),
    base44.entities.Business.list('-created_date', 500),
  ]);
  const businessIds = new Set(allBusinesses.map(b => b.id));
  const orphans = allLocations.filter(loc => loc.business_id && !businessIds.has(loc.business_id));
  if (orphans.length > 0) {
    await Promise.all(orphans.map(loc => base44.entities.Location.delete(loc.id)));
  }
  console.log(`[Orphan Cleanup] Deleted ${orphans.length} orphaned locations`);
  return orphans.length;
}
