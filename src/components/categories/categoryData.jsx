/**
 * Category Architecture (DEC-055) — Single source of truth for Community Node categories.
 *
 * Three-layer model:
 * - Archetype: business type (e.g. "Food & Farm") — maps to main category
 * - Category: main + optional sub (e.g. food_farm + restaurant)
 * - Network: optional affinity (Harvest Network, Recess, etc.) for discovery
 *
 * This file is the curated category tree. All components consume via useCategories().
 * Phase 2 migrates consumers to the hook; Phase 3 removes legacy mapping after data migration.
 */

export const mainCategories = [
  {
    id: 'food_farm',
    label: 'Food & Farm',
    icon: 'Sprout',
    networkAffinity: 'Harvest Network',
    subcategories: [
      { id: 'farm', label: 'Farm & Ranch' },
      { id: 'farmers_market_vendor', label: 'Farmers Market Vendor' },
      { id: 'restaurant', label: 'Restaurant & Dining' },
      { id: 'bakery', label: 'Bakery' },
      { id: 'food_truck', label: 'Food Truck' },
      { id: 'cottage_food', label: 'Cottage Food' },
      { id: 'csa', label: 'CSA & Food Box' },
      { id: 'grocery', label: 'Grocery & Market' },
    ],
  },
  {
    id: 'movement_wellness',
    label: 'Movement & Wellness',
    icon: 'Activity',
    networkAffinity: 'Recess',
    subcategories: [
      { id: 'gym', label: 'Gym & Fitness Center' },
      { id: 'yoga', label: 'Yoga & Pilates' },
      { id: 'martial_arts', label: 'Martial Arts' },
      { id: 'dance', label: 'Dance Studio' },
      { id: 'climbing', label: 'Climbing & Bouldering' },
      { id: 'outdoor_rec', label: 'Outdoor Recreation' },
      { id: 'sports_league', label: 'Sports League' },
      { id: 'wellness', label: 'Wellness & Bodywork' },
    ],
  },
  {
    id: 'learning_creative',
    label: 'Learning & Creative',
    icon: 'Palette',
    networkAffinity: 'Creative Alliance',
    subcategories: [
      { id: 'music_lessons', label: 'Music Lessons' },
      { id: 'art_studio', label: 'Art Studio' },
      { id: 'tutoring', label: 'Tutoring & Education' },
      { id: 'maker_space', label: 'Maker Space' },
      { id: 'pottery', label: 'Pottery & Ceramics' },
      { id: 'bookstore', label: 'Bookstore & Library' },
      { id: 'workshop_host', label: 'Workshop Host' },
      { id: 'language', label: 'Language & Culture' },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    icon: 'Wrench',
    networkAffinity: null,
    subcategories: [
      { id: 'contractor', label: 'Contractor & Construction' },
      { id: 'mechanic', label: 'Auto Repair & Mechanic' },
      { id: 'landscaping', label: 'Landscaping & Lawn Care' },
      { id: 'childcare', label: 'Childcare & Nanny' },
      { id: 'cleaning', label: 'Cleaning & Janitorial' },
      { id: 'consulting', label: 'Consulting & Professional' },
      { id: 'pet_services', label: 'Pet Care & Dog Walking' },
      { id: 'home_services', label: 'Home Services & Handyman' },
    ],
  },
  {
    id: 'community',
    label: 'Community',
    icon: 'Heart',
    networkAffinity: 'Gathering Circle',
    subcategories: [
      { id: 'church', label: 'Church & House of Worship' },
      { id: 'nonprofit', label: 'Nonprofit & Charity' },
      { id: 'club', label: 'Club & Association' },
      { id: 'coop', label: 'Co-op & Collective' },
      { id: 'school', label: 'School & Homeschool Group' },
      { id: 'community_org', label: 'Community Organization' },
    ],
  },
];

/**
 * Vendor-recognizable subcategories by archetype. Used for "What best describes your business?"
 * dropdown in Business Settings. Single-select; value stored on Business.subcategory.
 */
export const archetypeSubcategories = {
  location_venue: [
    'Restaurant / Café',
    'Bar / Brewery / Taproom',
    'Fitness / Movement Studio',
    'Art Studio / Gallery',
    'Community Space / Venue',
    'Retail Shop',
    'Salon / Spa',
    'Coworking / Office',
    'Other',
  ],
  event_organizer: [
    'Markets & Fairs',
    'Live Music & Performance',
    'Workshops & Classes',
    'Sports & Fitness Events',
    'Community Gatherings',
    'Kids & Family Events',
    'Festivals',
    'Other',
  ],
  community_nonprofit: [
    'Church / Faith Community',
    'Youth Organization',
    'Environmental / Conservation',
    'Arts & Culture',
    'Education / Homeschool',
    'Mutual Aid / Social Services',
    'Other',
  ],
  service_provider: [
    'Health & Wellness',
    'Home Services',
    'Creative & Design',
    'Tutoring & Education',
    'Pet Services',
    'Tech & Repair',
    'Other',
  ],
  product_seller: [
    'Food & Beverage',
    'Arts & Crafts',
    'Farm & Produce',
    'Health & Wellness Products',
    'Handmade Goods',
    'Vintage & Resale',
    'Other',
  ],
  micro_business: [
    'Farm Fresh / Eggs',
    'Handmade Goods',
    'Baked Goods',
    'Artisan Crafts',
    'Neighborhood Services',
    'Kids Business',
    'Other',
  ],
};

/** Default main category IDs for Home tile display (used by Home.jsx, DiscoverSection.jsx). */
export const defaultPopularCategoryIds = mainCategories.map((c) => c.id);

/** Find a main category by id. */
export function getMainCategory(id) {
  return mainCategories.find((c) => c.id === id) ?? null;
}

/** Find a subcategory within a main category. */
export function getSubcategory(mainId, subId) {
  const main = getMainCategory(mainId);
  if (!main) return null;
  return main.subcategories.find((s) => s.id === subId) ?? null;
}

/** Display string: "Main › Sub" or "Main" if no subId. */
export function getLabel(mainId, subId) {
  const main = getMainCategory(mainId);
  if (!main) return mainId ?? '';
  if (!subId) return main.label;
  const sub = getSubcategory(mainId, subId);
  return sub ? `${main.label} › ${sub.label}` : main.label;
}

/**
 * Get subcategory label by id. With one argument, searches all categories.
 * With two arguments (mainId, subId), backward-compat for existing consumers.
 */
export function getSubcategoryLabel(mainIdOrSubId, subId) {
  if (subId !== undefined) {
    const sub = getSubcategory(mainIdOrSubId, subId);
    return sub?.label ?? subId;
  }
  for (const main of mainCategories) {
    const sub = main.subcategories.find((s) => s.id === mainIdOrSubId);
    if (sub) return sub.label;
  }
  return mainIdOrSubId;
}

/** Flat array of all subcategories with mainId and mainLabel attached. */
export function getAllSubcategories() {
  return mainCategories.flatMap((main) =>
    main.subcategories.map((sub) => ({
      ...sub,
      mainId: main.id,
      mainLabel: main.label,
    }))
  );
}

/** Main categories whose networkAffinity matches the given network name. */
export function getCategoriesByNetwork(networkName) {
  if (!networkName) return mainCategories;
  return mainCategories.filter((c) => c.networkAffinity === networkName);
}

/**
 * All subcategory IDs for a main category (excluding "all" options).
 * Kept for backward compatibility until Phase 2 migrates consumers.
 */
export function getSubcategoryIds(mainCategoryId) {
  const main = getMainCategory(mainCategoryId);
  if (!main) return [];
  return main.subcategories.filter((s) => !s.id.startsWith('all_')).map((s) => s.id);
}

/**
 * Legacy slug → { main, sub } for Phase 3 data migration.
 * Do not remove until migration is complete.
 */
export const legacyCategoryMapping = {
  'carpenter': { main: 'home_services', sub: 'carpenters_handymen' },
  'mechanic': { main: 'auto_transportation', sub: 'mechanics' },
  'landscaper': { main: 'home_services', sub: 'landscaping' },
  'farm': { main: 'farms_food', sub: 'farms_ranches' },
  'bullion_dealer': { main: 'bullion_coins', sub: 'bullion_dealers' },
  'electrician': { main: 'home_services', sub: 'electricians' },
  'plumber': { main: 'home_services', sub: 'plumbers' },
  'handyman': { main: 'home_services', sub: 'carpenters_handymen' },
  'cleaning': { main: 'home_services', sub: 'cleaning' },
  'other': { main: 'moving_misc', sub: 'all_local' },
};
