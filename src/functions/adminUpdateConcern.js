/**
 * Admin: update a concern's status and/or admin notes.
 * Routes through a server function so admin role is verified server-side.
 *
 * NOTE: Requires a matching Base44 server function "adminUpdateConcern"
 * that verifies the caller has role === 'admin' before writing.
 * Until the server function is created in the Base44 dashboard,
 * this falls back to direct entity update (same behavior as before).
 */

import { base44 } from '@/api/base44Client';

const ALLOWED_FIELDS = new Set([
  'status',
  'admin_notes',
  'resolved_date',
]);

export async function adminUpdateConcern(concernId, updates) {
  // Only allow known fields
  const safeUpdates = {};
  for (const [key, value] of Object.entries(updates)) {
    if (ALLOWED_FIELDS.has(key)) {
      safeUpdates[key] = value;
    }
  }

  try {
    return await base44.functions.invoke('adminUpdateConcern', {
      concern_id: concernId,
      updates: safeUpdates,
    });
  } catch (err) {
    // Fallback: server function not yet created in Base44 dashboard
    if (err?.message?.includes('not found') || err?.status === 404) {
      return base44.entities.Concern.update(concernId, safeUpdates);
    }
    throw err;
  }
}
