/**
 * Featured Locations Utility
 * Implements the selection logic for "Featured nearby" section
 * following all eligibility, fairness, and cap rules from the spec.
 */

import {
  MIN_CATEGORY_SIZE_FOR_AUTOBOOST,
  MAX_ACTIVE_BOOSTS_PER_SLICE,
  MAX_BOOSTED_LOCATIONS_PER_OWNER_PER_SLICE,
  MIN_RATING_FOR_FEATURED,
  MIN_REVIEWS_FOR_FEATURED
} from '@/components/locations/autoBoostConfig';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in miles
 */
export const calculateDistanceMiles = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Check if a location is currently boosted (active boost window)
 */
export const isCurrentlyBoosted = (location) => {
  if (!location.boost_start_at || !location.boost_end_at) return false;
  const now = new Date();
  const start = new Date(location.boost_start_at);
  const end = new Date(location.boost_end_at);
  return now >= start && now < end;
};

/**
 * Check if a business is currently boosted (legacy field)
 */
export const isBusinessBoosted = (business) => {
  if (!business.is_bumped) return false;
  if (!business.bump_expires_at) return business.is_bumped;
  return new Date(business.bump_expires_at) > new Date();
};

/**
 * Create a slice key for grouping (category + city + radius band)
 */
const createSliceKey = (categoryId, city, radiusMiles) => {
  const normalizedCategory = (categoryId || 'uncategorized').toLowerCase();
  const normalizedCity = (city || 'unknown').toLowerCase().replace(/\s+/g, '_');
  return `${normalizedCategory}_${normalizedCity}_${radiusMiles}`;
};

/**
 * Create an owner-slice key for per-owner caps
 */
const createOwnerSliceKey = (sliceKey, ownerId) => {
  return `${sliceKey}_${ownerId || 'unknown'}`;
};

/**
 * Get featured and organic locations for a user's position and radius
 * 
 * @param {Array} businesses - All businesses from the database
 * @param {Array} locations - All locations from the database  
 * @param {number} userLat - User's latitude
 * @param {number} userLng - User's longitude
 * @param {number} radiusMiles - Search radius (5, 10, or 20)
 * @returns {Object} { featured: [], organic: [] }
 */
export const getFeaturedAndOrganicLocations = (
  businesses,
  locations,
  userLat,
  userLng,
  radiusMiles = 5
) => {
  // Create business lookup map
  const businessById = new Map(businesses.map(b => [b.id, b]));

  // Enrich locations with business data and calculate distance
  const enrichedLocations = locations
    .map(loc => {
      const business = businessById.get(loc.business_id);
      if (!business || !business.is_active) return null;
      if (loc.is_active === false) return null;

      const distance = calculateDistanceMiles(userLat, userLng, loc.lat, loc.lng);
      
      // Determine boost type: manual vs auto
      const locationBoosted = isCurrentlyBoosted(loc);
      const businessBoosted = isBusinessBoosted(business);
      const isBoosted = locationBoosted || businessBoosted;
      
      // Manual boost = location is boosted but auto-boost is NOT enabled
      // Auto boost = location is boosted AND auto-boost IS enabled
      const isManualBoost = isBoosted && !loc.is_auto_boost_enabled;
      const isAutoBoost = isBoosted && loc.is_auto_boost_enabled;

      return {
        ...loc,
        business,
        distanceMiles: distance,
        isBoosted,
        isManualBoost,
        isAutoBoost,
        rating: business.average_rating || 0,
        reviewCount: business.review_count || 0,
        ownerId: business.owner_user_id || business.owner_email,
        categoryId: loc.category_id || business.main_category || 'uncategorized'
      };
    })
    .filter(Boolean);

  // Filter to locations within radius
  const locationsInRadius = enrichedLocations.filter(
    loc => loc.distanceMiles <= radiusMiles
  );

  // Calculate category sizes within radius for MIN_CATEGORY_SIZE check
  const categorySizes = {};
  locationsInRadius.forEach(loc => {
    categorySizes[loc.categoryId] = (categorySizes[loc.categoryId] || 0) + 1;
  });

  // Separate boosted vs non-boosted, then sort each group
  // CRITICAL: Manual boosts get priority over auto-boosts when caps are hit
  const boostedLocations = locationsInRadius
    .filter(loc => loc.isBoosted)
    .sort((a, b) => {
      // 1. Manual boosts come before auto-boosts
      if (a.isManualBoost && !b.isManualBoost) return -1;
      if (!a.isManualBoost && b.isManualBoost) return 1;
      
      // 2. Then by rating desc
      if (b.rating !== a.rating) return b.rating - a.rating;
      
      // 3. Then by distance asc (closer first)
      if (a.distanceMiles !== b.distanceMiles) return a.distanceMiles - b.distanceMiles;
      
      // 4. Then by boost start time asc (earlier boost = higher priority)
      const aStart = a.boost_start_at ? new Date(a.boost_start_at).getTime() : 0;
      const bStart = b.boost_start_at ? new Date(b.boost_start_at).getTime() : 0;
      return aStart - bStart;
    });

  const nonBoostedLocations = locationsInRadius
    .filter(loc => !loc.isBoosted)
    .sort((a, b) => {
      // Sort organic by rating desc, review count desc, distance asc
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return a.distanceMiles - b.distanceMiles;
    });

  // Apply caps to select Featured locations
  const featured = [];
  const sliceCounts = {}; // { sliceKey: count }
  const ownerSliceCounts = {}; // { ownerSliceKey: count }

  for (const loc of boostedLocations) {
    // Check eligibility rules (apply to ALL boosted locations)
    if (loc.rating < MIN_RATING_FOR_FEATURED) continue;
    if (loc.reviewCount < MIN_REVIEWS_FOR_FEATURED) continue;
    
    // Category size check ONLY applies to Auto-Boosted locations
    // Manual boosts can appear in thin categories
    if (loc.isAutoBoost && categorySizes[loc.categoryId] < MIN_CATEGORY_SIZE_FOR_AUTOBOOST) continue;

    const sliceKey = createSliceKey(loc.categoryId, loc.city, radiusMiles);
    const ownerSliceKey = createOwnerSliceKey(sliceKey, loc.ownerId);

    const currentSliceCount = sliceCounts[sliceKey] || 0;
    const currentOwnerCount = ownerSliceCounts[ownerSliceKey] || 0;

    // Check slice cap
    if (currentSliceCount >= MAX_ACTIVE_BOOSTS_PER_SLICE) continue;
    // Check per-owner cap
    if (currentOwnerCount >= MAX_BOOSTED_LOCATIONS_PER_OWNER_PER_SLICE) continue;

    // This location passes all checks - add to featured
    featured.push({
      id: loc.id,
      businessId: loc.business_id,
      name: loc.business.name,
      description: loc.business.description,
      category: loc.categoryId,
      city: loc.city,
      address: loc.address,
      phone: loc.phone || loc.business.phone,
      rating: loc.rating,
      reviewCount: loc.reviewCount,
      distanceMiles: Math.round(loc.distanceMiles * 10) / 10,
      isFeatured: true,
      boostEndAt: loc.boost_end_at || loc.business.bump_expires_at,
      photos: loc.business.photos,
      services: loc.business.services,
      accepts_silver: loc.business.accepts_silver,
      is_locally_owned_franchise: loc.business.is_locally_owned_franchise,
      subscription_tier: loc.business.subscription_tier,
      // Include original business for BusinessCard compatibility
      _business: loc.business
    });

    sliceCounts[sliceKey] = currentSliceCount + 1;
    ownerSliceCounts[ownerSliceKey] = currentOwnerCount + 1;
  }

  // Build organic fallback list (excluding those already in featured)
  const featuredIds = new Set(featured.map(f => f.id));
  const organic = nonBoostedLocations
    .filter(loc => !featuredIds.has(loc.id))
    .slice(0, 10) // Limit organic fallback
    .map(loc => ({
      id: loc.id,
      businessId: loc.business_id,
      name: loc.business.name,
      description: loc.business.description,
      category: loc.categoryId,
      city: loc.city,
      address: loc.address,
      phone: loc.phone || loc.business.phone,
      rating: loc.rating,
      reviewCount: loc.reviewCount,
      distanceMiles: Math.round(loc.distanceMiles * 10) / 10,
      isFeatured: false,
      boostEndAt: null,
      photos: loc.business.photos,
      services: loc.business.services,
      accepts_silver: loc.business.accepts_silver,
      is_locally_owned_franchise: loc.business.is_locally_owned_franchise,
      subscription_tier: loc.business.subscription_tier,
      _business: loc.business
    }));

  return { featured, organic };
};

/**
 * Convert a featured/organic item back to BusinessCard-compatible format
 */
export const toBusinessCardFormat = (item) => {
  if (item._business) {
    return {
      ...item._business,
      // Override with location-specific data
      city: item.city,
      address: item.address,
      phone: item.phone,
      distanceMiles: item.distanceMiles
    };
  }
  
  // Fallback format
  return {
    id: item.businessId || item.id,
    name: item.name,
    description: item.description,
    main_category: item.category,
    city: item.city,
    address: item.address,
    phone: item.phone,
    average_rating: item.rating,
    review_count: item.reviewCount,
    photos: item.photos,
    services: item.services,
    accepts_silver: item.accepts_silver,
    is_locally_owned_franchise: item.is_locally_owned_franchise,
    subscription_tier: item.subscription_tier,
    distanceMiles: item.distanceMiles
  };
};