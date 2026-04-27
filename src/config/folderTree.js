// folderTree.js
//
// Declarative configuration for the cockpit's folder tree.
// New folders plug in here by adding a config entry. New visibility rules
// plug in via the predicate registry in folderPredicates.js.
//
// This file is the single source of truth for what folders exist and
// when they show. MyLaneSurface reads this and renders accordingly.
//
// Adding a new contextual root folder (e.g., Engagements):
//   1. Add an entry here with a `visible_when` referencing a predicate
//   2. Add the predicate to folderPredicates.js
//   3. Done. No MyLaneSurface edits.
//
// Entry shape:
//   id            unique string used by SpaceSpinner + drill state
//   label         display name rendered in cockpit chrome
//   icon          lucide-react component reference
//   kind          'folder' (descend-able) or 'leaf' (workspace at this level)
//   visible_when  predicate name from folderPredicates.js
//   dim           optional — preserves the spinner's dim/bright distinction
//
// Order reflects the order the spinner currently renders. Phase 4.0 captures
// what's standing — universal/contextual root folders described in v4.1
// (Directory, Events, Personal, Businesses, Admin, Playmaker, Networks)
// arrive in Phase 4.2a / 4.2b / 4.6 as additional entries here.

import {
  Home,
  UtensilsCrossed,
  Briefcase,
  DollarSign,
  Users,
  Store,
  Building2,
  Search,
  FlaskConical,
} from 'lucide-react';

export const folderTree = [
  { id: 'home',           label: 'Home',     icon: Home,            kind: 'leaf', visible_when: 'always' },
  { id: 'meal-prep',      label: 'Kitchen',  icon: UtensilsCrossed, kind: 'leaf', visible_when: 'has_meal_prep_profile' },
  { id: 'field-service',  label: 'Desk',     icon: Briefcase,       kind: 'leaf', visible_when: 'has_field_service_profile' },
  { id: 'finance',        label: 'Finances', icon: DollarSign,      kind: 'leaf', visible_when: 'has_finance_profile' },
  { id: 'team',           label: 'Team',     icon: Users,           kind: 'leaf', visible_when: 'has_team_role' },
  { id: 'business',       label: 'Business', icon: Store,           kind: 'leaf', visible_when: 'has_owned_business', dim: false },
  { id: 'property-pulse', label: 'Property', icon: Building2,       kind: 'leaf', visible_when: 'has_property_management_profile' },
  { id: 'discover',       label: 'Discover', icon: Search,          kind: 'leaf', visible_when: 'always', dim: true },
  { id: 'dev-lab',        label: 'Dev Lab',  icon: FlaskConical,    kind: 'leaf', visible_when: 'is_admin', dim: true },
];
