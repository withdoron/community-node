// spaceTypes.js
//
// Space-type catalog — single source of truth for what each business space
// type renders as in the tile cockpit. Mirrors the living-feet pattern of
// folderTree.js / folderPredicates.js / VARIANT_MAP / WORKSPACE_TYPES:
// adding a new space type is one config entry here, never an inline
// conditional in TilesCockpit or BusinessSettingsSpace.
//
// Each entry maps a space-type string (as stored in `Business.enabled_spaces`)
// to its tile + picker metadata. Consumers:
//   • TilesCockpit — renders the per-business spaces tile grid
//   • BusinessSettingsSpace — Add Space picker, enabled-spaces list,
//                             pricing display
//   • BusinessSpacePlaceholder — label/sublabel for unwired spaces
//
// Universal spaces (Profile, Settings) render for every business regardless
// of `enabled_spaces`. They are listed here for tile metadata and flagged
// `universal: true` — never added to enabled_spaces in any backfill, just
// guaranteed by composition in `resolveBusinessSpaces()`. Per Section 8.13
// of PHASE-4-MIGRATION-PLAN.md and DEC-186.
//
// The Settings UI's Add Space picker hides universal entries, lists everything
// else, and disables the Add button on entries with `status: 'coming_soon'`.
// When a coming-soon space gets a real surface (or is otherwise ready to add),
// flip its status to 'active' here — no changes needed in the picker UI.
//
// Pricing: every entry carries a `pricing` object with shape
//   { type, amount, period, display, details }
// During the beta window, every entry sets `display: 'Free during beta'` so
// the picker and enabled-spaces list show that string verbatim. When Stripe
// integration lands, the override is removed and the display is computed
// from type/amount/period. No schema change at that time. (DEC-101/DEC-128
// pricing model — utility-style $9 increments, transparent gauge.)
//
// Forward compatibility — Jobs rename: when `desk` is renamed to `jobs`,
// only this file's key + label changes plus a one-time migration of
// `enabled_spaces` arrays in Base44. The Settings UI reads everything from
// `SPACE_TYPES[id]` so no UI rewrite is needed.
//
// Reference: PHASE-4-MIGRATION-PLAN.md Section 8.13. Decisions: DEC-186
// (universal spaces), DEC-190 (single source of label truth).

export const SPACE_TYPES = {
  // ─── Universal spaces — render for every business ───────────────────
  profile: {
    id: 'profile',
    label: 'Profile',
    sublabel: 'Directory listing',
    description: 'Your public face on LocalLane. Logo, name, services, hours, and contact info shown to neighbors browsing the directory.',
    accentClass: 'border-l-amber-700',
    universal: true,
    status: 'active',
    pricing: {
      type: 'free',
      amount: 0,
      period: null,
      display: 'Free during beta',
      details: {},
    },
  },
  settings: {
    id: 'settings',
    label: 'Settings',
    sublabel: 'Manage your business',
    description: 'Operational hub. Enable or remove spaces, set document branding, manage directory visibility, and control payment toggles.',
    accentClass: 'border-l-gray-700',
    universal: true,
    status: 'active',
    pricing: {
      type: 'free',
      amount: 0,
      period: null,
      display: 'Free during beta',
      details: {},
    },
  },

  // ─── Opt-in spaces — appear only when listed in enabled_spaces ──────
  desk: {
    id: 'desk',
    label: 'Desk',
    sublabel: 'Active work',
    description: 'Where active jobs, estimates, documents, and clients live. The day-to-day operations surface for your business.',
    accentClass: 'border-l-sky-700',
    universal: false,
    status: 'active',
    pricing: {
      type: 'flat',
      amount: 9,
      period: 'monthly',
      display: 'Free during beta',
      details: {},
    },
  },
  finance: {
    id: 'finance',
    label: 'Finance',
    sublabel: 'Books & flow',
    description: 'Income, expenses, and how money moves through your business. Real-time view of what you earned this month.',
    accentClass: 'border-l-teal-700',
    universal: false,
    status: 'coming_soon',
    pricing: {
      type: 'flat',
      amount: 9,
      period: 'monthly',
      display: 'Free during beta',
      details: {},
    },
  },
  team: {
    id: 'team',
    label: 'Team',
    sublabel: 'Roster & coordination',
    description: 'Workers, subs, schedules, and team communication for businesses with more than one person on the ground.',
    accentClass: 'border-l-violet-700',
    universal: false,
    status: 'coming_soon',
    pricing: {
      type: 'flat',
      amount: 9,
      period: 'monthly',
      display: 'Free during beta',
      details: {},
    },
  },
  kitchen: {
    id: 'kitchen',
    label: 'Kitchen',
    sublabel: 'Recipes & meals',
    description: 'Recipes, meal planning, and prep workflows for food-related businesses (caterers, prep services, food trucks).',
    accentClass: 'border-l-rose-700',
    universal: false,
    status: 'coming_soon',
    pricing: {
      type: 'flat',
      amount: 9,
      period: 'monthly',
      display: 'Free during beta',
      details: {},
    },
  },
  property: {
    id: 'property',
    label: 'Property',
    sublabel: 'Properties & tenants',
    description: 'Property management — units, tenants, rent rolls, maintenance requests. Built for landlords and property managers.',
    accentClass: 'border-l-blue-700',
    universal: false,
    status: 'coming_soon',
    pricing: {
      type: 'flat',
      amount: 9,
      period: 'monthly',
      display: 'Free during beta',
      details: {},
    },
  },
  events: {
    id: 'events',
    label: 'Events',
    sublabel: 'Schedule & RSVPs',
    description: 'Schedule events, manage RSVPs, and connect with neighbors who attend. Useful for businesses that host gatherings.',
    accentClass: 'border-l-purple-700',
    universal: false,
    status: 'coming_soon',
    pricing: {
      type: 'free',
      amount: 0,
      period: null,
      display: 'Free during beta',
      details: {},
    },
  },
};

/**
 * Identifiers of universal spaces — every business renders these regardless
 * of `enabled_spaces`. Computed from `universal: true` flags so adding a new
 * universal space (rare) means flipping one flag, not editing two lists.
 *
 * Consumers: BusinessSettingsSpace's Add Space picker (filters these out —
 * they're never addable), enabled-spaces list (suppresses remove control on
 * these — they're never removable), TilesCockpit's resolveBusinessSpaces
 * (unions these into every business's tile grid).
 */
export const UNIVERSAL_SPACE_IDS = Object.keys(SPACE_TYPES).filter(
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
  const ordered = [...UNIVERSAL_SPACE_IDS, ...enabled];
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

/**
 * Returns the catalog entries that the Add Space picker should show for a
 * given business — every non-universal catalog entry, with a per-entry
 * `isEnabled` flag indicating whether the business already has it active.
 * Picker UI uses `isEnabled` to decide whether to show "Active" + checkmark
 * or "Add" / "Coming soon" buttons.
 */
export function listAddableSpaces(business) {
  const enabled = new Set(
    Array.isArray(business?.enabled_spaces) ? business.enabled_spaces : [],
  );
  return Object.values(SPACE_TYPES)
    .filter((meta) => !meta.universal)
    .map((meta) => ({ ...meta, isEnabled: enabled.has(meta.id) }));
}
