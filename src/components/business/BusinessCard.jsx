import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { MapPin, Zap, Crown, Coins, Store } from "lucide-react";
import TrustSignal from '@/components/recommendations/TrustSignal';

import { mainCategories, getMainCategory } from '@/components/categories/categoryData';
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

function getCategoryLabel(business) {
  if (business.primary_category) return business.primary_category;
  if (business.main_category) {
    const mainCat = getMainCategory(business.main_category);
    return mainCat?.label || business.main_category;
  }
  return legacyCategoryLabels[business.category] || business.category || '';
}

export default function BusinessCard({ business, badgeSettings = null, locationCount = null, showTierBadge = false, showNewToLocalLane = false }) {
  const showSilverBadge = badgeSettings?.show_accepts_silver_badge !== false;
  const showFranchiseBadge = badgeSettings?.show_locally_owned_franchise_badge !== false;
  const minPrice = business.services?.length > 0
    ? Math.min(...business.services.map((s) => s.starting_price || 0))
    : null;

  const tier = business.subscription_tier || 'basic';
  const tierLabel = getTierLabel(tier);
  const darkTierClasses = DARK_TIER_BADGE_CLASSES[tier] || DARK_TIER_BADGE_CLASSES.basic;
  const TierIcon = tier === 'partner' ? Crown : tier === 'standard' ? Zap : null;

  const imageSrc = business.logo_url || business.photos?.[0] || null;
  const profileUrl = createPageUrl(`BusinessProfile?id=${business.id}`);

  const subtitle = business.description?.trim()
    ? business.description
    : getCategoryLabel(business)
      ? getCategoryLabel(business)
      : null;

  const locationStr = business.city
    ? business.state
      ? `${business.city}, ${business.state}`
      : business.city
    : null;

  return (
    <Link
      to={profileUrl}
      className="block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-amber-500/50 transition-colors cursor-pointer"
    >
      {/* Image */}
      <div className="relative h-40 w-full flex-shrink-0 bg-slate-800 rounded-t-xl overflow-hidden">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600">
            <Store className="h-12 w-12" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-transparent to-transparent pointer-events-none" />
        {/* Badges overlay top-left */}
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1">
          {showNewToLocalLane && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
              New to LocalLane
            </Badge>
          )}
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

      {/* Text */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <h3 className="text-base font-semibold text-slate-100 truncate flex-1 min-w-0">
            {business.name}
          </h3>
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <TrustSignal business={business} />
          </div>
        </div>
        {subtitle != null && (
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
            {subtitle}
          </p>
        )}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {locationStr && (
            <p className="text-xs text-slate-500 flex items-center gap-1 min-w-0">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{locationStr}</span>
              {locationCount != null && locationCount > 1 && (
                <span className="flex-shrink-0 ml-1">· {locationCount} locations</span>
              )}
            </p>
          )}
          {minPrice != null && minPrice > 0 && (
            <span className="text-xs font-medium text-amber-500">From ${minPrice}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
