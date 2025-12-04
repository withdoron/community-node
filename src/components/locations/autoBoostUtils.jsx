/**
 * Smart Auto-Boost Utilities
 * Handles all logic for determining when auto-boost should fire
 */

import {
  LOW_TRAFFIC_VIEW_THRESHOLD,
  ALLOWED_AUTOBOOST_HOURS,
  MAX_SIMULTANEOUS_AUTOBOOST_PER_CATEGORY,
  MAX_SIMULTANEOUS_AUTOBOOST_GLOBAL,
  MIN_CATEGORY_SIZE_FOR_AUTOBOOST,
  BOOST_DURATION_HOURS,
  DEFAULT_TIMEZONE
} from './autoBoostConfig';

// Re-export config values for use in UI components
export {
  LOW_TRAFFIC_VIEW_THRESHOLD,
  ALLOWED_AUTOBOOST_HOURS,
  MAX_SIMULTANEOUS_AUTOBOOST_PER_CATEGORY,
  MAX_SIMULTANEOUS_AUTOBOOST_GLOBAL,
  MIN_CATEGORY_SIZE_FOR_AUTOBOOST
} from './autoBoostConfig';

/**
 * Check if a location is currently boosted
 */
export const isLocationCurrentlyBoosted = (location) => {
  if (!location?.boost_end_at) return false;
  return new Date(location.boost_end_at) > new Date();
};

/**
 * Check if location is under-exposed based on recent views
 */
export const isUnderExposed = (location) => {
  const views = location?.views_last_7_days || 0;
  return views < LOW_TRAFFIC_VIEW_THRESHOLD;
};

/**
 * Get the current hour in the location's timezone
 */
export const getLocalHour = (location, now = new Date()) => {
  const timezone = location?.timezone || DEFAULT_TIMEZONE;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone
    });
    return parseInt(formatter.format(now), 10);
  } catch (e) {
    // Fallback to UTC if timezone is invalid
    return now.getUTCHours();
  }
};

/**
 * Check if current time is within allowed boost window
 */
export const isWithinAllowedBoostWindow = (location, now = new Date()) => {
  const localHour = getLocalHour(location, now);
  return localHour >= ALLOWED_AUTOBOOST_HOURS.start && localHour < ALLOWED_AUTOBOOST_HOURS.end;
};

/**
 * Check if location has boost credits remaining
 */
export const hasBoostCreditsRemaining = (location) => {
  const credits = location?.boost_credits_this_period || 0;
  const used = location?.boosts_used_this_period || 0;
  return used < credits;
};

/**
 * Count currently auto-boosted locations by category
 */
export const countActiveAutoBoostsByCategory = (locations) => {
  const now = new Date();
  const counts = {};
  
  locations.forEach(loc => {
    if (
      loc.is_auto_boost_enabled &&
      loc.boost_end_at &&
      new Date(loc.boost_end_at) > now
    ) {
      const categoryId = loc.category_id || 'uncategorized';
      counts[categoryId] = (counts[categoryId] || 0) + 1;
    }
  });
  
  return counts;
};

/**
 * Count total currently auto-boosted locations globally
 */
export const countActiveAutoBoostsGlobal = (locations) => {
  const now = new Date();
  return locations.filter(loc => 
    loc.is_auto_boost_enabled &&
    loc.boost_end_at &&
    new Date(loc.boost_end_at) > now
  ).length;
};

/**
 * Check if category limit allows another auto-boost
 */
export const isCategoryCapacityAvailable = (categoryId, categoryCounts) => {
  const currentCount = categoryCounts[categoryId] || 0;
  return currentCount < MAX_SIMULTANEOUS_AUTOBOOST_PER_CATEGORY;
};

/**
 * Check if global limit allows another auto-boost
 */
export const isGlobalCapacityAvailable = (globalCount) => {
  return globalCount < MAX_SIMULTANEOUS_AUTOBOOST_GLOBAL;
};

/**
 * Count total active locations per category
 */
export const countActiveLocationsPerCategory = (locations) => {
  const counts = {};
  locations.forEach(loc => {
    if (loc.is_active !== false) {
      const categoryId = loc.category_id || 'uncategorized';
      counts[categoryId] = (counts[categoryId] || 0) + 1;
    }
  });
  return counts;
};

/**
 * Check if category has enough locations to allow auto-boost
 */
export const isCategorySizeAdequate = (categoryId, categorySizeCounts) => {
  const size = categorySizeCounts[categoryId] || 0;
  return size >= MIN_CATEGORY_SIZE_FOR_AUTOBOOST;
};

/**
 * Determine the reason why auto-boost is not running (for UI display)
 */
export const getAutoBoostStatus = (location, categoryCounts, globalCount, categorySizeCounts = {}) => {
  if (!location?.is_auto_boost_enabled) {
    return {
      status: 'disabled',
      message: 'Smart Auto-Boost is off.',
      canAutoBoost: false
    };
  }

  if (isLocationCurrentlyBoosted(location)) {
    return {
      status: 'active',
      message: `Smart Auto-Boost is running. This location is boosted until ${new Date(location.boost_end_at).toLocaleString()}.`,
      canAutoBoost: false
    };
  }

  if (!hasBoostCreditsRemaining(location)) {
    return {
      status: 'no_credits',
      message: 'Smart Auto-Boost is on, but no boost credits remain this period.',
      canAutoBoost: false
    };
  }

  if (!isWithinAllowedBoostWindow(location)) {
    const { start, end } = ALLOWED_AUTOBOOST_HOURS;
    return {
      status: 'outside_hours',
      message: `Smart Auto-Boost is on. We only start boosts between ${start}:00 AM – ${end > 12 ? end - 12 : end}:00 ${end >= 12 ? 'PM' : 'AM'}; we'll check again soon.`,
      canAutoBoost: false
    };
  }

  if (!isUnderExposed(location)) {
    return {
      status: 'not_underexposed',
      message: 'Smart Auto-Boost is on. This location is getting enough views right now, so we\'re not boosting it.',
      canAutoBoost: false
    };
  }

  const categoryId = location.category_id || 'uncategorized';
  
  if (!isCategorySizeAdequate(categoryId, categorySizeCounts)) {
    return {
      status: 'category_too_small',
      message: `Smart Auto-Boost is on. This category needs at least ${MIN_CATEGORY_SIZE_FOR_AUTOBOOST} locations before auto-boost is available.`,
      canAutoBoost: false
    };
  }

  if (!isCategoryCapacityAvailable(categoryId, categoryCounts)) {
    return {
      status: 'category_limit',
      message: 'Smart Auto-Boost is on. We\'ll boost this location when there\'s space in its category.',
      canAutoBoost: false
    };
  }

  if (!isGlobalCapacityAvailable(globalCount)) {
    return {
      status: 'global_limit',
      message: 'Smart Auto-Boost is on. We\'ll boost this location when there\'s space platform-wide.',
      canAutoBoost: false
    };
  }

  // All conditions met - eligible for auto-boost
  return {
    status: 'eligible',
    message: 'Smart Auto-Boost is on. We\'ll boost this location as soon as conditions are met.',
    canAutoBoost: true
  };
};

/**
 * Full check: can this location be auto-boosted right now?
 */
export const canAutoBoostLocation = (location, categoryCounts, globalCount, categorySizeCounts = {}) => {
  if (!location?.is_auto_boost_enabled) return false;
  if (isLocationCurrentlyBoosted(location)) return false;
  if (!hasBoostCreditsRemaining(location)) return false;
  if (!isUnderExposed(location)) return false;
  if (!isWithinAllowedBoostWindow(location)) return false;
  
  const categoryId = location.category_id || 'uncategorized';
  if (!isCategorySizeAdequate(categoryId, categorySizeCounts)) return false;
  if (!isCategoryCapacityAvailable(categoryId, categoryCounts)) return false;
  if (!isGlobalCapacityAvailable(globalCount)) return false;
  
  return true;
};

/**
 * Calculate new boost window
 */
export const calculateBoostWindow = (durationHours = BOOST_DURATION_HOURS) => {
  const now = new Date();
  const endAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
  return {
    startAt: now.toISOString(),
    endAt: endAt.toISOString()
  };
};

/**
 * Process auto-boost for eligible locations
 * Returns array of locations that were boosted
 */
export const processAutoBoosts = async (locations, updateLocationFn) => {
  const categoryCounts = countActiveAutoBoostsByCategory(locations);
  const categorySizeCounts = countActiveLocationsPerCategory(locations);
  let globalCount = countActiveAutoBoostsGlobal(locations);
  const boostedLocations = [];

  for (const location of locations) {
    if (canAutoBoostLocation(location, categoryCounts, globalCount, categorySizeCounts)) {
      const { startAt, endAt } = calculateBoostWindow();
      const categoryId = location.category_id || 'uncategorized';
      
      await updateLocationFn(location.id, {
        boost_start_at: startAt,
        boost_end_at: endAt,
        boosts_used_this_period: (location.boosts_used_this_period || 0) + 1,
        last_boost_started_at: startAt
      });
      
      // Update counts for subsequent checks
      categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
      globalCount++;
      boostedLocations.push(location);
      
      // Stop if we hit global limit
      if (globalCount >= MAX_SIMULTANEOUS_AUTOBOOST_GLOBAL) break;
    }
  }
  
  return boostedLocations;
};