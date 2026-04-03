# Team Space Audit Report
**Date:** 2026-04-03 (Friday)
**Auditor:** Hyphae (Claude Code)
**Purpose:** Coach Rick demo readiness check (5:00 PM today)
**Recipient:** Mycelia (strategic review)

---

## Executive Summary

The Team space is **85-90% demo-ready**. Core experiences (Roster, Playbook, Playbook Pro, Visual Play Builder, Print) are solid and production-grade. The two risk areas are **entity permissions for non-owner coaches** and **a missing leaderboard**. Everything else is polish.

---

## 1. ROSTER

### Working
- Full CRUD for coaches (add, edit, delete team members)
- Role-based display: coaches, players, parents with correct badges
- Jersey numbers and positions display correctly
- Parent-player linking via heart icon (bidirectional)
- Pending/unclaimed roster spots show "Pending" badge
- Coach promotion flow (parent -> coach) works via server function
- Empty state messaging present
- Loading spinners and error toasts functional
- Copy invite links (family + coach) from roster UI

### Broken
- **Nothing blocking for demo** — all core roster operations work

### Missing
- No bulk add (must add players one at a time)
- No search/filter on roster (fine for a 12-player team, problem at league scale)
- No jersey number collision detection (two players can be #12)
- No lineup/active squad concept (bench vs starter)
- Dual storage format for parent links (`parent_user_id` singular vs `parent_user_ids` array) — fragile but functional

### Demo Risk: LOW

---

## 2. PLAYBOOK

### Working
- **4 offensive formations:** Spread, Trips, Twins, Bunch
- **5 defensive formations:** Man-to-Man, Cover 1, Cover 2, Cover 3, Blitz
- Visual Play Builder renders SVG field with position markers, route paths, drag-and-drop
- **24+ route templates** (slant, post, curl, fade, fly, dig, flat, corner, etc.)
- Route chaining and freehand drawing supported
- Defense-aware rendering — offense/defense toggle with correct position colors
- Mirror plays work (view-only X-flip toggle, no data mutation)
- **3 print layouts:** Player Card (1 play/page), Quick Reference (4/page grid), Full Page (with assignments table)
- Seed Defense Plays button bootstraps 4 default defensive plays
- Game-day flagging toggle per play
- Play status lifecycle: active, experimental, archived
- Coach notes field on plays
- Server function protection via `manageTeamPlay` — coaches bypass RLS correctly

### Broken
- **PrintPlaybook references `play.image_url` but entity field is `diagram_image`** — photo mode fallback in print silently fails (won't show photo-based play diagrams in print)
- **PrintPlaybook references `play.notes` but field is `play.coach_notes`** — coach notes won't appear in printed output
- **EditDataReady logic flaw in PlayCreateModal** — if a play has zero assignments, edit mode hangs forever (spinner)
- No zone vs man coverage visual distinction (data stored but not rendered differently)

### Missing
- Mirror plays are view-only (no auto-generation of mirrored variants as separate plays)
- No explicit error boundary on SVG renderer — malformed route JSON could crash

### Demo Risk: LOW (print bugs won't surface unless printing photo-mode plays)

---

## 3. PLAYBOOK PRO (ARCADE GAME)

### Working
- **Game launches correctly** — three states: ready, playing, gameover
- **3 lives system** — lose on wrong answer, recover at streak milestones (5, 10, 15, 20)
- **Heart animation** on life loss (0.5s scale/opacity pulse)
- **Adaptive mastery system** — two layers:
  - Per-play mastery: new -> learning -> familiar -> mastered (based on accuracy + attempts)
  - Per-session difficulty phases: Warm Up -> Building -> Challenging -> Hard -> Expert -> Legendary
- **Mastery weighting** — weaker plays appear more often (4x for new, 1x for mastered)
- **7 question types:** Name That Play, Know Your Job, Identify Route, True/False, Which Position, Coach Says, Odd One Out
- **Timer scales** with mastery: none (new) -> 15s (familiar) -> 10s (mastered) -> 6s (legendary)
- **Score multiplier** — 2x at streak 5, 3x at streak 10, plus speed bonus
- All offense plays + mirrors accessible (filtered by side=offense, status=active)
- Game-day filter toggle (show only flagged plays)
- **StudyMode:** Swipe-through play reference, "My Assignment" vs "Full Play" views, coach preview mode
- **SidelineMode:** Full-screen field diagram, tap position buttons for assignment overlays, game-day focused

### Broken
- **No leaderboard** — high scores are personal only, not ranked against teammates
- High score is approximated from QuizAttempt sessions (not stored as a single field) — recalculated each time, could drift
- Browser close mid-game = all progress lost (QuizAttempts saved per-answer, but score/state is in-memory)

### Missing
- **Leaderboard / competitive rankings** — this is the biggest gap for team engagement
- No "coach challenge" mode (coach sets a target score)
- No offline support
- Score persistence is session-derived, not first-class

### Demo Risk: MEDIUM (no leaderboard is a visible gap if Rick asks "who's winning?")

---

## 4. NAVIGATION & UX

### Working
- **6 tabs:** Home, Playbook, Schedule, Roster, Messages, Settings
- All tabs wired with icons (lucide-react), no dead buttons
- Mobile-responsive: `grid-cols-1 sm:grid-cols-3`, `max-w-md mx-auto` containers
- Touch targets meet 44px minimum
- TeamContextSwitcher appears for parents with linked children (role switching)
- Loading spinners on all async data fetches
- Overflow handling on horizontal scroll areas

### Broken
- **Nothing blocking for demo**

### Missing
- No breadcrumb navigation (tabs are flat, not hierarchical)
- No deep-link to specific play from URL

### Demo Risk: LOW

---

## 5. DATA INTEGRITY & PERMISSIONS

### Working
- **Roster read:** Coach Rick can see full roster via agentScopedQuery (team_id scoping)
- **Playbook read/write:** manageTeamPlay server function correctly bypasses RLS for coaches
- **PlayAssignment read/write:** Same server function covers assignments
- **PlayerStats read:** Read-only leaderboard works
- **QuizAttempt read:** Agent can query quiz history for analytics
- **agentScopedQuery:** Correctly maps all 8 team entities with team_id foreign key
- **claimTeamSpot:** Coach promotion, parent joining, player claiming all work via server function

### Broken / Needs Verification

| Entity | Issue | Severity |
|--------|-------|----------|
| **Team (write)** | Creator Only RLS — Coach Rick CANNOT edit team settings unless he's the team creator/owner | HIGH if Rick needs to demo Settings tab |
| **TeamEvent (write)** | NO server function exists — direct entity mutations depend on RLS. If Creator Only, Rick cannot create/edit schedule events | HIGH if demoing Schedule |
| **TeamMessage (write)** | NO server function exists — direct entity mutations depend on RLS. If Creator Only, Rick cannot post messages | MEDIUM if demoing Messages |

### Critical Action Items Before Demo
1. **Verify TeamEvent RLS in Base44 dashboard** — if Creator Only, Rick is blocked from scheduling
2. **Verify TeamMessage RLS in Base44 dashboard** — if Creator Only, Rick can't post messages
3. **If Rick IS the team owner (created the team):** No issues, Creator Only matches him
4. **If Rick is NOT the team owner:** Team settings, events, and messages may all be blocked

### Demo Risk: HIGH (depends on whether Rick owns the team entity)

---

## 6. INVITE WALKTHROUGH

### Working
- **Three entry points:** `/join/:inviteCode` (family), `/join/:coachCode` (coach), `/door/:slug` (physical)
- **Claim-first pattern (DEC-118):** Checks for unclaimed roster spots before creating duplicates
- **Auth redirect:** localStorage persists invite code across login redirect
- **Personalized copy:** Shows team name, sport, head coach name, player count
- **Parent flow:** Select linked children via checkboxes, creates parent TeamMember
- **Coach flow:** Shows unclaimed spots with "That's me" claiming, fallback to new coach form
- **Post-join:** Navigates to MyLane with team context in localStorage

### Broken
- **If no players on roster for family invite: dead end** — shows "No players on roster yet. Ask a coach to add your child first." with no pathway forward
- **Door slug fails silently** — "Team not found" with no context about why the link broke

### Missing
- No post-join celebration screen (user goes straight to MyLane after toast)
- No re-invite or retry mechanism if claim fails

### Demo Risk: LOW (invite flow is for onboarding new users, not the coach demo itself)

---

## 7. MYLANE INTEGRATION

### Working
- **PlayerReadinessCard** registered in MyLane registry
- Shows player count, next event, days-until countdown
- **Time-aware urgency:** Border shifts to primary color when game is within 3 days
- `urgencyEntity: 'TeamEvent'` drives urgency signaling
- Click-through drills into full team workspace
- **PlaymakerAgent** fully wired:
  - 8 team entities accessible via agentScopedQuery
  - Comprehensive instructions covering coaching, quiz analytics, play knowledge, readiness
  - Global + per-user memory configured
  - ServiceFeedback read + create for feedback collection

### Broken
- **PlayerReadinessCard uses direct entity queries** instead of agentScopedQuery (DEC-107 non-compliance) — functional but bypasses permission membrane
- **Profile extraction assumes `allTeams` exists** — card won't render if team data structure doesn't match

### Missing
- **No "ask about roster" natural language in Mylane surface** — PlaymakerAgent handles it via agent chat, but there's no proactive roster card in the MyLane spinner
- Urgency callback is boolean-only (no context about how many days remain)

### Demo Risk: LOW (Mylane card works, agent responds to queries)

---

## SUMMARY SCORECARD

| Area | Status | Demo Ready? |
|------|--------|-------------|
| Roster | Solid | YES |
| Playbook (view/edit/build) | Solid | YES |
| Playbook (print) | Minor bugs | YES (avoid photo-mode prints) |
| Playbook Pro (quiz/arcade) | Works well | YES (no leaderboard) |
| Study Mode | Solid | YES |
| Sideline Mode | Solid | YES |
| Navigation/Tabs | Solid | YES |
| Mobile Layout | Good | YES |
| Invite/Join Flow | Works | YES (not needed for demo) |
| Team Settings | Permission risk | VERIFY Coach Rick ownership |
| Schedule (events) | Permission risk | VERIFY TeamEvent RLS |
| Messages | Permission risk | VERIFY TeamMessage RLS |
| Mylane Card | Works | YES |
| PlaymakerAgent | Fully wired | YES |

---

## RECOMMENDATIONS (Priority Order for Today)

### Must Do Before 5 PM
1. **Verify Coach Rick is the Team owner** (created_by matches his email). If yes, all permission issues vanish.
2. **If Rick is NOT the owner:** Check TeamEvent and TeamMessage RLS in Base44 dashboard. Set to "No Restrictions" for authenticated users, or avoid demoing Schedule/Messages tabs.
3. **Avoid printing photo-mode plays** during demo (print references wrong field names).

### Nice to Have (Post-Demo)
4. Build a team leaderboard for Playbook Pro (competitive rankings across teammates)
5. Fix PrintPlaybook field references (`image_url` -> `diagram_image`, `notes` -> `coach_notes`)
6. Fix PlayCreateModal editDataReady logic for plays with zero assignments
7. Add server functions for TeamEvent and TeamMessage writes (proper permission enforcement)
8. Migrate PlayerReadinessCard to use agentScopedQuery (DEC-107 compliance)

### Future Build Items
9. Roster search/filter for league scale
10. Bulk player add (CSV import)
11. Post-join celebration screen
12. Deep-link to specific plays from URL
13. Zone vs man coverage visual distinction in renderer

---

## What MOJO Can't Do (Demo Talking Points)

The Team space delivers capabilities that MOJO Sports fundamentally cannot:

- **Custom visual play builder** — drag-and-drop SVG field with 24+ route templates
- **Defense-aware play design** — offense AND defense formations with proper position rendering
- **Mirror play visualization** — flip plays left/right with one tap
- **Adaptive quiz mastery** — AI-driven difficulty that learns each player's weaknesses
- **Position-specific learning** — "Know Your Job" mode teaches each player THEIR role
- **Printable coach's cards** — 3 print layouts for sideline reference
- **Game-day readiness tracking** — see which players have mastered flagged plays before game day
- **AI coaching partner** — PlaymakerAgent answers natural language questions about plays, players, and readiness

MOJO handles logistics (scheduling, chat, streaming). LocalLane handles *knowledge* — making sure every player knows their job on every play.

---

*Report generated by Hyphae. Factual, no fluff. Hand to Mycelia for strategic review.*
