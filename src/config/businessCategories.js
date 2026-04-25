// Curated business categories for owner-facing multi-select. Slug shape mirrors
// laneCountyTowns.js: `{ slug, display_name, main_category_slug }`. Slugs match
// what writes to Business.subcategories[] (the array field per DEC-055).
//
// Source of truth is `src/components/categories/categoryData.jsx`. This file
// is a flat view of that tree shaped for SlugMultiSelect consumers — one
// source, two shapes. When categoryData.jsx changes, this updates with it.

import { mainCategories } from '@/components/categories/categoryData';

export const BUSINESS_CATEGORIES = mainCategories.flatMap((main) =>
  main.subcategories.map((sub) => ({
    slug: sub.id,
    display_name: sub.label,
    main_category_slug: main.id,
  }))
);

const BY_SLUG = BUSINESS_CATEGORIES.reduce((acc, cat) => {
  acc[cat.slug] = cat;
  return acc;
}, {});

export function getCategoryDisplayName(slug) {
  return BY_SLUG[slug]?.display_name || slug;
}

export function isKnownCategorySlug(slug) {
  return Boolean(BY_SLUG[slug]);
}
