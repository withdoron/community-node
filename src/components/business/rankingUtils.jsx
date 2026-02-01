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
    // Primary: recommendation count (includes nods + stories)
    const recA = a.recommendation_count || a.review_count || 0;
    const recB = b.recommendation_count || b.review_count || 0;
    if (recA !== recB) return recB - recA;

    // Secondary: story count (richer engagement)
    const storiesA = a.story_count || 0;
    const storiesB = b.story_count || 0;
    if (storiesA !== storiesB) return storiesB - storiesA;

    // Tertiary: newest first
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
    partner: 'bg-amber-100 text-amber-800 border-amber-200',
    standard: 'bg-blue-100 text-blue-800 border-blue-200',
    basic: 'bg-slate-100 text-slate-600 border-slate-200'
  };
  return classes[tier] || classes.basic;
};
