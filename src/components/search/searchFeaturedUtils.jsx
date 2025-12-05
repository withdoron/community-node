/**
 * Search Featured Utilities
 * Implements Featured band and direct match logic for search results.
 * Reuses thresholds from autoBoostConfig to avoid duplication.
 */

import {
  MIN_RATING_FOR_FEATURED,
  MIN_REVIEWS_FOR_FEATURED
} from '@/components/locations/autoBoostConfig';

// Search-specific caps
export const MAX_FEATURED_IN_SEARCH_BAND = 3;
export const MAX_PER_OWNER_IN_SEARCH_BAND = 2;

/**
 * Check if a business is currently boosted (manual or auto)
 */
export const isBusinessBoosted = (business) => {
  if (!business) return false;
  if (business.is_bumped) {
    if (!business.bump_expires_at) return true;
    return new Date(business.bump_expires_at) > new Date();
  }
  return false;
};

/**
 * Determine if a business is manually boosted vs auto-boosted
 * Manual boost = boosted AND (no auto-boost flag OR auto-boost is disabled)
 * For businesses (not locations), we treat all boosts as manual since
 * the is_auto_boost_enabled flag is on locations, not businesses.
 */
export const isManualBoost = (business) => {
  // At the business level, if it's boosted via is_bumped, it's a manual boost
  return isBusinessBoosted(business);
};

/**
 * Check if a business meets Featured eligibility thresholds
 * (same thresholds as landing page)
 */
export const meetsFeaturedThresholds = (business) => {
  const rating = business.average_rating || 0;
  const reviews = business.review_count || 0;
  return rating >= MIN_RATING_FOR_FEATURED && reviews >= MIN_REVIEWS_FOR_FEATURED;
};

/**
 * Check if a business is Featured-eligible
 * Rules:
 * - Manual boost: Always Featured (no rating/review thresholds)
 * - Auto-boost: Must also meet rating/review thresholds
 */
export const isFeaturedEligible = (business) => {
  if (!isBusinessBoosted(business)) return false;
  
  // Manual boosts always qualify as Featured
  if (isManualBoost(business)) return true;
  
  // Auto-boosts require rating/review thresholds
  return meetsFeaturedThresholds(business);
};

/**
 * Normalize a string for matching (lowercase, trim, collapse spaces)
 */
const normalizeString = (str) => {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
};

/**
 * Check if a query is a direct match for a business name
 * Uses case-insensitive exact match or "starts with" match
 */
const isDirectNameMatch = (businessName, query) => {
  const normalizedName = normalizeString(businessName);
  const normalizedQuery = normalizeString(query);
  
  if (!normalizedQuery || normalizedQuery.length < 3) return false;
  
  // Exact match
  if (normalizedName === normalizedQuery) return true;
  
  // Starts with match (query is at least 80% of name length)
  if (normalizedName.startsWith(normalizedQuery) && 
      normalizedQuery.length >= normalizedName.length * 0.8) {
    return true;
  }
  
  // Name starts with query (for longer queries)
  if (normalizedQuery.length >= 5 && normalizedName.startsWith(normalizedQuery)) {
    return true;
  }
  
  return false;
};

/**
 * Find a direct match business from the search results
 * Returns the best direct match or null if none found
 * 
 * Strategy: If exactly one business matches closely, return it.
 * If multiple match, pick the one with highest rating. If still tied, return null.
 */
export const findDirectMatch = (businesses, query) => {
  if (!query || query.trim().length < 3) return null;
  
  const directMatches = businesses.filter(b => isDirectNameMatch(b.name, query));
  
  if (directMatches.length === 0) return null;
  if (directMatches.length === 1) return directMatches[0];
  
  // Multiple matches - pick highest rated, then most reviews
  const sorted = [...directMatches].sort((a, b) => {
    const ratingDiff = (b.average_rating || 0) - (a.average_rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    return (b.review_count || 0) - (a.review_count || 0);
  });
  
  // Only return if there's a clear winner (rating difference > 0.5)
  if (sorted.length >= 2 && 
      (sorted[0].average_rating || 0) - (sorted[1].average_rating || 0) >= 0.5) {
    return sorted[0];
  }
  
  // Too ambiguous, return the first one anyway
  return sorted[0];
};

/**
 * Process search results into structured sections:
 * - directMatch: single business or null
 * - featuredBand: up to MAX_FEATURED_IN_SEARCH_BAND businesses
 * - results: everything else
 * 
 * @param {Array} businesses - Filtered and ranked businesses from search
 * @param {string} query - The user's search query
 * @returns {Object} { directMatch, featuredBand, results }
 */
export const processSearchResults = (businesses, query) => {
  if (!businesses || businesses.length === 0) {
    return { directMatch: null, featuredBand: [], results: [] };
  }

  // 1. Find direct match
  const directMatch = findDirectMatch(businesses, query);
  const directMatchId = directMatch?.id;

  // 2. Separate Featured-eligible from the rest (excluding direct match)
  const remainingBusinesses = businesses.filter(b => b.id !== directMatchId);
  
  const featuredEligible = remainingBusinesses.filter(b => isFeaturedEligible(b));
  const nonFeatured = remainingBusinesses.filter(b => !isFeaturedEligible(b));

  // 3. Apply caps to build the Featured band
  const featuredBand = [];
  const ownerCounts = {}; // { ownerId: count }

  for (const business of featuredEligible) {
    if (featuredBand.length >= MAX_FEATURED_IN_SEARCH_BAND) break;
    
    const ownerId = business.owner_user_id || business.owner_email || 'unknown';
    const currentOwnerCount = ownerCounts[ownerId] || 0;
    
    if (currentOwnerCount >= MAX_PER_OWNER_IN_SEARCH_BAND) continue;
    
    featuredBand.push(business);
    ownerCounts[ownerId] = currentOwnerCount + 1;
  }

  // 4. Build results: Featured-eligible that didn't make the band + non-featured
  const featuredBandIds = new Set(featuredBand.map(b => b.id));
  const overflowFeatured = featuredEligible.filter(b => !featuredBandIds.has(b.id));
  
  // Combine overflow + non-featured, maintaining original sort order
  const results = remainingBusinesses.filter(b => 
    !featuredBandIds.has(b.id)
  );

  // 5. Enrich with metadata for tracking
  const enrichBusiness = (business, source, positionInSection) => ({
    ...business,
    _searchMeta: {
      source,
      positionInSection,
      isFeaturedEligible: isFeaturedEligible(business),
      isManualBoost: isManualBoost(business)
    }
  });

  return {
    directMatch: directMatch 
      ? enrichBusiness(directMatch, 'search_direct_match', 0)
      : null,
    featuredBand: featuredBand.map((b, i) => 
      enrichBusiness(b, 'search_featured_band', i)
    ),
    results: results.map((b, i) => 
      enrichBusiness(b, 'search_results', i)
    )
  };
};

/**
 * Build tracking props for a search result business
 */
export const buildSearchTrackingProps = (business, searchQuery, searchFilters, radiusMiles = null) => {
  const meta = business._searchMeta || {};
  
  return {
    locationId: business.id,
    ownerId: business.owner_user_id || business.owner_email || null,
    isManualBoost: meta.isManualBoost || false,
    radiusMiles: radiusMiles,
    positionInSection: meta.positionInSection ?? 0,
    source: meta.source || 'search_results',
    searchQuery: searchQuery || '',
    searchFilters: searchFilters || {}
  };
};