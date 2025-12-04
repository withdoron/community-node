/**
 * Location Boost Utilities
 * Source of truth for boost status is boost_start_at and boost_end_at timestamps
 */

/**
 * Check if a location is currently boosted
 * @param {Object} location - Location object with boost_start_at and boost_end_at
 * @returns {boolean}
 */
export const isLocationBoosted = (location) => {
  if (!location?.boost_end_at) return false;
  const now = new Date();
  const endAt = new Date(location.boost_end_at);
  
  // If there's a start date, check both bounds
  if (location.boost_start_at) {
    const startAt = new Date(location.boost_start_at);
    return now >= startAt && now <= endAt;
  }
  
  // If no start date, just check end date hasn't passed
  return now <= endAt;
};

/**
 * Get boost status info for display
 * @param {Object} location - Location object
 * @returns {Object} { isBoosted, expiresAt, canBoost }
 */
export const getBoostStatus = (location) => {
  const isBoosted = isLocationBoosted(location);
  return {
    isBoosted,
    expiresAt: isBoosted ? new Date(location.boost_end_at) : null,
    canBoost: !isBoosted
  };
};

/**
 * Calculate new boost end time (4 hours from now)
 * @returns {Object} { startAt, endAt } as ISO strings
 */
export const calculateBoostWindow = (durationHours = 4) => {
  const now = new Date();
  const endAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
  return {
    startAt: now.toISOString(),
    endAt: endAt.toISOString()
  };
};

/**
 * Check if a location should be auto-boosted
 * @param {Object} location - Location object
 * @param {number} bumpsRemaining - Available bumps from business
 * @returns {boolean}
 */
export const shouldAutoBoost = (location, bumpsRemaining) => {
  if (!location?.is_auto_boost_enabled) return false;
  if (bumpsRemaining <= 0) return false;
  return !isLocationBoosted(location);
};