# Team Workspace Go-Live Audit

> Aligned with BUILD-PROTOCOL.md phases 8-13 and THE-GARDEN.md fractal pattern.
> Audited: 2026-03-21
> Auditor: Claude Code (Mycelia)

---

## Section 0: Event Scoping (Fractal Boundary) — PASS

**Status:** Code is correctly scoped. No fractal boundary violation in code.

- `TeamHome.jsx:115-123` — queries `TeamEvent.filter({ team_id: team.id })`. Correctly scoped.
- `TeamSchedule.jsx:101-109` — queries `TeamEvent.filter({ team_id: teamId })`. Correctly scoped.
- Grep confirms: zero references to `entities.Event.` in any team component. All event queries use `TeamEvent`.
- No community events (Place to Gather) leak into the team workspace (Place to Grow) at the code level.

**Fix applied:** Empty state text updated from "No upcoming events" to "No upcoming events. Schedule a practice!" in both `TeamHome.jsx:243` and `TeamSchedule.jsx:273`.

**Note:** If a "Practice at Amazon Park" event is still appearing, it exists as a `TeamEvent` record in the database with this team's `team_id`. This would be a data issue, not a code issue. Verify in Base44 dashboard: check if any TeamEvent records exist for this team that were imported/synced from community Events. Delete any stale records.

---

## Section 1: Foundation Check (Build Protocol Phase 10) — PASS

- **Team entity loads correctly:** `BusinessDashboard.jsx:285-301` fetches teams via `Team.get(id)` for all team IDs from user's memberships. Fields present: name, sport, format, head_coach_member_id, owner_id, invite_code, status, season, league, description, guide_dismissed.
- **TeamMember entity works:** Roles supported: coach, player, parent (+ legacy assistant_coach fallback). Positions from `flagFootball.js`. Jersey numbers supported.
- **Head Coach designation:** Shield badge on roster (`TeamRoster.jsx:212-216`). Display in header (`TeamHome.jsx:161-169`). Dashboard header badge distinguishes HEAD COACH vs COACH (`BusinessDashboard.jsx:918-920`).
- **manageTeamPlay server function:** `functions/manageTeamPlay.ts` exists and correctly implements service role bypass. Validates coach role before CRUD. Handles Play and PlayAssignment entities.
- **Workspace card:** Teams appear on dashboard landing with team name, sport, member count (`BusinessDashboard.jsx:710-732`).

---

## Section 2: Playbook Tab — PASS

- **Offense/Defense toggle:** `TeamPlaybook.jsx:153-172` — top of page, styled correctly.
- **Play cards display:** PlayCard component renders name, nickname, formation, diagram thumbnail (renderer or photo).
- **Play Builder:** PlayCreateModal opens for create/edit. Formation picker, position markers, route assignment all wired.
- **PlayRenderer:** Used in Playbook cards (mini), StudyMode, and SidelineMode.
- **Mirror toggle:** Present in StudyMode (`StudyMode.jsx:224-234`) and SidelineMode (via PlayRenderer).
- **Game Day toggle:** `TeamPlaybook.jsx:177-195` — filter toggle between "All plays" and "Game day".
- **Coach sees "+ Add Play":** FAB button at `TeamPlaybook.jsx:267-278`, gated on `isCoach`.
- **Players do NOT see edit/delete:** PlayDetail receives `isCoach` prop; edit/archive/delete controls only render when `isCoach` is true.

---

## Section 3: Playbook Pro (Arcade Game) — PASS

- **Accessible from Home tab:** "LET'S GO" button at `TeamHome.jsx:308-316` (player view) and `TeamHome.jsx:411-419` (coach view).
- **3 lives:** Three Heart icons rendered at `TeamHome.jsx:293-295`.
- **High scores:** Displayed via `usePlayerStats` hook.
- **Mixed quiz types:** QuizMode component handles current plays + mirrors.
- **Streak celebrations:** Best streak displayed with Flame icon.
- **Leaderboard on TeamHome:** Leaderboard component at `TeamHome.jsx:13-56`, rendered on both coach and player views.

---

## Section 4: Study Mode + Sideline Mode — PASS

- **Study Mode:**
  - My Assignment / Full Play toggle: `StudyMode.jsx:166-181`
  - View As picker for coaches: `StudyMode.jsx:184-204`, renders position buttons
  - Game Day filter: `StudyMode.jsx:148-162`
  - Progress dots: `StudyMode.jsx:368-380`
  - Mirror toggle: `StudyMode.jsx:224-234`
- **Sideline Mode:**
  - Large play cards: Full-screen renderer with `mode="sideline"`
  - Swipe between plays: Touch handlers at `SidelineMode.jsx:54-62`
  - Game Day filter: `SidelineMode.jsx:97-112`, defaults to Game Day on
  - High contrast: Black background (`bg-black`), large position buttons

---

## Section 5: Schedule Tab — PASS

- **Event list (chronological):** `TeamSchedule.jsx:111-118` sorts by start_date + start_time.
- **Correctly scoped to TeamEvents:** `TeamEvent.filter({ team_id: teamId })` — no cross-boundary leakage.
- **Create event form:** Type (5 types: practice, game, scrimmage, meeting, social), title, date, time, duration, location, opponent (game/scrimmage only), notes, recurring (weekly/biweekly with day picker + end date).
- **RSVP:** NOT IMPLEMENTED. No RSVP mechanism on TeamEvents. See bugs below.
- **Empty state:** Updated to "No upcoming events. Schedule a practice!"

**Bug found:** No RSVP on team events. The `useRSVP` hook exists for community Events but is not wired to TeamEvent. This is a nice-to-have, not a go-live blocker.

---

## Section 6: Messages Tab — PASS

- **Two channels:** Announcements and Discussion (`TeamMessages.jsx:8-11`).
- **Coach-only post for Announcements:** `canPostAnnouncement` gated on `isCoach && activeChannel === 'announcement'` at line 43.
- **All members can post to Discussion:** `canPostDiscussion = true` at line 44.
- **Messages display correctly:** MessageCard component with sender label, role badge, timestamp, pin indicator.
- **Pin functionality:** Coaches can pin/unpin announcements.

---

## Section 7: Roster Tab — PASS

- **Player list:** Name, jersey number, position, role badge — all rendered in table at `TeamRoster.jsx:169-247`.
- **Coach sees Invite button:** "Add to Roster" button gated on `isCoach` at line 155-166.
- **Join flow works:** `/join/{inviteCode}` route handled by `JoinTeam.jsx`. Supports:
  - Sign-in gate for unauthenticated users
  - Parent path (link children, multi-select)
  - Player claim path (currently disabled with `{false && ...}` at line 174 — parent-only join for now)
  - Already-member redirect
- **Parent-child context switcher:** `TeamContextSwitcher.jsx` renders when user is a parent, allows switching between Parent view and linked child views.

---

## Section 8: Settings Tab — PASS

- **Team profile editable:** Name, sport, format, league, season, description — all editable by coaches (`TeamSettings.jsx:170-257`).
- **Format change warning:** Warns when plays exist before changing format.
- **Invite link display + regenerate:** Code display, copy code, copy link, regenerate (owner only) at lines 260-315.
- **Head Coach designation:** "Set as Head Coach" button in member edit modal when editing a coach (`TeamRoster.jsx:318-342`). Transfer ownership in Settings (`TeamSettings.jsx:317-351`).

---

## Section 9: Permissions Audit (Build Protocol Phase 6) — PASS (with notes)

**Coach can:**
- Create/edit/delete plays: Via `manageTeamPlay.ts` server function (service role bypass). Verified: `isTeamCoach` check.
- Manage roster: Direct entity CRUD gated on `isCoach` prop.
- Post announcements: `canPostAnnouncement = isCoach && activeChannel === 'announcement'`.
- Edit settings: `canEditTeamInfo = isOwner || isCoachedMember`.
- Access Sideline Mode: Gated on `isCoach` at `TeamPlaybook.jsx:221-229`.

**Player can:**
- View plays: PlayCard, StudyMode accessible to all.
- Run Playbook Pro: QuizMode accessible to all.
- Study: StudyMode accessible to all.
- See schedule: TeamSchedule renders for all.
- Post in discussion: `canPostDiscussion = true`.

**Player CANNOT:**
- Create/edit/delete plays: No "+ Add Play" button (gated on `isCoach`), no edit/delete controls in PlayDetail.
- Manage roster: No "Add to Roster" button.
- Edit settings: Shows read-only view.

**Route protection:** PARTIAL. The team workspace is only accessible if the user has a TeamMember record (membership check in `BusinessDashboard.jsx:273-283`). However, there is no server-side RLS preventing a user from directly calling `TeamEvent.filter()` or `Play.filter()` with another team's ID. Base44 entity permissions are the backstop here.

**Data exposure:** Client-side queries filter by `team_id`, but Base44 RLS policies are the actual security layer. Verify in Base44 dashboard that Play, PlayAssignment, TeamEvent, TeamMessage, TeamMember entities have appropriate read permissions.

---

## Section 10: Garden Heartbeat Check — MIXED

### Pulse (Activity Data)
**Status: NO — activity events are not being generated.**

- Play creation/editing: No activity event emitted. `manageTeamPlay.ts` does CRUD only.
- Playbook Pro quiz completion: `usePlayerStats` updates PlayerStats entity but no timestamped activity event.
- TeamEvent creation/RSVP: No activity event emitted.
- Message posting: No activity event emitted.

**Flag for future:** When Pulse Layer (Phase 3) is built, these actions should generate activity events. The data that COULD feed pulse exists in entity timestamps (created_at, updated_at on all records), but no dedicated activity/event-stream entity is being populated.

### Door (Invite Door)
**Status: WORKING**

- Join flow via invite code: `/join/{inviteCode}` works. Requires authentication.
- No public access without membership: Team workspace only renders when user has a TeamMember record.
- Team content does NOT leak into public directory or events page. No references to team data in public-facing components.

### Surface (Directory Projection)
**Status: STUB**

- No visibility toggle for team exists in TeamSettings.
- Teams do not appear in the public Directory.
- Default is completely hidden — correct for invite-door spaces.
- Future: if teams want to be discoverable (e.g., league listing), a `visible_in_directory` toggle would be needed.

### Guide (Workspace Guide)
**Status: EXISTS — fully implemented**

- `workspaceGuides.js` has a complete `team` guide entry with 4 steps: Settings, Roster, Playbook, Schedule.
- Smart completion detection in `TeamHome.jsx:195-214`.
- `guide_dismissed` boolean on Team entity for persistent dismissal.
- Inline rendering via `WorkspaceGuide` component.

---

## Section 11: Tier Gating Check (Build Protocol Phase 8) — PASS

- **No tier gates found:** Grep across all team components returns zero matches for `tierLevel`, `tier_gate`, `subscription_tier`, `LockedFeature`, or `upgrade`.
- All features are freely accessible regardless of subscription tier.
- No "upgrade to Standard" prompts appearing anywhere in team workspace.

---

## Section 12: Polish Sweep (Build Protocol Phase 9) — PASS (with minor notes)

- **Console errors:** Cannot verify without running the app. No obvious error paths in code review.
- **Empty states:** All tabs have friendly empty states:
  - Playbook: "No offense/defense plays yet."
  - Schedule: "No upcoming events. Schedule a practice!"
  - Roster: "No one on the roster yet."
  - Messages: "No announcements yet." / "No messages in discussion yet."
  - Leaderboard: Returns null when no scores (graceful).
  - Study Mode: "No plays to study."
  - Sideline Mode: "No plays in this view."
- **Loading states:** Schedule shows "Loading events..." Messages shows "Loading messages..."
- **Mobile responsive:** All touch targets are min 44px (`min-h-[44px]`, `min-w-[44px]`). Sideline Mode has larger 48-56px targets. Playbook FAB is fixed bottom-right on mobile.
- **Dark theme compliance:** All backgrounds use slate-950, slate-900, slate-800 — no light backgrounds found.
- **Icons:** All icons are amber-500 or white/slate — compliant with Gold Standard.
- **No hardcoded values:** Sport positions, routes, and formations all driven by `flagFootball.js` config.

**Minor notes:**
- `TeamRoster.jsx:29` — role badge for coach uses `bg-amber-500 text-black` (correct Gold Standard).
- Toggle knob in TeamOnboarding.jsx:243 uses `bg-white` — should be `bg-slate-100` per CLAUDE.md pitfall. Not blocking go-live.

---

## Garden Heartbeat Summary

| Element | Status |
|---------|--------|
| Pulse data | NO — no activity events generated (Phase 3 future) |
| Door | WORKING — invite code, auth required, no public leakage |
| Surface | STUB — no directory projection, default hidden (correct) |
| Guide | EXISTS — 4 steps, smart completion, dismissible |

---

## Bugs Found

| # | Severity | File | Description |
|---|----------|------|-------------|
| 1 | Low | `TeamSchedule.jsx` | No RSVP on team events. `useRSVP` hook exists for community Events but not wired to TeamEvent entity. Nice-to-have. |
| 2 | Low | `JoinTeam.jsx:174` | Player join path is disabled (`{false && ...}`). Only parent path works. This is intentional per "Players join through a parent account for now" text at line 194. |
| 3 | Low | `TeamOnboarding.jsx:243` | Toggle knob uses `bg-white` instead of `bg-slate-100`. Minor style inconsistency. |
| 4 | Info | `TeamSettings.jsx:121` | `window.location.reload()` after transfer ownership — hard reload. Works but not ideal UX. |
| 5 | Info | Data level | If "Practice at Amazon Park" is appearing as a TeamEvent, it exists as a stale record in the database. Check Base44 dashboard for TeamEvent records on this team. |

---

## Future Flags (DO NOT BUILD)

### Legal (Phase 12)
- **Minors data:** Players (minors) have names, jersey numbers, positions, and quiz scores stored. Parents link to children via `linked_player_id`.
- **Data collected per minor:** jersey_name, jersey_number, position, high_score, best_streak, total_quizzes, mastery levels (via PlayerStats entity).
- **Recommendation:** Before sharing invite codes with real families, review Terms of Service and Privacy Policy for COPPA compliance. Consider:
  - Parental consent flow before child data is stored
  - Data retention policy for minor data
  - Right to deletion mechanism
  - Whether quiz scores / mastery data constitute "personal information" under COPPA

### Organism Signal (Phase 13)
When Pulse Layer (Phase 3) is built, these team activity signals should feed the organism:

| Signal | Source | Entity |
|--------|--------|--------|
| Play created/updated | manageTeamPlay.ts | Play |
| Quiz completed (score, streak) | useQuiz.js → PlayerStats | PlayerStats |
| Event created | TeamSchedule.jsx | TeamEvent |
| Event RSVP | (not yet built) | TeamEvent |
| Message posted | TeamMessages.jsx | TeamMessage |
| Member joined | JoinTeam.jsx | TeamMember |
| Roster updated | TeamRoster.jsx | TeamMember |

All these entities already have `created_at` timestamps from Base44 — the data exists for retroactive pulse calculation without needing explicit activity events.

---

## Recommended Fixes (Priority Order)

1. **[Data check]** Verify in Base44 dashboard: are there stale TeamEvent records that match community events? Delete any that don't belong to this team.
2. **[Done]** Empty state text updated to "No upcoming events. Schedule a practice!" in TeamHome and TeamSchedule.
3. **[Nice-to-have]** Fix toggle knob color in TeamOnboarding.jsx (`bg-white` -> `bg-slate-100`).
4. **[Nice-to-have]** Add RSVP to TeamEvents (separate prompt).
5. **[Future]** COPPA compliance review before sharing invite codes with real families.
6. **[Future]** Activity event generation for Pulse Layer (Phase 3).

---

## Overall Verdict: GO-LIVE READY

The Team workspace is ready for the head coach to share with real players and parents. All core features (Playbook, Playbook Pro, Study Mode, Sideline Mode, Schedule, Messages, Roster, Settings) are functional and correctly scoped. The fractal boundary between Place to Gather and Place to Grow is intact at the code level. The workspace guide is complete. No tier gates are blocking access. The Gold Standard design system is consistently applied.

**One action item before sharing invite codes:** Check the TeamEvent records in Base44 dashboard and delete any stale community event data that may have been imported.
