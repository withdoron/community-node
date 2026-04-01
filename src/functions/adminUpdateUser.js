/**
 * Admin: update a user's admin-managed fields (status, tier, admin_notes).
 * Routes through a server function so admin role is verified server-side.
 * Allowlists fields to prevent arbitrary user record modification.
 *
 * NOTE: Requires a matching Base44 server function "adminUpdateUser"
 * that verifies the caller has role === 'admin' before writing.
 * Until the server function is created in the Base44 dashboard,
 * this falls back to direct entity update (same behavior as before).
 */

import { base44 } from '@/api/base44Client';

const ALLOWED_FIELDS = new Set([
  'status',
  'tier',
  'admin_notes',
  'mylane_tier',
]);

export async function adminUpdateUser(userId, updates) {
  // Only allow known admin-editable fields
  const safeUpdates = {};
  for (const [key, value] of Object.entries(updates)) {
    if (ALLOWED_FIELDS.has(key)) {
      safeUpdates[key] = value;
    }
  }

  try {
    return await base44.functions.invoke('adminUpdateUser', {
      user_id: userId,
      updates: safeUpdates,
    });
  } catch (err) {
    // Fallback: server function not yet created in Base44 dashboard
    if (err?.message?.includes('not found') || err?.status === 404) {
      const existingUser = await base44.entities.User.get(userId);
      const existingData = existingUser?.data || {};
      return base44.entities.User.update(userId, {
        data: { ...existingData, ...safeUpdates },
      });
    }
    throw err;
  }
}
