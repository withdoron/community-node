/**
 * Business Ranking Utility
 * 
 * Tier hierarchy: Partner > Standard > Basic
 * 
 * Ranking rules:
 * 1. Group by tier (Partner first, then Standard, then Basic)
 * 2. Within each tier: Boosted listings first
 * 3. Within boost group: Sort by averageRating desc, then reviewCount desc
 * 4. Tiebreaker: created_date (newest first)
 */

// Tier priority (higher number = higher priority)
export const TIER_PRIORITY = {
  partner: 3,
  standard: 2,
  basic: 1
};

/**
 * Check if a business has an active boost
 * Source of truth: bump_expires_at timestamp, not is_bumped boolean
 */
export const isBoostActive = (business) => {
  if (!business.bump_expires_at) return false;
  return new Date(business.bump_expires_at) > new Date();
};

/**
 * Get tier priority value (defaults to basic/1 if not set)
 */
export const getTierPriority = (business) => {
  const tier = business.subscription_tier || 'basic';
  return TIER_PRIORITY[tier] || 1;
};

/**
 * Main ranking function for businesses
 * 
 * @param {Array} businesses - Array of business objects
 * @returns {Array} - Sorted array of businesses
 */
export const rankBusinesses = (businesses) => {
  if (!businesses || businesses.length === 0) return [];

  return [...businesses].sort((a, b) => {
    // Step 1: Compare by tier (Partner > Standard > Basic)
    const tierA = getTierPriority(a);
    const tierB = getTierPriority(b);
    
    if (tierA !== tierB) {
      return tierB - tierA; // Higher tier first
    }

    // Step 2: Within same tier, boosted listings first
    const boostA = isBoostActive(a);
    const boostB = isBoostActive(b);
    
    if (boostA && !boostB) return -1;
    if (!boostA && boostB) return 1;

    // Step 3: Within same boost status, sort by rating
    const ratingA = a.average_rating || 0;
    const ratingB = b.average_rating || 0;
    
    if (ratingA !== ratingB) {
      return ratingB - ratingA; // Higher rating first
    }

    // Step 4: If ratings equal, sort by review count
    const reviewsA = a.review_count || 0;
    const reviewsB = b.review_count || 0;
    
    if (reviewsA !== reviewsB) {
      return reviewsB - reviewsA; // More reviews first
    }

    // Step 5: Tiebreaker - newest first
    const dateA = new Date(a.created_date || 0);
    const dateB = new Date(b.created_date || 0);
    return dateB - dateA;
  });
};

/**
 * Get display label for tier
 */
export const getTierLabel = (tier) => {
  const labels = {
    partner: 'Partner',
    standard: 'Standard',
    basic: 'Basic'
  };
  return labels[tier] || 'Basic';
};

/**
 * Get tier badge color classes
 */
export const getTierBadgeClasses = (tier) => {
  const classes = {
    partner: 'bg-amber-100 text-amber-800 border-amber-200',
    standard: 'bg-blue-100 text-blue-800 border-blue-200',
    basic: 'bg-slate-100 text-slate-600 border-slate-200'
  };
  return classes[tier] || classes.basic;
};