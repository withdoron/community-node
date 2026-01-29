import { useMemo } from 'react';

/**
 * Tier level mapping
 */
const TIER_LEVELS = {
  'basic': 1,
  'standard': 2,
  'partner': 3,
};

/**
 * Hook to get organization tier information
 * 
 * @param {Object} organization - The organization/business object
 * @returns {Object} Tier information and feature flags
 */
export function useOrganization(organization) {
  return useMemo(() => {
    if (!organization) {
      return {
        organization: null,
        tier: 'basic',
        tierLevel: 1,
        canUsePunchPass: false,
        canAutoPublish: false,
        canUseMultipleTickets: false,
        canUseCheckIn: false,
        isPartner: false,
      };
    }

    const tier = organization.subscription_tier || 'basic';
    const tierLevel = TIER_LEVELS[tier] || 1;

    return {
      organization,
      tier, // 'basic' | 'standard' | 'partner'
      tierLevel, // 1 | 2 | 3
      canUsePunchPass: tierLevel >= 2, // true for standard+
      canAutoPublish: tierLevel >= 2, // true for standard+
      canUseMultipleTickets: tierLevel >= 2, // true for standard+
      canUseCheckIn: tierLevel >= 2, // true for standard+
      isPartner: tier === 'partner', // true for partner only
    };
  }, [organization]);
}

/**
 * Get tier level from tier string
 * @param {string} tier - Tier code value ('basic', 'standard', 'partner')
 * @returns {number} Tier level (1, 2, or 3)
 */
export function getTierLevel(tier) {
  return TIER_LEVELS[tier] || 1;
}
