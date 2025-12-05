import React, { useEffect, useRef } from 'react';
import BusinessCard from '@/components/business/BusinessCard';
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { trackEvent } from '@/components/analytics/trackEvent';
import { buildSearchTrackingProps, isFeaturedEligible } from './searchFeaturedUtils';

/**
 * SearchResultsSection
 * Renders search results with:
 * - Direct match (if any) at top
 * - Featured band below direct match
 * - All other results below
 * 
 * Handles impression and click tracking for analytics.
 */
export default function SearchResultsSection({
  directMatch,
  featuredBand,
  results,
  searchQuery,
  searchFilters,
  radiusMiles = null,
  badgeSettings = null
}) {
  // Track impressions fired (to prevent duplicates)
  const impressionsFired = useRef(new Set());

  // Fire impressions once when items change
  useEffect(() => {
    const allItems = [
      ...(directMatch ? [directMatch] : []),
      ...featuredBand,
      ...results
    ];

    allItems.forEach((business) => {
      const meta = business._searchMeta || {};
      const impressionKey = `${business.id}_${meta.source}_${meta.positionInSection}`;
      
      if (!impressionsFired.current.has(impressionKey)) {
        impressionsFired.current.add(impressionKey);
        
        const isFeatured = meta.isFeaturedEligible || false;
        const eventName = isFeatured ? 'search_featured_impression' : 'search_organic_impression';
        
        trackEvent(eventName, {
          location_id: business.id,
          owner_id: business.owner_user_id || business.owner_email || null,
          is_manual_boost: meta.isManualBoost || false,
          radius_miles: radiusMiles,
          position_in_section: meta.positionInSection ?? 0,
          source: meta.source || 'search_results',
          search_query: searchQuery || '',
          search_filters: searchFilters || {}
        });
      }
    });
  }, [directMatch, featuredBand, results, searchQuery, searchFilters, radiusMiles]);

  const renderCard = (business) => {
    const meta = business._searchMeta || {};
    const isFeatured = meta.isFeaturedEligible || false;
    
    return (
      <BusinessCard
        key={business.id}
        business={business}
        featured={isFeatured}
        badgeSettings={badgeSettings}
        locationCount={business._locationCount || null}
        trackingProps={{
          locationId: business.id,
          ownerId: business.owner_user_id || business.owner_email || null,
          isManualBoost: meta.isManualBoost || false,
          radiusMiles: radiusMiles,
          positionInSection: meta.positionInSection ?? 0,
          source: meta.source || 'search_results',
          searchQuery: searchQuery || '',
          searchFilters: searchFilters || {},
          isSearchContext: true
        }}
      />
    );
  };

  const hasDirectMatch = !!directMatch;
  const hasFeaturedBand = featuredBand.length > 0;
  const hasResults = results.length > 0;

  return (
    <div className="space-y-6">
      {/* Direct Match */}
      {hasDirectMatch && (
        <div>
          {renderCard(directMatch)}
        </div>
      )}

      {/* Featured Band */}
      {hasFeaturedBand && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-slate-700">Featured for this search</span>
            <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">
              {featuredBand.length}
            </Badge>
          </div>
          <div className="grid gap-4">
            {featuredBand.map(renderCard)}
          </div>
        </div>
      )}

      {/* All Other Results */}
      {hasResults && (
        <div>
          {(hasDirectMatch || hasFeaturedBand) && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-slate-700">All results</span>
              <Badge variant="secondary" className="text-xs">
                {results.length}
              </Badge>
            </div>
          )}
          <div className="grid gap-4">
            {results.map(renderCard)}
          </div>
        </div>
      )}
    </div>
  );
}