import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, ChevronRight, Zap, Crown, Coins, Store } from "lucide-react";
import TrustSignal from '@/components/recommendations/TrustSignal';

import { mainCategories, getMainCategory, getSubcategoryLabel } from '@/components/categories/categoryData';
import { getTierLabel } from '@/components/business/rankingUtils';

const legacyCategoryLabels = {
  carpenter: 'Carpenter',
  mechanic: 'Mechanic',
  landscaper: 'Landscaper',
  farm: 'Farm',
  bullion_dealer: 'Bullion Dealer',
  electrician: 'Electrician',
  plumber: 'Plumber',
  handyman: 'Handyman',
  cleaning: 'Cleaning',
  other: 'Other'
};

const DARK_TIER_BADGE_CLASSES = {
  partner: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  standard: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  basic: 'bg-slate-800 text-slate-400 border-slate-700'
};

export default function BusinessCard({ business, badgeSettings = null, locationCount = null, showTierBadge = false }) {
  // Badge visibility settings (default to showing if not provided)
  const showSilverBadge = badgeSettings?.show_accepts_silver_badge !== false;
  const showFranchiseBadge = badgeSettings?.show_locally_owned_franchise_badge !== false;
  const minPrice = business.services?.length > 0 
    ? Math.min(...business.services.map(s => s.starting_price || 0))
    : null;

  const tier = business.subscription_tier || 'basic';
  const tierLabel = getTierLabel(tier);
  const darkTierClasses = DARK_TIER_BADGE_CLASSES[tier] || DARK_TIER_BADGE_CLASSES.basic;

  // Get category label (supports both new and legacy categories)
  const getCategoryLabel = () => {
    if (business.main_category) {
      const mainCat = getMainCategory(business.main_category);
      return mainCat?.label || business.main_category;
    }
    return legacyCategoryLabels[business.category] || business.category;
  };

  // Tier icon
  const TierIcon = tier === 'partner' ? Crown : tier === 'standard' ? Zap : null;

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/20 border-slate-800 bg-slate-900 hover:border-amber-500/30">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative sm:w-48 h-40 sm:h-auto flex-shrink-0">
          <img
            src={business.photos?.[0] || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop'}
            alt={business.name}
            className="w-full h-full object-cover"
          />
          {/* Subtle gradient overlay for badge readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-transparent pointer-events-none" />
          {/* Stacked badges: top-left */}
          <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1">
            {showTierBadge && (
              <Badge className={`text-xs font-semibold px-2 py-0.5 border ${darkTierClasses}`}>
                {TierIcon && <TierIcon className="h-3 w-3 mr-1" />}
                {tierLabel}
              </Badge>
            )}
            {business.accepts_silver && showSilverBadge && (
              <span className="inline-flex items-center bg-black/20 backdrop-blur-sm text-white/90 text-[9px] font-normal px-1.5 py-0.5 rounded">
                <Coins className="h-2 w-2 mr-1 opacity-80" />
                Accepts Silver
              </span>
            )}
            {business.accepts_joy_coins && (
              <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs">
                <Coins className="h-3 w-3 mr-1" />
                Joy Coins
              </Badge>
            )}
            {business.is_locally_owned_franchise && showFranchiseBadge && (
              <span className="inline-flex items-center bg-black/20 backdrop-blur-sm text-white/90 text-[9px] font-normal px-1.5 py-0.5 rounded">
                <Store className="h-2 w-2 mr-1 opacity-80" />
                Local Franchise
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5 bg-slate-900">
          <div className="flex items-start justify-between gap-3 overflow-hidden">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-300">
                  {getCategoryLabel()}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg text-slate-100 truncate group-hover:text-amber-500 transition-colors">
                {business.name}
              </h3>
            </div>
            
            {/* Trust Signal */}
            <div className="flex-shrink-0">
              <TrustSignal business={business} />
            </div>
          </div>

          <p className="text-sm text-slate-400 mt-2 line-clamp-2">
            {business.description || 'No description available'}
          </p>

          <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
            {business.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {business.city}{business.state ? `, ${business.state}` : ''}
                {locationCount && locationCount > 1 && (
                  <span className="text-slate-500 ml-1">• {locationCount} locations</span>
                )}
              </span>
            )}
            {minPrice !== null && minPrice > 0 && (
              <span className="font-medium text-amber-500">
                From ${minPrice}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            {business.phone && (
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 border-slate-700 text-slate-300 hover:bg-transparent hover:border-amber-500 hover:text-amber-500"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = `tel:${business.phone}`;
                }}
              >
                <Phone className="h-3.5 w-3.5 mr-1.5" />
                Call
              </Button>
            )}
            <Link 
              to={createPageUrl(`BusinessProfile?id=${business.id}`)} 
              className="flex-1"
            >
              <Button 
                variant="default" 
                size="sm"
                className="w-full h-10 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
              >
                View Profile
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}