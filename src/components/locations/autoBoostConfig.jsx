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

// Boost duration in hours
export const BOOST_DURATION_HOURS = 4;

// Default timezone if location doesn't have one set
export const DEFAULT_TIMEZONE = 'America/Chicago';