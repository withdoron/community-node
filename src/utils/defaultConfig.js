/**
 * Default platform config (AdminSettings fallback).
 * Used as fallback when no config is stored, and for seeding.
 * See CONFIG-SYSTEM.md and Spec-Repo/STEP-1.1-PLATFORM-CONFIG-ENTITY.md.
 */

export const DEFAULT_CONFIG = {
  events: {
    event_types: [
      { value: 'markets_fairs', label: 'Markets & Fairs', active: true, sort_order: 1 },
      { value: 'live_music', label: 'Live Music', active: true, sort_order: 2 },
      { value: 'food_drink', label: 'Food & Drink', active: true, sort_order: 3 },
      { value: 'workshops_classes', label: 'Workshops & Classes', active: true, sort_order: 4 },
      { value: 'sports_active', label: 'Sports & Active', active: true, sort_order: 5 },
      { value: 'art_culture', label: 'Art & Culture', active: true, sort_order: 6 },
      { value: 'meetings_gatherings', label: 'Meetings & Gatherings', active: true, sort_order: 7 },
      { value: 'other', label: 'Other', active: true, sort_order: 99 },
    ],
    age_groups: [
      { value: 'all_ages', label: 'All Ages', active: true, sort_order: 1 },
      { value: '5_12', label: '5-12', active: true, sort_order: 2 },
      { value: '13_17', label: '13-17', active: true, sort_order: 3 },
      { value: 'adults', label: 'Adults (18+)', active: true, sort_order: 4 },
      { value: 'seniors', label: 'Seniors (65+)', active: true, sort_order: 5 },
    ],
    duration_presets: [
      { value: '30', label: '30 minutes', minutes: 30, active: true, sort_order: 1 },
      { value: '60', label: '1 hour', minutes: 60, active: true, sort_order: 2 },
      { value: '90', label: '1.5 hours', minutes: 90, active: true, sort_order: 3 },
      { value: '120', label: '2 hours', minutes: 120, active: true, sort_order: 4 },
      { value: '180', label: '3 hours', minutes: 180, active: true, sort_order: 5 },
    ],
  },
  platform: {
    networks: [
      { value: 'homeschool_community', label: 'Homeschool Community', active: true, sort_order: 1 },
      { value: 'recess', label: 'Recess', active: true, sort_order: 2 },
      { value: 'creative_alliance', label: 'Creative Alliance', active: true, sort_order: 3 },
      { value: 'local_parents', label: 'Local Parents Network', active: true, sort_order: 4 },
      { value: 'arts_council', label: 'Arts Council', active: true, sort_order: 5 },
      { value: 'fitness_coalition', label: 'Fitness Coalition', active: true, sort_order: 6 },
    ],
  },
};

export function getDefaultConfig(domain, configType) {
  return DEFAULT_CONFIG[domain]?.[configType] ?? [];
}
