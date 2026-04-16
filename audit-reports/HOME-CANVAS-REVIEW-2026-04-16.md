# Home Canvas Rendering Spec — Feasibility Analysis

> Hyphae review of the Mylane Home Canvas Rendering architectural spec.
> Date: 2026-04-16

---

## 1. Component Inventory

Every "known component" from the spec was located in the codebase. All are already registered in `src/config/workspaceTypes.js` and mountable via `MyLaneDrillView`. The key question for each: can it accept pre-fetched data, or does it always fetch internally?

| Component | File | Accepts Data Props? | Self-Fetches? | Drill-Through? | Mount Difficulty | Notes |
|-----------|------|-------------------|--------------|---------------|-----------------|-------|
| **TeamRoster** | `src/components/team/TeamRoster.jsx` | YES (`members` array) | Partial (fetches `PlayerStats` internally) | YES (PlayerCard overlay) | MODERATE | Needs `team`, `members`, `isCoach`, `currentUserId` |
| **TeamPlaybook** | `src/components/team/TeamPlaybook.jsx` | YES (`team`, `members`) | YES (fetches `Play` + `PlayAssignment` internally) | YES (PlayDetail overlay) | HIGH | 6+ child components, quiz/study/sideline modes |
| **FieldServicePeople** | `src/components/fieldservice/FieldServicePeople.jsx` | NO | YES (fetches `FSClient` by `profile.id`) | YES (ClientDetail overlay) | MODERATE | Needs `profile`, `currentUser`, `onNavigateTab` |
| **FieldServiceEstimates** | `src/components/fieldservice/FieldServiceEstimates.jsx` | NO | YES (fetches `FSEstimate` by `profile.id`) | YES (inline detail + signature flow) | HIGH | 1,160+ lines, estimate editor, PDF, signing |
| **PropertyManagementProperties** | `src/components/propertymgmt/PropertyManagementProperties.jsx` | NO | YES (fetches `PMPropertyGroup` + `PMProperty`) | YES (dialog detail views) | MODERATE | Needs `profile`, `currentUser`, `memberRole`, `canEdit` |
| **FinanceActivity** | `src/components/finance/FinanceActivity.jsx` | NO | YES (fetches `Transaction` by `profile.id`) | Partial (edit modal) | MODERATE | Needs `profile`, `currentUser` |
| **FinanceDebts** | `src/components/finance/FinanceDebts.jsx` | NO | YES (fetches `Debt` by `profile.id`) | Partial (edit modal) | EASY | Needs `profile`, `currentUser` |
| **RemindersCard** | `src/components/mylane/cards/RemindersCard.jsx` | NO | YES (via `agentScopedQuery`) | NO (mark done / dismiss only) | ALREADY MOUNTED | Already on Home feed |
| **TeamSchedule** | `src/components/team/TeamSchedule.jsx` | NO | YES (via `fetchTeamData`) | Partial (event card expansion) | MODERATE | Needs `teamId`, `teamScope` object |

### Key finding: No component accepts raw data as props

Every component fetches its own data internally given a `profile`/`team` object. **None accept a `data` array prop** the way the spec's RENDER_CANVAS protocol envisions (`"data":[records]`). This means the spec's proposed TYPE 4 flow — where Mylane passes queried records directly to a component — won't work with existing components without creating adapter wrappers or modifying each component.

The existing components are designed for one pattern: "give me a workspace profile, I'll fetch and render everything myself." This is actually a strength for canvas mounting — we don't need the agent to pass data at all. We just need to tell the canvas WHICH component to mount with WHICH workspace profile, and the component handles the rest.

### What already works (the workspaceTypes registry)

`src/config/workspaceTypes.js` already provides:
- A `getProps(scope)` function for every tab component
- Scope assembly logic in `MyLaneDrillView.jsx` (lines 144-220)
- Every workspace's profile → component → props pipeline is solved

**This means mounting TeamRoster on the Home canvas is not a "build a new renderer" problem — it's a "reuse MyLaneDrillView's scope assembly for a single tab instead of the full tab bar" problem.**

---

## 2. RENDER_DATA Current Behavior

### Parsing: `parseRenderInstruction.js`

Location: `src/components/mylane/parseRenderInstruction.js`

Parses three instruction types from agent HTML comments in priority order:
1. `<!-- RENDER_CONFIRM:{...} -->` → `{ type: 'confirm', entity, action, data }`
2. `<!-- RENDER_DATA:{...} -->` → `{ type: 'data', entity, data, displayHint }`
3. `<!-- RENDER:{...} -->` → `{ type: 'workspace', workspace, view, tab }`

Uses regex + `JSON.parse` with try/catch fallthrough. Clean, defensive pattern.

### Rendering: `renderEntityView.jsx`

Location: `src/components/mylane/renderEntityView.jsx`

This is the "raw entity card dump" renderer. It does field-type detection by heuristic:
- Field names containing "amount", "price", "cost" → currency formatting
- Fields ending with `_id` → hidden
- Fields ending with `_at` or containing "date" → relative time
- Field named "status" → colored badge
- Everything else → plain text

**This is why the output looks like a database dump.** The renderer shows ALL fields (including `created_by`, `updated_date`, `source_space`, `created_by_agent`) because it has no concept of which fields are user-facing vs internal. It excludes `_id` suffix fields and JSON/empty values, but that's it.

### Data flow

```
User types in CommandBar
  → base44.agents.createConversation + addMessage
  → Poll for assistant response (up to 30 attempts)
  → parseRenderInstruction(response)
  → CommandBar calls onRenderResult(parsed) or onNavigate(parsed)
  → MyLaneSurface sets commandResult state
  → Command result card renders above renderContent()
  → For TYPE 2: renderEntityView({data, entity, workspace})
```

### Where to intercept for TYPE 4

The intercept point is in `CommandBar.jsx` where `parseRenderInstruction` is called. Adding RENDER_CANVAS would mean:
1. Add a fourth regex match in `parseRenderInstruction.js`
2. Return `{ type: 'canvas', component, workspace, label, data? }`
3. In CommandBar's dispatch logic, call `onRenderResult({ type: 'canvas', ... })`
4. In MyLaneSurface, handle `commandResult.type === 'canvas'` by mounting the appropriate workspace component

**However** — I'd recommend against this approach. See Section 5.

---

## 3. Home Feed Architecture

### Current layout hierarchy

```
MyLaneSurface
  ├── Header (z-50, ~45px)
  ├── Overlay system (z-30 to z-60)
  ├── Body (flex-1, relative)
  │   └── Content area (scrollable)
  │       ├── SpaceSpinner (horizontal gallery, always visible)
  │       ├── Physics tuner (admin-only)
  │       ├── Command result card ← agent responses render HERE
  │       │   ├── Loading state (pulsing dots)
  │       │   ├── Text response
  │       │   ├── Data response → renderEntityView()
  │       │   └── Confirm card → ConfirmationCard
  │       └── renderContent()
  │           ├── Home (spinnerIndex 0) → HomeFeed
  │           │   ├── Date + neighbor count
  │           │   ├── Tab selector (Attention | This week | Spaces)
  │           │   ├── RemindersCard (userId prop)
  │           │   └── PrioritySpinner (vertical scroll with depth effect)
  │           ├── Workspace drill → MyLaneDrillView
  │           └── Other spaces (Discover, Dev Lab)
  └── Fixed bottom: CommandBar (z-9997), FrequencyMiniPlayer (z-9998)
```

### Command result card position

The command result card (lines 1037-1091 in MyLaneSurface.jsx) sits ABOVE `renderContent()` in the scrollable area. It's a sibling to the workspace content, not overlaid. When present, it pushes HomeFeed down.

### Existing state for rendered content

MyLaneSurface already has `renderedData` state (line 423):
```javascript
const [renderedData, setRenderedData] = useState(null);
```

This is separate from `commandResult`. When `renderedData` is set, `renderContent()` renders it via `renderEntityView()` INSTEAD of HomeFeed (line 569). It's cleared on spinner navigation. This state is the existing hook for "show something instead of the Home feed" — exactly what RENDER_CANVAS needs.

### What would need to change for canvas content

The simplest approach: expand the `commandResult` handling to support a `type: 'canvas'` that mounts a workspace component instead of calling `renderEntityView()`. The infrastructure for "replace the command result card with a real component" already exists — the card area just needs to know how to mount workspace components via the same scope-assembly logic that `MyLaneDrillView` uses.

---

## 4. Feasibility by Phase

### Phase 1: Canvas Infrastructure

**Effort:** SMALL (1-2 sessions)
**Risk:** LOW

What's actually needed:
- Add `RENDER_CANVAS` regex to `parseRenderInstruction.js` (5 lines)
- Add `type: 'canvas'` handling in CommandBar dispatch (10 lines)
- Add canvas rendering in MyLaneSurface's command result card area (30 lines)
- Reuse `MyLaneDrillView`'s scope assembly logic — extract into a shared `buildWorkspaceScope()` function

**However:** The attention compression, response bar, and content shell described in the spec are premature for Phase 1. The existing command result card area is the right shell — it already has dismiss (X button), positioning, and styling. Phase 1 should mount components INSIDE the existing command result card, not build a new container system.

### Phase 2: Mount TeamRoster

**Effort:** SMALL (half a session)
**Risk:** LOW

TeamRoster is a good first choice because:
- It accepts `members` as a prop (hybrid fetching — takes members, fetches PlayerStats internally)
- It has real drill-through (PlayerCard overlay)
- It's visually rich and immediately better than the entity card dump
- Doron has a live team (Coach Rick) to test with

What's needed:
- Extract scope assembly from `MyLaneDrillView` into a shared helper
- Canvas renderer maps `component: "TeamRoster"` → mounts `TeamRoster` with team scope
- Agent instructions updated to emit `RENDER_CANVAS` instead of `RENDER_DATA` for team queries

### Phase 3: Additional Components

**Easiest to mount (do first):**
1. **FinanceDebts** — simple, self-fetching, just needs `profile` + `currentUser`
2. **FieldServicePeople** — self-fetching, has great drill-through
3. **TeamSchedule** — self-fetching, event cards are visually rich

**Moderate:**
4. **FinanceActivity** — self-fetching, transaction list
5. **PropertyManagementProperties** — self-fetching, needs role context

**Hardest (defer):**
6. **FieldServiceEstimates** — 1,160+ lines, estimate editor + signing flow, too complex for canvas
7. **TeamPlaybook** — complex, many child components, rate-limit optimization

### Phase 4: Dynamic Renderer

**Effort:** LARGE (2-3 sessions)
**Risk:** MEDIUM

The current `renderEntityView.jsx` is the starting point. It needs:
- Field visibility control (hide internal fields like `created_by`, `updated_date`, `source_space`)
- Entity-specific field ordering (show `name` first, then `status`, then user-facing fields)
- Better card layouts (the current grid is flat; needs visual hierarchy)
- Template primitives: metric card (single number), data table (rows), priority list (ordered with urgency)

**Recommendation:** Improve `renderEntityView.jsx` incrementally rather than building a separate "dynamic renderer." Add an `ENTITY_VISIBLE_FIELDS` map (like the existing `ENTITY_TITLE_FIELDS`) that excludes internal fields. This alone would fix 80% of the "database dump" problem.

### Phase 5: Polish

**Effort:** SMALL (1 session)
**Risk:** LOW

Existing animation infrastructure:
- `overlaySlideDown` keyframe already defined in MyLaneSurface CSS
- `transition: bottom 0.2s ease-out` pattern used on fixed elements
- PrioritySpinner has IntersectionObserver-based depth effects (scale + opacity)
- No shared animation library — all inline CSS transitions

Loading states: most components already have their own `isLoading` → skeleton/spinner patterns via React Query.

---

## 5. Concerns and Recommendations

### What's unrealistic

1. **Passing data in the RENDER_CANVAS tag is unnecessary.** No existing component accepts a `data` array as props. They all fetch internally. The instruction should specify WHICH component + WHICH workspace, not carry the data payload. This simplifies the protocol and avoids sending large JSON through HTML comments.

2. **Attention compression is premature.** The attention section (RemindersCard + PrioritySpinner) is small. Compressing it adds complexity (expand/collapse state, animation, header row) for negligible space savings. Defer until canvas content is proven valuable.

3. **"One rendered surface at a time" conflicts with existing command result behavior.** The command result card already coexists with HomeFeed. Making it exclusive (replaces HomeFeed) would change the spatial model. Better: keep the result card as an inserted section above HomeFeed, like it is now, but render a real component instead of entity cards.

### What I'd do differently

**Don't create TYPE 4. Improve TYPE 2 and add TYPE 1 shortcutting.**

The spec identifies a real problem (entity card dumps look terrible) but proposes a heavy solution (new render protocol, canvas infrastructure, component mounting system). There's a much lighter path:

**Option A — Improve renderEntityView (smallest effort, biggest impact):**
1. Add `ENTITY_HIDDEN_FIELDS` map to `renderEntityView.jsx` that excludes internal fields (`created_by`, `updated_date`, `created_date`, `created_by_agent`, `source_space`, etc.)
2. Add `ENTITY_FIELD_ORDER` map that puts important fields first (name, status, due_date, amount)
3. The entity card dump immediately looks 80% better with zero protocol changes

**Option B — Smart TYPE 1 routing (medium effort, transformative):**
1. When agent queries data and gets results, instead of emitting `RENDER_DATA` with raw records, emit `RENDER` with the appropriate workspace + view
2. Example: "show me the roster" → agent calls `agentScopedQuery` → gets data → but instead of `RENDER_DATA:{"entity":"TeamMember","data":[...]}`, emit `RENDER:{"workspace":"team","view":"roster"}`
3. TYPE 1 already mounts the real TeamRoster component via MyLaneDrillView
4. The data the agent queried is "wasted" (the component re-fetches), but the UX is perfect

**Option B is the recommendation.** It requires only agent instruction changes, no code changes. The existing TYPE 1 → MyLaneDrillView → workspaceTypes pipeline already mounts every component with full drill-through. The agent just needs to be taught: "when the user asks to see data, navigate them to the workspace tab that shows it, don't dump the raw records."

The cost is one redundant query (agent queries to confirm data exists, component re-queries to display it). At our scale (22 users), this is irrelevant. At 1,000 users, optimize then.

### Smallest slice that improves the current experience

**One change, zero new infrastructure:**

Add this to `renderEntityView.jsx`:

```javascript
const HIDDEN_FIELDS = new Set([
  'created_by', 'updated_date', 'created_date', 'created_by_agent',
  'source_space', 'note_type', 'workspace_id', 'profile_id',
  'user_id', 'owner_user_id', 'is_deleted',
]);
```

Then filter fields through it before rendering. The entity cards immediately stop showing internal database fields. This can ship in 10 minutes and fixes the visual problem that motivated the entire spec.

### Existing patterns to build on

1. **workspaceTypes.js** — the component registry with `getProps()` is the mounting system. Don't reinvent it.
2. **MyLaneDrillView scope assembly** — already solves "which props does this workspace component need?" for every workspace. Extract it into a reusable function if canvas mounting needs it.
3. **`renderedData` state in MyLaneSurface** — already exists as "override the Home feed with something else." Can be repurposed for canvas content.
4. **TYPE 1 RENDER** — already mounts full workspace views with drill-through. If the agent navigates to the right tab, the user gets the exact experience the spec describes, for free.

---

## 6. Riley Data Issue

**Finding:** No code path in the codebase can produce "$69.00" in the `parent_user_ids` field.

The `parent_user_ids` field on TeamMember is defined as `type: array` with `items: { type: string }` in `base44/entities/TeamMember.jsonc`. All code paths that write to this field correctly handle it as an array of string user IDs:

- **`claimTeamSpot/entry.ts`** (lines 75-90, 137-149): reads as array, pushes `user.id` (string), writes back as array
- **`TeamRoster.jsx`** (lines 129-146): `Array.isArray(member.parent_user_ids)` check, filters/pushes string IDs
- **`JoinTeam.jsx`** (lines 270-280): reads with fallback to legacy `parent_user_id`, pushes `user.id`

**Verdict: This is a data issue, not a code issue.** The "$69.00" value was likely entered manually in the Base44 dashboard (human error — typing a dollar amount into an ID field). To fix: open the TeamMember record for Riley in the Base44 dashboard and clear or correct the `parent_user_ids` field. The code will handle it correctly once the data is corrected.

No "Riley" string appears anywhere in the codebase — this is purely a database record.

---

## Summary Recommendations

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| **1** | Add `HIDDEN_FIELDS` to `renderEntityView.jsx` | 10 min | Fixes 80% of the visual problem |
| **2** | Update Mylane agent instructions: use TYPE 1 RENDER for "show me" queries instead of TYPE 2 RENDER_DATA | 30 min | Real components with drill-through, zero code changes |
| **3** | Fix Riley's `parent_user_ids` in Base44 dashboard | 2 min | Data correction |
| **4** | (Future) Extract scope assembly from MyLaneDrillView into shared helper | 1 session | Enables future canvas component mounting without full tab bar |
| **5** | (Future) Build RENDER_CANVAS if TYPE 1 routing proves insufficient | 2-3 sessions | Only if users need partial workspace views on Home |

The spec's vision is correct — real components on the Home canvas are better than entity dumps. But the fastest path there is **teaching the agent to navigate (TYPE 1) instead of building a new rendering pipeline (TYPE 4)**. The infrastructure already exists.
