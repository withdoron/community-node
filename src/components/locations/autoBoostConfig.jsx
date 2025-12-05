
/**
 * Smart Auto-Boost Configuration
 * These can be moved to AdminSettings for dynamic configuration later
 */

// If views in the last 7 days are below this, location is "under-exposed"
export const LOW_TRAFFIC_VIEW_THRESHOLD = 20;

// Only allow auto-boost to START during these hours (local time)
// e.g., 6 = 6:00 AM, 22 = 10:00 PM
export const ALLOWED_AUTOBOOST_HOURS = {
  start: 6,  // 6:00 AM
  end: 22    // 10:00 PM
};

// Max auto-boosted locations in the same category at once
export const MAX_SIMULTANEOUS_AUTOBOOST_PER_CATEGORY = 3;

// Max auto-boosted locations platform-wide at once
export const MAX_SIMULTANEOUS_AUTOBOOST_GLOBAL = 20;

// Minimum number of active locations in a category to allow auto-boost
// We don't auto-boost in "thin" categories with little competition
export const MIN_CATEGORY_SIZE_FOR_AUTOBOOST = 8;

// Boost duration in hours
export const BOOST_DURATION_HOURS = 4;

// ========================================
// Featured Nearby / Slice Caps
// ========================================

// Max active boosts displayed per "slice" (category + city + radius)
export const MAX_ACTIVE_BOOSTS_PER_SLICE = 3;

// Max boosted locations a single owner can have in one slice
export const MAX_BOOSTED_LOCATIONS_PER_OWNER_PER_SLICE = 2;

// Minimum rating required for a location to be Featured (true average, not rounded)
export const MIN_RATING_FOR_FEATURED = 3.0;

// Minimum review count for Auto-Boosted locations to be Featured
export const MIN_REVIEWS_FOR_FEATURED = 5;

// Default timezone if location doesn't have one set
export const DEFAULT_TIMEZONE = 'America/Chicago';
