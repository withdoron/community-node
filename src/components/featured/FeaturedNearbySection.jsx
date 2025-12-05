import React, { useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";
import BusinessCard from '@/components/business/BusinessCard';
import { toBusinessCardFormat } from './featuredLocationsUtils';
import { trackEvent } from '@/components/analytics/trackEvent';

const RADIUS_OPTIONS = [5, 10, 20];

export default function FeaturedNearbySection({
  featured = [],
  organic = [],
  isLoading = false,
  searchRadius = 5,
  onRadiusChange,
  badgeSettings = null
}) {
  const hasFeatured = featured.length > 0;
  const displayItems = hasFeatured ? featured : organic;
  const sectionTitle = hasFeatured ? "Featured Nearby" : "Recommended Nearby";
  const sectionSubtitle = hasFeatured 
    ? "Businesses getting extra visibility in your area" 
    : "Top local businesses near you";
  
  const source = hasFeatured ? 'landing_featured' : 'landing_organic';
  
  // Track impressions fired (to prevent duplicates)
  const impressionsFired = useRef(new Set());
  
  // Fire impressions once when items are rendered
  useEffect(() => {
    if (isLoading || displayItems.length === 0) return;
    
    displayItems.forEach((item, index) => {
      const impressionKey = `${item.id}_${searchRadius}_${source}`;
      
      if (!impressionsFired.current.has(impressionKey)) {
        impressionsFired.current.add(impressionKey);
        
        const eventName = hasFeatured ? 'featured_impression' : 'organic_impression';
        trackEvent(eventName, {
          location_id: item.id,
          owner_id: item._business?.owner_user_id || item._business?.owner_email || null,
          is_manual_boost: item.isManualBoost || false,
          radius_miles: searchRadius,
          position_in_section: index,
          source
        });
      }
    });
  }, [displayItems, searchRadius, isLoading, hasFeatured, source]);

  if (isLoading) {
    return (
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{sectionTitle}</h2>
          <p className="text-slate-600 mt-1">{sectionSubtitle}</p>
        </div>
        
        {/* Radius selector */}
        {onRadiusChange && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-500 mr-2">Radius:</span>
            {RADIUS_OPTIONS.map(radius => (
              <Button
                key={radius}
                variant={searchRadius === radius ? "default" : "outline"}
                size="sm"
                onClick={() => onRadiusChange(radius)}
                className={searchRadius === radius ? "bg-slate-900" : ""}
              >
                {radius} mi
              </Button>
            ))}
          </div>
        )}
      </div>

      {displayItems.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No businesses found within {searchRadius} miles.</p>
          {searchRadius < 20 && onRadiusChange && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => onRadiusChange(searchRadius === 5 ? 10 : 20)}
            >
              Expand search to {searchRadius === 5 ? 10 : 20} miles
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {displayItems.map((item, index) => (
            <BusinessCard
              key={item.id}
              business={toBusinessCardFormat(item)}
              featured={item.isFeatured}
              badgeSettings={badgeSettings}
              trackingProps={{
                locationId: item.id,
                ownerId: item._business?.owner_user_id || item._business?.owner_email || null,
                isManualBoost: item.isManualBoost || false,
                radiusMiles: searchRadius,
                positionInSection: index,
                source
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}