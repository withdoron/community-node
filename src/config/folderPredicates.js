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

  has_field_service_profile: ({ profiles }) =>
    len(profiles?.fieldServiceProfiles) > 0,

  has_finance_profile: ({ profiles }) =>
    len(profiles?.financeProfiles) > 0,

  has_property_management_profile: ({ profiles }) =>
    len(profiles?.propertyMgmtProfiles) > 0,
};
