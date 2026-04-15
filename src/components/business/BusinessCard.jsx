import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import { useCategories } from '@/hooks/useCategories';
import { useConfig } from '@/hooks/useConfig';

/**
 * Category accent colors — muted tones that signal identity, not hierarchy.
 * Maps main_category id → Tailwind border-l class.
 */
const CATEGORY_ACCENT_COLORS = {
  food_farm: 'border-l-amber-700',
  movement_wellness: 'border-l-teal-700',
  learning_creative: 'border-l-violet-700',
  services: 'border-l-sky-700',
  community: 'border-l-rose-700',
};

/** Archetype fallback — used when main_category isn't set */
const ARCHETYPE_ACCENT_COLORS = {
  location_venue: 'border-l-amber-700',
  event_organizer: 'border-l-violet-700',
  service_provider: 'border-l-sky-700',
  community_nonprofit: 'border-l-rose-700',
  micro_business: 'border-l-teal-700',
  product_seller: 'border-l-amber-700',
};

const DEFAULT_ACCENT = 'border-l-muted-foreground';

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

export function resolveCategoryAccent(business, legacyCategoryMapping) {
  // 1. Direct main_category match
  const mainId = business.main_category || business.primary_category;
  if (mainId && CATEGORY_ACCENT_COLORS[mainId]) return CATEGORY_ACCENT_COLORS[mainId];

  // 2. Legacy category string → resolved main id
  if (business.category && legacyCategoryMapping?.[business.category]) {
    const { main } = legacyCategoryMapping[business.category];
    if (main && CATEGORY_ACCENT_COLORS[main]) return CATEGORY_ACCENT_COLORS[main];
  }

  // 3. Raw category string as direct key (some businesses store the main id in .category)
  if (business.category && CATEGORY_ACCENT_COLORS[business.category]) {
    return CATEGORY_ACCENT_COLORS[business.category];
  }

  // 4. Archetype fallback
  if (business.archetype && ARCHETYPE_ACCENT_COLORS[business.archetype]) {
    return ARCHETYPE_ACCENT_COLORS[business.archetype];
  }

  return DEFAULT_ACCENT;
}

/**
 * DEC-060: Living Directory — Typographic business card with ambient life signals.
 * No images, logos, or cover photos. Equal visual weight for every business.
 * Category accent bar signals identity. Hover warmth signals aliveness.
 */
export default function BusinessCard({ business, onBusinessClick, onNetworkClick }) {
  const navigate = useNavigate();
  const { getLabel, getMainCategory, legacyCategoryMapping } = useCategories();
  const { data: networksConfig = [] } = useConfig('platform', 'networks');

  const profileUrl = createPageUrl(`BusinessProfile?id=${business.id}`);
  const categoryLabel = getCategoryLabel(business, getLabel, getMainCategory, legacyCategoryMapping);
  const accentColor = resolveCategoryAccent(business, legacyCategoryMapping);
  const tier = business.subscription_tier || 'basic';

  const locationStr = business.city
    ? business.state
      ? `${business.city.trim()}, ${business.state.trim()}`
      : business.city.trim()
    : null;

  // Resolve network slugs + labels
  const networks = (business.network_ids || [])
    .map((slug) => {
      const match = Array.isArray(networksConfig)
        ? networksConfig.find((n) => n.value === slug)
        : null;
      const label = match?.label || slug?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return label ? { slug, label } : null;
    })
    .filter(Boolean);

  const cardClass = cn(
    "block rounded-lg p-5 cursor-pointer",
    "bg-gradient-to-br from-secondary to-secondary/90",
    "border border-border",
    "hover:border-primary/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.08)]",
    "hover:-translate-y-0.5",
    "transition-all duration-300 ease-out",
    "border-l-4",
    accentColor
  );

  // When onBusinessClick is provided (inside Mylane shell), intercept navigation
  const Wrapper = onBusinessClick
    ? ({ children, ...rest }) => (
        <div {...rest} onClick={(e) => { e.preventDefault(); onBusinessClick(business.id); }}>
          {children}
        </div>
      )
    : ({ children, ...rest }) => <Link to={profileUrl} {...rest}>{children}</Link>;

  return (
    <Wrapper
      className={cardClass}
      data-vitality="neutral"
    >
      {/* Business Name */}
      <h3 className="text-lg font-semibold text-foreground line-clamp-1">
        {business.name}
      </h3>

      {/* Category line */}
      {categoryLabel && (
        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
          {categoryLabel}
        </p>
      )}

      {/* Product tags */}
      {Array.isArray(business.product_tags) && business.product_tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {business.product_tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="text-xs bg-secondary text-foreground-soft rounded-full px-2 py-0.5">
              {tag}
            </span>
          ))}
          {business.product_tags.length > 3 && (
            <span className="text-xs text-muted-foreground/70">+{business.product_tags.length - 3} more</span>
          )}
        </div>
      )}

      {/* Location */}
      {locationStr && (
        <p className="text-sm text-muted-foreground/70 mt-2">
          {locationStr}
        </p>
      )}

      {/* Network chips */}
      {networks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {networks.map(({ slug, label }) => (
            <span
              key={slug}
              role="link"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNetworkClick ? onNetworkClick(slug) : navigate(`/networks/${slug}`);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  onNetworkClick ? onNetworkClick(slug) : navigate(`/networks/${slug}`);
                }
              }}
              className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors cursor-pointer"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Tier badge — only for standard or partner */}
      {tier === 'partner' && (
        <p className="mt-3 text-xs text-primary">
          {business.founding_member ? 'Founding Partner' : 'Partner'}
        </p>
      )}
      {tier === 'standard' && (
        <p className="mt-3 text-xs text-muted-foreground/70">
          {business.founding_member ? 'Founding Member' : 'Standard Member'}
        </p>
      )}
    </Wrapper>
  );
}
