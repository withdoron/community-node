// folderPredicates.js
//
// Predicate registry for the folder tree. Each predicate is a pure function
// that takes the current user state and returns a boolean. Folder entries
// in folderTree.js reference predicates by name (the `visible_when` field).
//
// Adding a new predicate:
//   1. Add a function here, keyed by a stable name.
//   2. Reference it from a folderTree.js entry.
//   3. Done. No MyLaneSurface edits.
//
// State shape passed to every predicate:
//   {
//     currentUser:     User record or null
//     profiles:        { financeProfiles, fieldServiceProfiles, allTeams,
//                        propertyMgmtProfiles, mealPrepProfiles }
//     ownedBusinesses: array of Business records
//   }
//
// MyLaneSurface already holds this data; predicates read from the same
// source rather than introducing new prop drilling.

const len = (arr) => (Array.isArray(arr) ? arr.length : 0);

export const predicates = {
  always: () => true,

  has_owned_business: ({ ownedBusinesses }) =>
    len(ownedBusinesses) > 0,

  is_admin: ({ currentUser }) =>
    currentUser?.role === 'admin',

  has_team_role: ({ profiles }) =>
    len(profiles?.allTeams) > 0,

  has_meal_prep_profile: ({ profiles }) =>
    len(profiles?.mealPrepProfiles) > 0,

  // Phase 4.2-tiles-4 cleanup (2026-04-28): has_field_service_profile
  // dropped — its only consumer was the field-service leaf under Personal,
  // which retired alongside it. Desk is now a business-only space (per
  // Section 8.13's city/buildings metaphor) and renders via the SPACE_TYPES
  // catalog when listed in a business's enabled_spaces.

  has_finance_profile: ({ profiles }) =>
    len(profiles?.financeProfiles) > 0,

  has_property_management_profile: ({ profiles }) =>
    len(profiles?.propertyMgmtProfiles) > 0,
};
