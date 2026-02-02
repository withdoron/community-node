/**
 * Business Ranking Utility
 *
 * Trust-based ranking: Recommendations > Stories > Recency
 * No paid placement. No tier-based ordering.
 */

export const TIER_PRIORITY = {
  partner: 3,
  standard: 2,
  basic: 1
};

export const getTierPriority = (business) => {
  const tier = business.subscription_tier || 'basic';
  return TIER_PRIORITY[tier] || 1;
};

/**
 * Main ranking function for businesses
 * Sorts by: Recommendation count (desc) → Story count (desc) → Newest first
 */
export const rankBusinesses = (businesses) => {
  if (!businesses || businesses.length === 0) return [];

  return [...businesses].sort((a, b) => {
    // Primary: trust score (vouches worth 3x, stories worth 2x, nods worth 1x)
    const scoreA = ((a.vouch_count || 0) * 3) + ((a.story_count || 0) * 2) + (a.nod_count || 0);
    const scoreB = ((b.vouch_count || 0) * 3) + ((b.story_count || 0) * 2) + (b.nod_count || 0);
    if (scoreA !== scoreB) return scoreB - scoreA;

    // Secondary: vouch count (verified endorsements)
    const vouchA = a.vouch_count || 0;
    const vouchB = b.vouch_count || 0;
    if (vouchA !== vouchB) return vouchB - vouchA;

    // Tertiary: total recommendation count
    const recA = a.recommendation_count || 0;
    const recB = b.recommendation_count || 0;
    if (recA !== recB) return recB - recA;

    // Quaternary: newest first
    const dateA = new Date(a.created_date || 0);
    const dateB = new Date(b.created_date || 0);
    return dateB - dateA;
  });
};

export const getTierLabel = (tier) => {
  const labels = { partner: 'Partner', standard: 'Standard', basic: 'Basic' };
  return labels[tier] || 'Basic';
};

export const getTierBadgeClasses = (tier) => {
  const classes = {
    partner: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    standard: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    basic: 'bg-slate-700 text-slate-300 border-slate-600'
  };
  return classes[tier] || classes.basic;
};
