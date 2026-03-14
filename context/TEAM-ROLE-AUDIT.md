# TEAM-ROLE-AUDIT.md

> Read-only audit of role-based access in the Team workspace.
> Determines what each role can see and do, identifies risks, and recommends fixes.
> Audited: 2026-03-14

---

## Roles

| Role | How assigned | Description |
|------|-------------|-------------|
| `coach` | Created automatically when owner creates team via TeamOnboarding | Team owner / head coach |
| `assistant_coach` | Manually added by coach via TeamRoster | Co-coach with some edit powers |
| `player` | Pre-added to roster by coach (unclaimed), then claimed via `/join/:inviteCode` | Team player |
| `parent` | Self-created via `/join/:inviteCode`, linked to a player | Parent / guardian |

---

## How Users Join a Team

**File:** `src/pages/JoinTeam.jsx`

1. Coach creates team via TeamOnboarding. Team gets `invite_code` (6-char alphanumeric) and coach gets auto-created TeamMember with `role: 'coach'`.
2. Coach manually adds roster members (players) via TeamRoster. These are "unclaimed" (`user_id: null`).
3. Coach shares invite link: `locallane.app/join/{code}`.
4. Users visit link:
   - **Player path:** User claims an existing unclaimed TeamMember by updating `user_id`.
   - **Parent path:** User creates a NEW TeamMember with `role: 'parent'` and `linked_player_id`.
5. After joining, user sees the team in their BusinessDashboard workspace list.

**Note:** The Player join path is currently disabled in JoinTeam.jsx UI (line 174: `false &&`). Only the Parent path is active. Players must be pre-added by the coach and claimed.

---

## How the Current User's Role Is Resolved

**File:** `src/pages/BusinessDashboard.jsx` (lines 250-260)

```javascript
const currentTeamMember = teamMembers.find(m => m.user_id === currentUser?.id);
const effectiveRole = viewingAsMember ? viewingAsMember.role : currentTeamMember?.role;
```

- Looks up the user's TeamMember record by `user_id`
- If parent is "viewing as" a child (via TeamContextSwitcher), the child's role ('player') becomes the `effectiveRole`
- Otherwise, the user's own role is used

---

## BUG-01: `isCoach` Derivation Inconsistency (P0)

**The most critical finding in this audit.**

The `teamScope` object (line 738) defines:
```javascript
isCoach: selectedTeam.owner_id === currentUser?.id
```

This means `scope.isCoach` is **owner-only** — assistant coaches get `isCoach: false`.

But three components derive their own `isCoach` from `effectiveRole`:

| Component | How it gets `isCoach` | Includes assistant_coach? |
|-----------|----------------------|--------------------------|
| TeamPlaybook | `scope.isCoach` (via getProps) | **NO** — owner only |
| TeamRoster | `scope.isCoach` (via getProps) | **NO** — owner only |
| TeamHome | `effectiveRole === 'coach' \|\| effectiveRole === 'assistant_coach'` | YES |
| TeamSchedule | `teamScope?.effectiveRole === 'coach' \|\| teamScope?.effectiveRole === 'assistant_coach'` | YES |
| TeamMessages | `teamScope?.effectiveRole === 'coach' \|\| teamScope?.effectiveRole === 'assistant_coach'` | YES |
| TeamSettings | Uses own `isOwner \|\| isAssistantCoach` logic | YES (partially) |

**Impact:** Assistant coaches CANNOT:
- Create, edit, or archive plays (Playbook tab)
- See the Sideline Mode button (Playbook tab)
- Add, edit, or delete roster members (Roster tab)
- Set a head coach (Roster tab)

But assistant coaches CAN:
- Create/edit/delete schedule events (Schedule tab)
- Post announcements and pin messages (Messages tab)
- Edit team settings (Settings tab)
- See coach actions on Home tab

**Fix:** Change line 738 in BusinessDashboard.jsx:
```javascript
// BEFORE:
isCoach: selectedTeam.owner_id === currentUser?.id,
// AFTER:
isCoach: effectiveRole === 'coach' || effectiveRole === 'assistant_coach',
```

---

## Tab-by-Tab Audit

### Home Tab (`TeamHome.jsx`)

| Feature | Coach | Assistant Coach | Player | Parent |
|---------|-------|-----------------|--------|--------|
| View team stats | Yes | Yes | Yes | Yes |
| View leaderboard | Yes | Yes | Yes | Yes |
| Playbook Pro card / quiz launch | Yes | Yes | Yes | Yes |
| "Add Player" button | Yes | Yes | No | No |
| "Share Invite Code" button | Yes | Yes | No | No |
| Head coach display | Yes | Yes | Yes | Yes |
| Player view (when parent switches) | N/A | N/A | Full player view | Via context switcher |

**Notes:**
- Home derives `isCoach` from `effectiveRole`, so assistant coaches correctly see coach actions.
- When a parent switches to a child's view via TeamContextSwitcher, the child's player view renders.

### Playbook Tab (`TeamPlaybook.jsx`)

| Feature | Coach | Assistant Coach | Player | Parent |
|---------|-------|-----------------|--------|--------|
| View plays | Yes | Yes | Yes | Yes |
| Create play (FAB + modal) | Yes | **NO (BUG-01)** | No | No |
| Edit play | Yes | **NO (BUG-01)** | No | No |
| Archive play | Yes | **NO (BUG-01)** | No | No |
| Delete play | Yes | **NO (BUG-01)** | No | No |
| Launch Sideline Mode | Yes | **NO (BUG-01)** | No | No |
| Launch Study Mode | Yes | Yes | Yes | Yes |
| Launch Quiz Mode | Yes | Yes | Yes | Yes |
| View coach notes in PlayDetail | Yes | **NO (BUG-01)** | No | No |
| Study "View as" position picker | Yes | **NO (BUG-01)** | No | No |

**Notes:**
- All `isCoach` gating in this tab comes from `scope.isCoach` which is owner-only.
- Players and parents can view all plays, study them, and take quizzes — this is correct.
- PlayBuilder and PlayCreateModal have NO internal role checks. Gating is entirely at the TeamPlaybook level.

### Schedule Tab (`TeamSchedule.jsx`)

| Feature | Coach | Assistant Coach | Player | Parent |
|---------|-------|-----------------|--------|--------|
| View events | Yes | Yes | Yes | Yes |
| Create event | Yes | Yes | No | No |
| Edit event | Yes | Yes | No | No |
| Delete event | Yes | Yes | No | No |

**Notes:** Correctly derives `isCoach` from `teamScope.effectiveRole`. No bugs.

### Roster Tab (`TeamRoster.jsx`)

| Feature | Coach | Assistant Coach | Player | Parent |
|---------|-------|-----------------|--------|--------|
| View roster | Yes | Yes | Yes | Yes |
| Add to roster | Yes | **NO (BUG-01)** | No | No |
| Edit member | Yes | **NO (BUG-01)** | No | No |
| Delete member | Yes | **NO (BUG-01)** | No | No |
| Set Head Coach | Yes | **NO (BUG-01)** | No | No |

**Notes:** `isCoach` comes from `scope.isCoach` — owner-only.

### Messages Tab (`TeamMessages.jsx`)

| Feature | Coach | Assistant Coach | Player | Parent |
|---------|-------|-----------------|--------|--------|
| View messages | Yes | Yes | Yes | Yes |
| Post in Announcements | Yes | Yes | No | No |
| Post in Discussions | Yes | Yes | Yes | Yes |
| Pin/unpin messages | Yes | Yes | No | No |

**Notes:** Correctly derives `isCoach` from `teamScope.effectiveRole`. No bugs. Players/parents can participate in discussions but not announcements.

### Settings Tab (`TeamSettings.jsx`)

| Feature | Coach | Assistant Coach | Player | Parent |
|---------|-------|-----------------|--------|--------|
| Edit team info | Yes | Yes | No | No |
| View invite code | Yes | Yes | Yes (read-only) | Yes (read-only) |
| Regenerate invite code | Yes (owner) | No | No | No |
| Transfer head coach | Yes (owner) | No | No | No |
| Archive team | Yes (owner) | No | No | No |

**Notes:** Settings uses its own `canEditTeamInfo = isOwner || isAssistantCoach` pattern, bypassing the broken `scope.isCoach`. Owner-only actions (regenerate, transfer, archive) are separately gated with `isOwner`. This tab works correctly.

---

## Tab Visibility

**All 6 tabs are visible to all roles.** There is no tab-level gating — every user (coach, assistant_coach, player, parent) sees Home, Playbook, Schedule, Roster, Messages, Settings in the tab bar.

**Risk assessment:** Low risk. Players and parents should see all tabs. The content within each tab is appropriately gated (with the exception of BUG-01). Even Settings is safe — non-coaches see a read-only view.

---

## Parent-Child Context Switcher

**File:** `src/components/team/TeamContextSwitcher.jsx`

- Only renders if `isParent` is true (line 808 in BusinessDashboard)
- Lets parents toggle between their own view and a linked child's player view
- When viewing as a child:
  - `effectiveRole` becomes `'player'`
  - `viewingAsMember` is the child's TeamMember record
  - TeamHome renders the player/child view with Playbook Pro card
  - `isCoach` in TeamPlaybook/Roster stays false (correct — parent is not a coach)
- When viewing as self (Parent):
  - `effectiveRole` is `'parent'`
  - Standard parent view

**No role escalation risk.** The switcher can only switch to linked children's records. It cannot switch to a coach record.

---

## PlayBuilder / PlayCreateModal Internal Checks

**File:** `src/components/team/PlayBuilder.jsx`

- **No role checks whatsoever.** The component saves plays directly via Base44 SDK.
- Access is gated at the parent level: TeamPlaybook only shows the Create/Edit modal if `isCoach`.
- If a non-coach could somehow open PlayCreateModal (e.g., via direct URL manipulation or browser devtools), they could create plays.

**File:** `src/components/team/PlayCreateModal.jsx`

- Same pattern. No internal role checks. Relies entirely on being shown/hidden by parent component.

---

## StudyMode / QuizMode / SidelineMode

| Component | Receives `isCoach`? | Uses it for? | Accessible to players? |
|-----------|-------------------|-------------|----------------------|
| StudyMode | Yes | "View as" position picker (coach only), coach notes display | Yes (via TeamPlaybook) |
| QuizMode | Yes (but unused) | Not used | Yes (via TeamPlaybook + TeamHome) |
| SidelineMode | No | N/A — no role checks inside | **Only if `isCoach`** in TeamPlaybook — so only owner (BUG-01) |

**Note:** StudyMode's "View as" position picker lets coaches preview any position's assignment. Players see only their own position (from `playerPosition` prop). This is correct behavior even though the `isCoach` value is wrong for assistant coaches.

---

## Entity-Level Security (Base44 RLS)

**All role gating is front-end only.** There are no visible server-side role checks in any team component. The mutations call:

- `base44.entities.Play.create/update/delete` — no role validation
- `base44.entities.PlayAssignment.create/update/delete` — no role validation
- `base44.entities.TeamMember.create/update/delete` — no role validation
- `base44.entities.TeamEvent.create/update/delete` — no role validation
- `base44.entities.TeamMessage.create/update` — no role validation
- `base44.entities.Team.update` — no role validation

Base44 RLS policies may exist on some entities (CLAUDE.md notes 13/18+ entities have RLS), but whether Team, Play, PlayAssignment, TeamMember, TeamEvent, and TeamMessage entities have appropriate RLS is unknown from this codebase audit. The entity definitions live in the Base44 dashboard, not in this repo.

---

## Risk Summary

### What a Player Can Currently Do That They Shouldn't

| Risk | Severity | Notes |
|------|----------|-------|
| **View coach notes** in StudyMode/PlayDetail | Low | Only visible to `isCoach` users — currently working correctly for players (they don't see them). But coach notes are visible to anyone who can open PlayDetail with `isCoach: true`. |
| **Post in discussions** | None | This is intended behavior. |
| **Access all 6 tabs** | None | All tabs show appropriate read-only views for non-coaches. |
| **Bypass UI gating via devtools** to create/edit/delete plays, roster members, events | Medium | Front-end only gating. A technical user could invoke mutations directly. Mitigated by: target audience is youth sports parents, not hackers. |

### What an Assistant Coach Cannot Do That They Should

| Missing Capability | Impact | Root Cause |
|-------------------|--------|------------|
| Create/edit/archive plays | High — assistant coaches can't help build playbook | BUG-01 |
| Manage roster (add/edit/delete members) | High — assistant coaches can't help manage team | BUG-01 |
| Launch Sideline Mode | Medium — can't run sideline display on game day | BUG-01 |
| View coach notes in PlayDetail/StudyMode | Low — can't see strategy notes | BUG-01 |

---

## Recommendations

### P0 — Fix Before Sharing With Players

**1. Fix `isCoach` in teamScope (BUG-01)**

One-line fix in `src/pages/BusinessDashboard.jsx` line 738:
```javascript
// BEFORE:
isCoach: selectedTeam.owner_id === currentUser?.id,
// AFTER:
isCoach: effectiveRole === 'coach' || effectiveRole === 'assistant_coach',
```

This single change fixes all assistant coach access issues across Playbook and Roster tabs.

### P1 — Should Fix Soon

**2. Consider hiding Settings tab for players/parents**

Settings shows a read-only view for non-coaches, which is harmless but clutters the UI. Alternatively, keep it visible — players/parents can see the invite code there, which is useful.

**Recommendation:** Keep visible. No change needed.

**3. Verify Base44 RLS policies exist for team entities**

In the Base44 dashboard, verify that:
- `Play`, `PlayAssignment` — write access requires team membership with coach/assistant_coach role
- `TeamMember` — write access requires coach/assistant_coach role on the team
- `TeamEvent` — write access requires coach/assistant_coach role
- `TeamMessage` — create requires team membership; pin requires coach/assistant_coach role
- `Team` — update requires owner_id match

This cannot be verified from the codebase — must be checked in the Base44 dashboard.

### P2 — Nice to Have

**4. Add owner-only gating for destructive roster actions**

Currently, if BUG-01 is fixed, assistant coaches will be able to delete roster members (including the head coach). Consider restricting delete to owner-only, or at minimum preventing deletion of the owner's own record.

**5. SidelineMode access for players**

Players cannot currently launch Sideline Mode (it's coach-only). This is intentional for now, but players might benefit from a read-only sideline view during games. Low priority.

---

*This audit is read-only. No code was modified. All findings are based on source code analysis.*
