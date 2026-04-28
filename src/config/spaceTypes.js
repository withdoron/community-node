// spaceTypes.js
//
// Space-type catalog — single source of truth for what each business space
// type renders as in the tile cockpit. Mirrors the living-feet pattern of
// folderTree.js / folderPredicates.js / VARIANT_MAP / WORKSPACE_TYPES:
// adding a new space type is one config entry here, never an inline
// conditional in TilesCockpit.
//
// Each entry maps a space-type string (as stored in `Business.enabled_spaces`)
// to its tile metadata. The renderer in TilesCockpit reads this catalog when
// building the tile grid for a specific business.
//
// Universal spaces (Profile, Settings) render for every business regardless
// of `enabled_spaces`. They are listed here for tile metadata and flagged
// `universal: true` — never added to enabled_spaces in any backfill, just
// guaranteed by composition in `resolveBusinessSpaces()`. Per Section 8.13
// of PHASE-4-MIGRATION-PLAN.md: "Settings as universal — Settings is never
// listed in enabled_spaces. Profile and Settings render unconditionally for
// every business."
//
// Workspace renderers are not yet wired here — tiles-4 only mounts the tile
// grid. Tile-tap dispatches through MyLaneSurface, which decides whether the
// space has a renderer (Profile, Desk, Finance, etc. — existing
// MyLaneDrillView paths) or a placeholder (Settings, until tiles-5 lifts
// BusinessSettings into a space surface).
//
// Accent palette: drawn from the same border-l-{color}-700 family already
// in use by BusinessCard's category accents and TilesCockpit's folder
// accents. No new colors invented; per-space-type assignments below picked
// from the existing palette to keep the visual story coherent.
//
// Reference: PHASE-4-MIGRATION-PLAN.md Section 8.13.

export const SPACE_TYPES = {
  // ─── Universal spaces — render for every business ───────────────────
  profile: {
    id: 'profile',
    label: 'Profile',
    sublabel: 'Directory listing',
    accentClass: 'border-l-amber-700',
    universal: true,
  },
  settings: {
    id: 'settings',
    label: 'Settings',
    sublabel: 'Manage your business',
    accentClass: 'border-l-gray-700',
    universal: true,
  },

  // ─── Opt-in spaces — appear only when listed in enabled_spaces ──────
  desk: {
    id: 'desk',
    label: 'Desk',
    sublabel: 'Active work',
    accentClass: 'border-l-sky-700',
    universal: false,
  },
  finance: {
    id: 'finance',
    label: 'Finance',
    sublabel: 'Books & flow',
    accentClass: 'border-l-teal-700',
    universal: false,
  },
  team: {
    id: 'team',
    label: 'Team',
    sublabel: 'Roster & coordination',
    accentClass: 'border-l-violet-700',
    universal: false,
  },
  kitchen: {
    id: 'kitchen',
    label: 'Kitchen',
    sublabel: 'Recipes & meals',
    accentClass: 'border-l-rose-700',
    universal: false,
  },
  property: {
    id: 'property',
    label: 'Property',
    sublabel: 'Properties & tenants',
    accentClass: 'border-l-blue-700',
    universal: false,
  },
  events: {
    id: 'events',
    label: 'Events',
    sublabel: 'Schedule & RSVPs',
    accentClass: 'border-l-purple-700',
    universal: false,
  },
};

const UNIVERSAL_IDS = Object.keys(SPACE_TYPES).filter(
  (id) => SPACE_TYPES[id].universal,
);

/**
 * Resolves a business's full set of space tiles in the order they should
 * render. Universal spaces (Profile, Settings) come first; the business's
 * `enabled_spaces` follow in array order, deduplicated against the
 * universal pair.
 *
 * Defensive: type-strings that aren't in the catalog are silently dropped
 * rather than crashing — reduces blast radius if Base44 records carry a
 * stray value or a future space type lands before its catalog entry does.
 */
export function resolveBusinessSpaces(business) {
  const enabled = Array.isArray(business?.enabled_spaces) ? business.enabled_spaces : [];
  const ordered = [...UNIVERSAL_IDS, ...enabled];
  const seen = new Set();
  const out = [];
  for (const id of ordered) {
    if (seen.has(id)) continue;
    seen.add(id);
    const meta = SPACE_TYPES[id];
    if (meta) out.push(meta);
  }
  return out;
}
