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
//   children      optional — for folders with static children (e.g. Personal)
//   dim           optional — preserves the spinner's dim/bright distinction
//
// Nesting representation: nested `children` arrays. Chosen over `parent_id`
// because the tree shape is immediately readable (one glance shows the
// hierarchy), and adding a child can't typo a parent reference. Predicates
// apply at every level; helpers below filter recursively.
//
// Phase 4.2a (2026-04-27) — Directory, Events, Personal, Businesses join the
// root level. Personal is the new home of the personal-flavored leaves
// (home, finance, meal-prep, team, property-pulse, field-service desk).
// Businesses replaces the singular `business` leaf as the descend point for
// the existing DEC-168 switcher.
//
// Dynamic children (e.g. Businesses → ownedBusinesses) are NOT in this
// file — they're computed at runtime in MyLaneSurface from useActiveBusiness.
// `kind: 'folder'` here just declares descent-ability; what shows on descent
// is decided by the renderer.

import {
  Home,
  UtensilsCrossed,
  DollarSign,
  Users,
  Store,
  Building2,
  Search,
  BookOpen,
  Calendar,
  User,
} from 'lucide-react';

export const folderTree = [
  // Universal root folders (v4.1 §14.1)
  { id: 'directory', label: 'Directory', icon: BookOpen, kind: 'folder', visible_when: 'always' },
  { id: 'events',    label: 'Events',    icon: Calendar, kind: 'folder', visible_when: 'always' },
  { id: 'personal',  label: 'Personal',  icon: User,     kind: 'folder', visible_when: 'always',
    children: [
      { id: 'home',           label: 'Home',     icon: Home,            kind: 'leaf', visible_when: 'always' },
      { id: 'meal-prep',      label: 'Kitchen',  icon: UtensilsCrossed, kind: 'leaf', visible_when: 'has_meal_prep_profile' },
      // Phase 4.2-tiles-4 cleanup (2026-04-28): field-service (Desk) removed
      // from Personal. Per Section 8.13's city/buildings metaphor, Desk is a
      // business-district building — it lives inside each business via
      // `enabled_spaces`, never under Personal. The has_field_service_profile
      // predicate and the Briefcase icon import were dropped alongside.
      { id: 'finance',        label: 'Finances', icon: DollarSign,      kind: 'leaf', visible_when: 'has_finance_profile' },
      { id: 'team',           label: 'Team',     icon: Users,           kind: 'leaf', visible_when: 'has_team_role' },
      { id: 'property-pulse', label: 'Property', icon: Building2,       kind: 'leaf', visible_when: 'has_property_management_profile' },
    ],
  },
  { id: 'businesses', label: 'Businesses', icon: Store, kind: 'folder', visible_when: 'has_owned_business' },
  { id: 'discover',   label: 'Discover',   icon: Search, kind: 'leaf',  visible_when: 'always', dim: true },
  // Phase 4.2-tiles-4 (2026-04-28): dev-lab removed from the folder tree.
  // The DevLab component itself is still mounted by MyLaneSurface as the
  // admin physics tuner toggle (gated by currentUser.role === 'admin') —
  // unrelated to the folder tree. The is_admin predicate stays in the
  // registry for any future contextual root that needs it.
];

// ─── Helpers ────────────────────────────────────────────────────────
// Pure tree-walking utilities. State and predicates pass through; the
// helpers themselves know nothing about user state.

function passes(entry, state, predicates) {
  return Boolean(predicates[entry.visible_when]?.(state));
}

function toItem(entry) {
  const item = { id: entry.id, label: entry.label, icon: entry.icon, kind: entry.kind };
  if ('dim' in entry) item.dim = entry.dim;
  return item;
}

// Root-level cockpit items, filtered by predicates.
export function rootItems(state, predicates) {
  return folderTree.filter((e) => passes(e, state, predicates)).map(toItem);
}

// Static children of a folder by id, filtered by predicates. Returns []
// when the folder has no static children (e.g., businesses — handled at
// runtime by MyLaneSurface from ownedBusinesses).
export function folderItems(folderId, state, predicates) {
  const folder = folderTree.find((e) => e.id === folderId);
  if (!folder?.children) return [];
  return folder.children.filter((e) => passes(e, state, predicates)).map(toItem);
}

// Locate a leaf id anywhere in the static tree. Returns { folderId, id }
// where folderId is null for root-level leaves, or the parent folder id
// for nested leaves. Returns null if the id is not in the static tree
// (e.g., a dynamic business id under Businesses).
export function locateLeaf(id) {
  for (const e of folderTree) {
    if (e.id === id && e.kind === 'leaf') return { folderId: null, id };
    if (e.children) {
      const child = e.children.find((c) => c.id === id);
      if (child) return { folderId: e.id, id };
    }
  }
  return null;
}

// Flat list of every leaf in the tree that passes predicates. Used by
// HomeFeed and similar surfaces that want every available workspace
// regardless of which folder it lives under.
export function allLeaves(state, predicates) {
  const out = [];
  for (const e of folderTree) {
    if (passes(e, state, predicates)) {
      if (e.kind === 'leaf') out.push(toItem(e));
      if (e.children) {
        for (const c of e.children) {
          if (passes(c, state, predicates) && c.kind === 'leaf') out.push(toItem(c));
        }
      }
    }
  }
  return out;
}
