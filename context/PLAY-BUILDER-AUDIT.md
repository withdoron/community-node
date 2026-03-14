# PLAY-BUILDER-AUDIT.md

> Read-only audit of the Play Builder, Playbook Pro, and Team workspace features.
> Covers every component, hook, config, and entity flow related to play creation, study, and game-day use.
> Date: 2026-03-14

---

## Files Reviewed (30 files)

### Team Components (`src/components/team/`)
| File | Lines | Purpose |
|------|-------|---------|
| PlayBuilder.jsx | ~808 | Visual SVG play builder — drag positions, chain routes, save |
| PlayCreateModal.jsx | ~473 | Modal wrapper with Visual Builder / Upload Photo toggle |
| PlayCard.jsx | ~62 | Thumbnail card with mini PlayRenderer |
| PlayDetail.jsx | ~289 | Full-screen play detail with assignment breakdown |
| TeamPlaybook.jsx | ~353 | Main playbook hub — list, filter, launch modes |
| RouteSelector.jsx | ~318 | Route chaining UI — 1-3 segments with yard steppers |
| StudyMode.jsx | ~391 | Flashcard-style play study with swipe navigation |
| SidelineMode.jsx | ~195 | Coach game-day quick-reference (desktop only) |
| QuizMode.jsx | ~951 | Playbook Pro game engine — 7 question types |
| TeamHome.jsx | ~434 | Team dashboard with Playbook Pro card and leaderboard |
| TeamRoster.jsx | ~246 | Roster management with add modal |
| TeamContextSwitcher.jsx | ~52 | Parent-child device switcher |
| TeamSettings.jsx | ~417 | Team config, invite code, transfer, archive |
| TeamSchedule.jsx | ~567 | Event CRUD with recurring events |
| TeamMessages.jsx | ~224 | Announcements + Discussion channels |

### Field Rendering (`src/components/field/`)
| File | Lines | Purpose |
|------|-------|---------|
| PlayRenderer.jsx | ~171 | Shared SVG renderer (view/study/sideline/mini/gameMode) |
| FlagFootballField.jsx | ~134 | Base SVG field — viewBox "0 0 400 200", end zones, yard lines |
| PositionMarker.jsx | ~197 | Draggable SVG circle with tap/drag threshold |
| RoutePath.jsx | ~82 | SVG polyline with arrowhead marker |
| RouteDrawCanvas.jsx | ~162 | Freehand drawing overlay — simplifies to 20 points |

### Config (`src/config/`)
| File | Lines | Purpose |
|------|-------|---------|
| flagFootball.js | ~686 | Sport config — formats, formations, routes, glossary |
| quizConfig.js | ~180 | Mastery levels, scoring, difficulty phases, similar routes |
| workspaceTypes.js | ~270 | Workspace type registry — team has 6 tabs |

### Hooks (`src/hooks/`)
| File | Lines | Purpose |
|------|-------|---------|
| useQuiz.js | ~800+ | Full quiz engine — question generation, adaptive difficulty, mastery |
| usePlayerStats.js | ~205 | PlayerStats CRUD, high score approximation from QuizAttempt |

### Pages & API
| File | Lines | Purpose |
|------|-------|---------|
| pages.config.js | — | Route config — TeamOnboarding, JoinTeam pages |
| base44Client.js | ~13 | Base44 SDK client creation |

---

## Bugs (Broken Functionality)

### BUG-01: Photo mode edit destroys positional data
**File:** `PlayCreateModal.jsx:213`
**Severity:** High

On edit, photo mode deletes ALL existing PlayAssignment records then recreates them from the form. This permanently loses `start_x` and `start_y` coordinates since photo mode doesn't capture positional data. A coach who creates a play in visual mode, then edits it in photo mode, loses all position coordinates.

```javascript
// Line 213 — deletes everything, recreates without coordinates
await Promise.all(existingAssignments.map(a => PlayAssignment.delete(a.id)));
```

### BUG-02: Photo mode hardcoded to 5v5 positions
**File:** `PlayCreateModal.jsx:30`
**Severity:** High

Photo mode hardcodes `POSITIONS = ['C', 'QB', 'RB', 'X', 'Z']`. Teams using 7v7 format cannot assign Y or TE positions when creating plays via photo upload. The visual builder correctly reads positions from `flagFootball.js` config, but photo mode bypasses it entirely.

### BUG-03: Visual builder only supports offense
**File:** `PlayBuilder.jsx:366`
**Severity:** Medium

The visual builder hardcodes `side: 'offense'` in the save payload. Defense plays can only be created via photo mode. This limits the visual builder to half the playbook.

```javascript
side: 'offense', // hardcoded — no UI toggle for defense
```

### BUG-04: SidelineMode shows wrong route field for visual plays
**File:** `SidelineMode.jsx:~150`
**Severity:** Medium

Position detail overlay reads `overlayAssignment.route` but the visual builder saves route data as `movement_type`. Visual builder plays will show "—" instead of the actual route in Sideline Mode. Only photo-mode plays populate the `route` field.

### BUG-05: Tag inconsistency between creation modes
**File:** `PlayCreateModal.jsx:26` vs `PlayBuilder.jsx`
**Severity:** Low

Photo mode `TAG_OPTIONS` includes `'blitz'` which doesn't exist in PlayBuilder's `TAG_OPTIONS`. Plays tagged with "blitz" in photo mode won't match any tag filter if the filter list comes from PlayBuilder's constants.

### BUG-06: PlayDetail and StudyMode hardcode 5v5 sort order
**Files:** `PlayDetail.jsx:~15`, `StudyMode.jsx:~20`
**Severity:** Medium

Both files define `POSITION_ORDER = ['C', 'QB', 'RB', 'X', 'Z']`. For 7v7 teams, positions Y and TE won't appear in the sort order, causing them to fall to the end or sort unpredictably in the assignment list.

### BUG-07: TeamRoster POSITIONS hardcoded to 5v5
**File:** `TeamRoster.jsx`
**Severity:** Medium

The `POSITIONS` array in the add-member modal only offers 5v5 positions. 7v7 teams can't assign Y or TE when adding roster members.

### BUG-08: TeamSchedule and TeamMessages receive no props from workspace engine
**Files:** `workspaceTypes.js`, `TeamSchedule.jsx`, `TeamMessages.jsx`
**Severity:** Medium

`workspaceTypes.js` defines `getProps: () => ({})` for the schedule tab, but `TeamSchedule` expects `{ teamId, teamScope }` props. These components rely on `teamScope` being injected by a parent component outside the workspace engine's `getProps` flow. If the injection path changes, both tabs silently break.

### BUG-09: Leaderboard `m.name` field may not exist
**File:** `TeamHome.jsx`
**Severity:** Low

Leaderboard displays `m.jersey_name || m.name || 'Player'`. The `TeamMember` entity appears to have `jersey_name` and `jersey_number` but no `name` field. The fallback chain works (falls through to `'Player'`), but every member without a `jersey_name` shows as "Player" — losing identity.

---

## UX Friction (Works But Confusing or Clunky)

### UX-01: Two creation modes with incompatible data models
**File:** `PlayCreateModal.jsx`

The Visual Builder and Upload Photo tabs produce plays with different field populations: visual uses `movement_type` + `route_segments` + `start_x/start_y`, photo uses `route` + no coordinates. Downstream components (SidelineMode, StudyMode, PlayDetail) must handle both shapes. This dual-model creates ongoing maintenance burden and inconsistent display.

### UX-02: No roster edit or delete
**File:** `TeamRoster.jsx`

Coaches can add roster members but cannot edit position, jersey name, or jersey number after creation. No delete/remove flow exists. The only way to fix a mistake is at the database level.

### UX-03: Sideline Mode inaccessible on mobile
**File:** `SidelineMode.jsx` / `TeamPlaybook.jsx`

The Sideline Mode launch button uses `hidden md:flex`, hiding it on phones. Coaches using phones on game day — the primary sideline use case — cannot access this feature.

### UX-04: `window.confirm()` for destructive actions
**Files:** `PlayBuilder.jsx`, `TeamSettings.jsx`

Formation change confirmation and archive confirmation use browser `window.confirm()` instead of styled Gold Standard dialogs. Breaks the premium feel and is unstyled on mobile.

### UX-05: No search or name filter in playbook
**File:** `TeamPlaybook.jsx`

Plays can be filtered by offense/defense toggle and formation grouping, but there's no text search by play name. As playbooks grow, finding a specific play requires scrolling.

### UX-06: No way to view archived plays
**File:** `TeamPlaybook.jsx`

Archive action exists but there's no UI to view or restore archived plays. Once archived, plays are effectively deleted from the coach's perspective.

### UX-07: Team format is free-text input
**File:** `TeamSettings.jsx`

The team format field is a plain text input rather than a constrained dropdown (5v5 / 7v7). A typo like "5v55" or "seven on seven" would break position logic throughout the app since `flagFootball.js` expects exact string matches.

### UX-08: Quiz requires minimum play count but doesn't guide creation
**File:** `useQuiz.js`

The quiz engine needs plays with assignments to generate questions. If a team has zero or very few plays, the quiz either fails silently or generates repetitive questions. No onboarding prompt guides coaches to create plays first.

---

## Polish (Visual / Layout Improvements)

### POL-01: PlayCard aspect ratio mismatch
**File:** `PlayCard.jsx`

Uses `aspect-video` (16:9) container but the field viewBox is `"0 0 400 200"` (2:1). This causes slight letterboxing or stretching of the mini renderer depending on how the SVG scales.

### POL-02: StudyMode inconsistent field height
**File:** `StudyMode.jsx`

Field renderer uses `minHeight: '40vh'` as an inline style. Other contexts (PlayBuilder, PlayDetail) don't use inline min-height, creating inconsistent field sizing across views.

### POL-03: QuizMode hearts use red fill — Gold Standard violation
**File:** `QuizMode.jsx`

The Hearts component renders red-filled hearts (`text-red-500` / `fill-red-500`). The Gold Standard explicitly prohibits functional color-coding: "No red hearts, green checkmarks." Hearts should use amber-500 or white.

### POL-04: QuizMode injects unmanaged CSS
**File:** `QuizMode.jsx`

Animations are injected via `document.createElement('style')` appended to `<head>`. This style element is never cleaned up on unmount, accumulating duplicate style tags across quiz sessions.

### POL-05: GAME_ROUTE_COLORS overrides could be confusing
**File:** `PlayRenderer.jsx`

Game mode overrides C route color from gray to white and QB to blue for visibility. These colors aren't documented in the Gold Standard or explained to users, potentially confusing coaches who see different colors in quiz vs. study mode.

### POL-06: RouteDrawCanvas freehand simplification is aggressive
**File:** `RouteDrawCanvas.jsx`

Custom-drawn routes are simplified to MAX_POINTS=20 with MIN_POINT_DISTANCE=2%. Complex curved routes may lose detail. No visual feedback shows the simplified result before saving.

---

## Stale Code (Dead Imports, Unused Variables, Old Patterns)

### STALE-01: Duplicate constants in PlayCreateModal
**File:** `PlayCreateModal.jsx:17-45`

Photo mode defines its own `FORMATIONS`, `ROUTES`, `TAG_OPTIONS`, and `POSITIONS` constants that duplicate (with differences) what already exists in `flagFootball.js`. These should reference the config file for consistency.

### STALE-02: Legacy OFFENSE_ROUTES export
**File:** `flagFootball.js`

```javascript
// Legacy export — kept for backward compatibility
export const OFFENSE_ROUTES = ...
```

This export is marked as legacy. Need to verify if any component still imports it; if not, remove.

### STALE-03: Dual route field pattern (`route` vs `movement_type`)
**Files:** Multiple

Photo mode saves to `route` field on PlayAssignment, visual builder saves to `movement_type`. Both fields coexist on the entity. PlayDetail handles both (`movement_type || route`), but this dual-field pattern is technical debt from the photo-first era.

### STALE-04: `format` field referenced but not set
**File:** `PlayRenderer.jsx`

PlayRenderer checks `play.format` to determine position count, but PlayBuilder's save payload doesn't include a `format` field. The renderer falls back correctly, but the dead reference suggests an incomplete migration.

---

## Missing Edge Cases

### EDGE-01: No handling for team format change after plays exist
If a coach changes team format from 5v5 to 7v7 (or vice versa), existing plays retain their old position assignments. No migration, warning, or revalidation occurs. Plays could reference positions that don't exist in the new format.

### EDGE-02: No loading state for PlayBuilder initial load
**File:** `PlayBuilder.jsx`

When editing an existing play, the builder renders immediately while assignments are still loading. The `editDataReady` guard in PlayCreateModal helps, but if PlayBuilder is ever used standalone, it would render an empty field briefly.

### EDGE-03: QuizMode with all-defense playbook
**File:** `useQuiz.js`

If a team only has defense plays, the offense-focused question types (identify your route, formation identification) would have no valid plays to draw from. The quiz engine doesn't check for minimum play count per side.

### EDGE-04: No error boundary around PlayRenderer SVG
**File:** `PlayRenderer.jsx`

If route_segments JSON is malformed or coordinates are NaN, the SVG rendering could throw. No error boundary wraps the renderer, so a single corrupt play could crash the entire playbook view.

### EDGE-05: `custom_positions` double-stringify risk
**File:** `PlayBuilder.jsx`

Custom positions are stored as a JSON array. If Base44's backend auto-stringifies JSON fields, and the code also calls `JSON.stringify()`, the field could be double-encoded. The current code appears to handle this, but there's no explicit guard against it.

### EDGE-06: Quiz attempt persistence during poor connectivity
**File:** `useQuiz.js`

QuizAttempt records are saved after each answer. On poor connectivity (common at outdoor fields), failed saves could silently drop mastery data. No retry or offline queue exists.

---

## Recommendations (Prioritized)

### P0 — Fix Before Spring Season (Real Users Waiting)

1. **Unify position arrays to config-driven** (BUG-02, BUG-06, BUG-07)
   All position lists (`POSITIONS`, `POSITION_ORDER`) should read from `flagFootball.js` based on `team.format`. This is a single-source-of-truth fix affecting PlayCreateModal, PlayDetail, StudyMode, and TeamRoster. ~2 hours.

2. **Fix SidelineMode route display** (BUG-04)
   Change overlay to read `movement_type || route` instead of just `route`. ~15 minutes.

3. **Make Sideline Mode accessible on mobile** (UX-03)
   Remove `hidden md:flex` from the launch button. Consider a simplified mobile layout. ~30 minutes.

4. **Fix photo mode edit destroying coordinates** (BUG-01)
   On edit, only update changed fields on existing assignments instead of delete-all-recreate. Or warn that switching modes will lose position data. ~1 hour.

### P1 — Important for Quality

5. **Constrain team format to dropdown** (UX-07)
   Replace free-text input with select: `['5v5', '7v7']`. Prevents invalid format strings from breaking position logic. ~15 minutes.

6. **Add roster edit and delete** (UX-02)
   Coaches need to fix mistakes. Add edit modal and delete with confirmation. ~2 hours.

7. **Replace `window.confirm()` with styled dialogs** (UX-04)
   Use Gold Standard modal pattern for formation change and archive confirmations. ~1 hour.

8. **Fix QuizMode hearts to Gold Standard** (POL-03)
   Change red hearts to amber-500. ~10 minutes.

9. **Clean up injected CSS on unmount** (POL-04)
   Add useEffect cleanup to remove the style element. ~10 minutes.

### P2 — Technical Debt

10. **Consolidate PlayCreateModal constants to flagFootball.js** (STALE-01)
    Remove duplicate FORMATIONS, ROUTES, POSITIONS, TAG_OPTIONS from modal. Import from config. ~30 minutes.

11. **Unify `route` vs `movement_type` fields** (STALE-03)
    Migrate all reads to `movement_type`, backfill existing `route`-only records. ~2 hours with data migration.

12. **Add defense support to visual builder** (BUG-03)
    Add offense/defense toggle to PlayBuilder. Requires defensive formation definitions in flagFootball.js. ~4 hours.

13. **Add error boundary around PlayRenderer** (EDGE-04)
    Wrap in React error boundary with fallback UI. ~30 minutes.

14. **Add format change warning** (EDGE-01)
    When team format changes in settings, warn if existing plays use positions not in the new format. ~1 hour.

### P3 — Nice to Have

15. **Add playbook search by name** (UX-05)
    Text filter above play list. ~30 minutes.

16. **Add archived plays view** (UX-06)
    Tab or toggle to show archived plays with restore action. ~1 hour.

17. **Fix PlayCard aspect ratio** (POL-01)
    Use `aspect-[2/1]` instead of `aspect-video`. ~5 minutes.

18. **Verify and remove OFFENSE_ROUTES legacy export** (STALE-02)
    Check all imports, remove if unused. ~15 minutes.

19. **Add quiz minimum play guidance** (UX-08, EDGE-03)
    Show helpful message when team has too few plays for meaningful quiz. ~30 minutes.

---

## Architecture Notes

The Play Builder system is well-structured overall. The route chaining system in `flagFootball.js` is sophisticated and the quiz engine in `useQuiz.js` has thoughtful adaptive difficulty. The main architectural concern is the **dual data model** from visual vs. photo creation modes — this creates branching logic in every downstream consumer and should be unified before the feature set grows further.

The SVG rendering pipeline (FlagFootballField → PositionMarker → RoutePath → PlayRenderer) is clean and composable. The percentage-based coordinate system (0-100) mapped to a fixed viewBox is a solid pattern.

The workspace engine integration works but relies on implicit prop injection rather than the `getProps` contract in `workspaceTypes.js`. This should be formalized before adding more workspace types.

---

*Audit performed 2026-03-14. Read-only — no source files modified.*
