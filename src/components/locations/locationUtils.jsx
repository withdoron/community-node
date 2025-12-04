/**
 * Location Utilities
 * Re-exports from autoBoostUtils for backward compatibility
 */

export { 
  isLocationCurrentlyBoosted as isLocationBoosted,
  calculateBoostWindow,
  getAutoBoostStatus
} from './autoBoostUtils';

/**
 * Legacy helper - check if location should auto-boost (simple version)
 * Now uses the full smart auto-boost logic
 */
export const shouldAutoBoost = (location, bumpsRemaining) => {
  if (!location?.is_auto_boost_enabled) return false;
  if (bumpsRemaining <= 0) return false;
  // Full logic is now in autoBoostUtils.canAutoBoostLocation
  return false; // Return false here - let the main autoBoostUtils handle it
};