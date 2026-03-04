import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCategories } from '@/hooks/useCategories';
import { useConfig } from '@/hooks/useConfig';

function getCategoryLabel(business, getLabel, getMainCategory, legacyCategoryMapping) {
  const mainId = business.main_category || business.primary_category;
  const subId = business.subcategory || business.sub_category_id;
  if (mainId) {
    const label = getLabel(mainId, subId);
    if (label) return label;
  }
  if (business.category && legacyCategoryMapping?.[business.category]) {
    const { main, sub } = legacyCategoryMapping[business.category];
    return getLabel(main, sub) || business.category;
  }
  return business.category || '';
}

/**
 * DEC-060: Living Directory — Typographic business card.
 * No images, logos, or cover photos on cards. Equal visual weight for every business.
 * Photos and logos remain on the full BusinessProfile page.
 */
export default function BusinessCard({ business }) {
  const { getLabel, getMainCategory, legacyCategoryMapping } = useCategories();
  const { data: networksConfig = [] } = useConfig('platform', 'networks');

  const profileUrl = createPageUrl(`BusinessProfile?id=${business.id}`);
  const categoryLabel = getCategoryLabel(business, getLabel, getMainCategory, legacyCategoryMapping);
  const tier = business.subscription_tier || 'basic';

  const locationStr = business.city
    ? business.state
      ? `${business.city}, ${business.state}`
      : business.city
    : null;

  // Resolve network labels from slugs
  const networkLabels = (business.network_ids || [])
    .map((slug) => {
      const match = Array.isArray(networksConfig)
        ? networksConfig.find((n) => n.value === slug)
        : null;
      return match?.label || slug?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    })
    .filter(Boolean);

  // DEC-060: Vitality warmth — data-vitality drives ambient border glow via community reciprocity. Not built yet.
  return (
    <Link
      to={profileUrl}
      className="block bg-slate-800 border border-slate-700 rounded-lg p-5 cursor-pointer hover:border-amber-500/50 transition-colors"
      data-vitality="neutral"
    >
      {/* Business Name */}
      <h3 className="text-lg font-semibold text-white line-clamp-1">
        {business.name}
      </h3>

      {/* Category line */}
      {categoryLabel && (
        <p className="text-sm text-slate-400 mt-1 line-clamp-1">
          {categoryLabel}
        </p>
      )}

      {/* Location */}
      {locationStr && (
        <p className="text-sm text-slate-500 mt-2">
          {locationStr}
        </p>
      )}

      {/* Network chips */}
      {networkLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {networkLabels.map((label) => (
            <span
              key={label}
              className="bg-amber-500/10 text-amber-500 text-xs px-2 py-0.5 rounded-full"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Tier badge — only for standard or partner */}
      {tier === 'partner' && (
        <p className="mt-3 text-xs text-amber-500">
          {business.founding_member ? 'Founding Partner' : 'Partner'}
        </p>
      )}
      {tier === 'standard' && (
        <p className="mt-3 text-xs text-slate-500">
          {business.founding_member ? 'Founding Member' : 'Standard Member'}
        </p>
      )}
    </Link>
  );
}
