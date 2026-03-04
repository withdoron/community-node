# CLAUDE.md — Claude Code Context

> Read at the start of every Claude Code session.
> Lean by design — uses @imports for details. Only what Claude cannot guess lives here.
> Update this file when a mistake should never recur or a new convention is established.
> Last updated: 2026-03-03

---

## Project Context

LocalLane — community-first platform in Eugene, Oregon. Base44 backend, React/Vite/Tailwind frontend. Dark theme only (Gold Standard).

**Doron is the founder. Not an engineer.** Never make architectural decisions unilaterally. Flag and ask.

@context/PROJECT-BRAIN.md
@context/ACTIVE-CONTEXT.md

---

## Architecture & Patterns

@ARCHITECTURE.md
@DECISIONS.md
@STYLE-GUIDE.md
@.cursorrules

For decisions DEC-001 through DEC-060, check DECISIONS.md before assuming behavior.

---

## Session Protocol

1. Read this file + @imports
2. Ask what we're working on (or read ACTIVE-CONTEXT.md)
3. Build — data layer first, then components, then surfaces
4. Test — Doron checks browser, reports with screenshots
5. Learn — update this file with new pitfalls or conventions
6. Document — update spec-repo if decisions were made
7. Push — single descriptive commit

**At session end:** Remind Doron to update `context/ACTIVE-CONTEXT.md` and append to `context/SESSION-LOG.md`.

---

## Retrieval-First Rule

> **IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning.**
> Base44, LocalLane architecture, entity schemas, and style patterns are NOT in your training data.
> Always read the referenced files before generating code. When in doubt, check the source — don't guess.

Key source files to read before coding:

| What | Where |
|------|-------|
| Entities & SDK | `src/api/entities.js`, `src/api/base44Client.js` |
| Auth & user | `src/lib/AuthContext.jsx` (provides `useAuth` hook) |
| Tier system | `src/hooks/useOrganization.js` |
| Organism vitality | Not yet implemented (planned) |
| RSVP logic | `src/hooks/useRSVP.js` |
| Admin panel | `src/pages/Admin.jsx`, `src/components/admin/` |
| MyLane | `src/pages/MyLane.jsx`, `src/components/mylane/` |
| Dashboard | `src/pages/BusinessDashboard.jsx`, `src/components/dashboard/` |
| Config data | `src/config/` |

---

## Base44 SDK Patterns (AUTHORITATIVE)

Base44 is NOT in your training data. Use these exact patterns:

```javascript
// CRUD
EntityTable.create(data)               // → created record
EntityTable.get(id)                    // → record or null
EntityTable.list()                     // → array
EntityTable.filter({ field: value }).list()  // → filtered array
EntityTable.update(id, data)           // → updated record
EntityTable.delete(id)                 // → hard delete (permanent, DEC-004)

// Auth (two patterns used in the codebase)
// Pattern 1: useAuth hook (preferred for components needing auth context)
import { useAuth } from '@/lib/AuthContext';
const { user, isAuthenticated } = useAuth();

// Pattern 2: inline query (used in most pages)
const { data: currentUser } = useQuery({
  queryKey: ['currentUser'],
  queryFn: () => base44.auth.me()
});

// Fetch pattern
useEffect(() => {
  const fetch = async () => {
    const data = await EntityTable.filter({ user_id: user.id }).list();
    setItems(data);
  };
  if (user?.id) fetch();
}, [user?.id]);
```

**Entity definitions live in the Base44 dashboard, not in this repo.** There is no `base44/entities/` folder.

**Base44 .filter().list() quirk:** Returns arrays directly. Chaining `.list()` on an already-resolved array returns empty object. Test your query patterns.

---

## Tier System

Three tiers. Always lowercase in code and database.

```javascript
subscription_tier: 'basic' | 'standard' | 'partner'
// Use the hook, not raw string comparisons:
const { tier, tierLevel, canUseJoyCoins, canAutoPublish, isPartner } = useOrganization();
// tierLevel: 1 = basic, 2 = standard, 3 = partner
```

Locked feature pattern:
```jsx
{tierLevel < 2 ? (
  <div className="flex items-center gap-2 text-slate-400">
    <Lock className="h-4 w-4 text-amber-500" />
    <span>Standard tier required</span>
  </div>
) : (
  <ActualFeature />
)}
```

---

## Gold Standard — Quick Reference

```
BACKGROUNDS:  bg-slate-950 (page) / bg-slate-900 (cards) / bg-slate-800 (elevated)
ACCENT:       bg-amber-500 (primary) / bg-amber-400 (hover) / bg-amber-600 (active)
TEXT:          text-white (primary) / text-slate-300 (secondary) / text-slate-400 (muted) / text-black (on gold)
BORDERS:      border-slate-800 (default) / border-white/10 (subtle) / border-amber-500 (selected)
ICONS:        text-amber-500 (emphasis) or text-white / text-slate-400 (default). Lucide React only.
NEVER:        bg-white, bg-blue-*, bg-green-*, colorful icons, gradients
```

Full details: @STYLE-GUIDE.md

---

## Data Storage Patterns

Staff roles and invites use AdminSettings key-value store (DEC-016):
- `staff_roles:{business_id}` — JSON array of `[{ user_id, role, added_at }]`
- `staff_invites:{business_id}` — Pending invites
- `platform_config:{domain}:{config_type}` — Platform configuration (DEC-005)

---

## Known Pitfalls — Do Not Repeat These

### shadcn/ui Checkbox & Switch Infinite Loop (DEC-018)

Radix UI primitives conflict with controlled parent onClick → infinite render loop. Replace with pure CSS equivalents when parent div handles click.

### 403 Permission Handling for Staff (DEC-015)

Non-owners get 403 when fetching User records. Wrap in try/catch, return fallback:
```javascript
try { const user = await User.filter({ id }); return user; }
catch { return { id, email: 'Team Member', _permissionDenied: true }; }
```

### Toggle Knob Color

Use `bg-slate-100` for toggle knobs, not `bg-white` (too bright against dark backgrounds).

### Dead Code — Do NOT Reference (DEC-024, DEC-026)

Removed: `review_count`, `average_rating`, `StarRating`, `ReviewCard`, `WriteReview`, `boost_credits`, `boost_duration`, `src/components/reviews/`. Recommendation system uses Nods, Stories, Vouches (DEC-021, DEC-022).

### React Components Inside Render Functions

Defining components inside render functions causes focus loss on every keystroke (discovered during Finance Node builds). Always define components at module level.

### Base44 AI Assistant Reverts Permissions

Base44's AI assistant reverts manual entity permissions when asked to set security via schema files. Always use the Base44 dashboard UI manually for entity permissions.

### Secondary Button Hover Flash

Always include `hover:bg-transparent` on outline buttons to override shadcn/ui Button's default `hover:bg-accent` which causes a white background flash.

### formatCurrency

Use `Intl.NumberFormat` — never `.toFixed(2)`.

---

## File Organization

| Type | Location |
|------|----------|
| Generic UI primitives | `src/components/ui/` (shadcn only) |
| Feature components | `src/components/{feature}/` |
| Shared utilities | `src/utils/` |
| Static data/config | `src/config/` |
| Hooks | `src/hooks/` |
| Business-logic components | `src/components/dashboard/` (NOT `src/components/ui/`) |

Move files to correct locations incrementally. No large reorganization PRs.

`EventEditor.jsx` is 1400+ lines — work in small focused edits.

---

## Security (DEC-025)

- 13/18+ entities have RLS policies
- Business/AccessWindow/Location writes migrated to server functions (2026-02-20)
- DO NOT change entity permissions without explicit discussion
- 10 entities still need service role function migration

---

## Financial / Legal

- Stripe integration is incomplete — no payment processing works yet
- Community Pass replaced Punch Pass (Oregon money transmitter license issue)
- DO NOT build payment features without explicit instruction
- Before real money flows: legal review, revenue share agreements, 1099-NEC prep needed

---

## Staff Role Badge Colors (DEC-013)

- Owner: `bg-amber-500 text-black`
- Manager: `bg-purple-500 text-white`
- Instructor: `bg-blue-500 text-white`
- Staff: `border-slate-500 text-slate-300` (outline)
- Pending: `border-amber-500 text-amber-500` (outline)

---

## Status Indicator Colors (DEC-028)

Admin/dashboard contexts only (NOT public-facing UI):
- Amber — Primary, active, highlighted
- Blue (`bg-blue-500/20 text-blue-400`) — Informational, neutral
- Teal (`bg-teal-500/20 text-teal-400`) — Selection states in wizards
- Red/Orange — Destructive actions only (DEC-017)

---

## Verification Criteria

When modifying UI: run the local server, verify changes match Gold Standard before concluding. Check:
- [ ] No light backgrounds anywhere
- [ ] Icons are gold or white only
- [ ] Mobile-responsive
- [ ] Console clean (no errors, no debug logs)
- [ ] Empty/loading/error states handled

---

*This document compounds over time. Every correction makes future sessions smarter.*
