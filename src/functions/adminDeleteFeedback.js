/**
 * Admin: delete a feedback log entry.
 * Routes through a server function so admin role is verified server-side.
 *
 * NOTE: Requires a matching Base44 server function "adminDeleteFeedback"
 * that verifies the caller has role === 'admin' before deleting.
 * Until the server function is created in the Base44 dashboard,
 * this falls back to direct entity delete (same behavior as before).
 */

import { base44 } from '@/api/base44Client';

export async function adminDeleteFeedback(feedbackId) {
  try {
    return await base44.functions.invoke('adminDeleteFeedback', {
      feedback_id: feedbackId,
    });
  } catch (err) {
    // Fallback: server function not yet created in Base44 dashboard
    if (err?.message?.includes('not found') || err?.status === 404) {
      return base44.entities.ServiceFeedback.delete(feedbackId);
    }
    throw err;
  }
}
