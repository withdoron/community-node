/**
 * useMylane — Mylane access tier for the current user.
 *
 * Tier is stored in user.data.mylane_tier (the User entity's free-form data blob).
 * Admins always get full access regardless of the stored tier.
 *
 * Tiers:
 *   'basic'  (default) — Mylane hosts and guides. Manual wizards available.
 *                        Agent conversation works. Positioned as "Mylane Beta" (free during beta).
 *   'beta'   — Full Mylane personal assistant. Agent can write entities,
 *              take actions on behalf of the user. Granted manually by admin.
 *   'admin'  — Full access to everything. Maps from currentUser.role === 'admin'.
 *
 * DEC-129: Agent access is the pricing boundary (not read vs write).
 * This hook tracks who has what level of access. Enforcement lives in agentScopedWrite.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useMylane() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    },
  });

  return useMemo(() => {
    if (!currentUser) {
      return {
        mylane_tier: 'basic',
        isAdmin: false,
        isBeta: false,
        isFullAssistant: false,
        canUseAgent: true, // agent is available to all authenticated users (Mylane Beta)
      };
    }

    // Admin role always gets full assistant access
    if (currentUser.role === 'admin') {
      return {
        mylane_tier: 'admin',
        isAdmin: true,
        isBeta: true,
        isFullAssistant: true,
        canUseAgent: true,
      };
    }

    const stored = currentUser.data?.mylane_tier || 'basic';
    const isBeta = stored === 'beta';

    return {
      mylane_tier: stored,         // 'basic' | 'beta'
      isAdmin: false,
      isBeta,
      isFullAssistant: isBeta,     // beta users get full assistant (write actions)
      canUseAgent: true,           // all authenticated users can use agent conversation
    };
  }, [currentUser]);
}
