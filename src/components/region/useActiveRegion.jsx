/**
 * useActiveRegion Hook
 * 
 * Provides the active region configuration for this LocalConnect instance.
 * The active region determines:
 * - Which businesses are shown on the home page
 * - Default search area
 * - Featured/Top Rated section filtering
 * 
 * Multi-city setup:
 * - Each instance has one "primary" region (is_primary = true)
 * - Or falls back to the first active region
 * - Different instances would have different region records marked as primary
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Default fallback region (used if no region configured)
const DEFAULT_REGION = {
  id: null,
  name: 'Local Area',
  slug: 'local',
  display_name: 'Your Local Area',
  center_lat: 30.2672,  // Austin fallback
  center_lng: -97.7431,
  default_radius_miles: 30,
  is_active: true,
  is_primary: true
};

/**
 * Hook to get the active region for this instance
 * Returns: { region, isLoading, error }
 */
export function useActiveRegion() {
  const { data: regions, isLoading, error } = useQuery({
    queryKey: ['active-region'],
    queryFn: () => base44.entities.Region.filter({ is_active: true }, '-created_date', 10),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Find the primary region, or fall back to first active region
  let region = DEFAULT_REGION;
  
  if (regions && regions.length > 0) {
    const primary = regions.find(r => r.is_primary);
    region = primary || regions[0];
    
    // Ensure defaults for optional fields
    region = {
      ...region,
      default_radius_miles: region.default_radius_miles || 30,
      display_name: region.display_name || region.name,
      center_lat: region.center_lat ?? DEFAULT_REGION.center_lat,
      center_lng: region.center_lng ?? DEFAULT_REGION.center_lng,
    };
  }

  return {
    region,
    isLoading,
    error
  };
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns distance in miles
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return Infinity;
  
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if a business is within a region's service area
 */
export function isWithinRegion(business, region) {
  if (!business || !region) return false;
  
  // If business has coordinates, use them
  if (business.lat && business.lng) {
    const distance = calculateDistance(
      region.center_lat,
      region.center_lng,
      business.lat,
      business.lng
    );
    return distance <= (region.default_radius_miles || 30);
  }
  
  // No coords: check if business city matches region
  const businessCity = (business.city || '').toLowerCase();
  const regionName = (region.name || '').toLowerCase();
  const regionDisplay = (region.display_name || '').toLowerCase();
  
  // Check for city name match (includes partial match)
  if (businessCity.includes('eugene') && regionName.includes('eugene')) return true;
  if (businessCity.includes('austin') && regionName.includes('austin')) return true;
  
  // Check region_id if set on business
  if (business.region_id && business.region_id === region.id) return true;
  
  // Generic fallback
  return businessCity.includes(regionName) || regionName.includes(businessCity);
}

/**
 * Check if a location is within a region's service area
 */
export function isLocationWithinRegion(location, region) {
  if (!location || !region) return false;
  
  // If location has coordinates, use them
  if (location.lat && location.lng) {
    const distance = calculateDistance(
      region.center_lat,
      region.center_lng,
      location.lat,
      location.lng
    );
    return distance <= (region.default_radius_miles || 30);
  }
  
  // No coords: check city name
  const locationCity = (location.city || '').toLowerCase();
  const regionName = (region.name || '').toLowerCase();
  
  // Check for city name match
  if (locationCity.includes('eugene') && regionName.includes('eugene')) return true;
  if (locationCity.includes('austin') && regionName.includes('austin')) return true;
  
  // Generic fallback
  return locationCity.includes(regionName) || regionName.includes(locationCity);
}

/**
 * Filter businesses to only those within a region
 * Also checks if business has any locations in the region
 */
export function filterBusinessesByRegion(businesses, region, locations = null) {
  if (!businesses || !region) return [];
  
  return businesses.filter(b => {
    // Direct check on business
    if (isWithinRegion(b, region)) return true;
    
    // If we have locations data, check if any location is in the region
    if (locations) {
      const businessLocations = locations.filter(loc => loc.business_id === b.id);
      return businessLocations.some(loc => isLocationWithinRegion(loc, region));
    }
    
    return false;
  });
}

/**
 * Filter locations to only those within a region
 */
export function filterLocationsByRegion(locations, region) {
  if (!locations || !region) return [];
  return locations.filter(loc => isLocationWithinRegion(loc, region));
}