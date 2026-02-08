# Punch Pass → Joy Coins Language Audit

> Generated: 2026-02-07
> Scope: Entire `community-node` repository
> Status: READ-ONLY AUDIT — no files modified

---

## Summary

- **Total files with "punch" matches: 17** (excluding `claude.md` which is documentation)
- **Total "punch"-related instances: ~130**
- **Priority 1 (user-facing text): 28 instances across 8 files**
- **Priority 2 (variable/function names): 42 instances across 8 files**
- **Priority 3 (entity/database references): 48 instances across 7 files**
- **Priority 4 (dead code / deletable): 2 files to delete, 2 functions to migrate, 2 routes to remove**

### Additional Findings
- **"stored value" / "prepaid"**: 3 instances in legal text (Terms.jsx, Support.jsx) — legal risk terms that need attorney review
- **"token" / "tokens"**: All instances are auth-related (JWT tokens) — **no action needed**
- **"credit" / "credits"**: All instances are CreditCard icon imports or legal disclaimers — **no action needed**
- **"ticket" / "tickets"**: All instances refer to event ticket types (multi-ticket pricing) — **no action needed, not Joy Coin synonyms**

### Partially Migrated Files
The codebase is in a **split state**: the Joy Coins system (`useJoyCoins.js`, `JoyCoinsCard.jsx`, `JoyCoinsHistory.jsx`, `JoyCoinsTransfer.jsx`, `JoyCoinsAdminPanel.jsx`, `AccessWindowManager.jsx`, etc.) is fully built out alongside the legacy Punch Pass system. Both systems coexist — events can have `punch_pass_accepted` AND `joy_coin_enabled` fields. The following files reference BOTH systems:
- `src/components/events/EventCard.jsx` (has Joy Coin badge AND Punch badge)
- `src/components/events/EventDetailModal.jsx` (has Joy Coin section AND Punch section)
- `src/components/dashboard/EventEditor.jsx` (uses `canUsePunchPass` AND Joy Coin fields)

---

## Priority 1 — User-Facing Text

These are strings visible to end users in the UI. Highest urgency.

### FILE: src/Layout.jsx
```
LINE 149-152: Navigation dropdown link — "Punch Pass" label + route to PunchPass page
  REPLACE WITH: "Joy Coins" linking to JoyCoinsHistory page (or "Community Pass")

LINE 248-251: Mobile sheet navigation — "Punch Pass" label + route to PunchPass page
  REPLACE WITH: "Joy Coins" linking to JoyCoinsHistory page (or "Community Pass")
```

### FILE: src/components/mylane/GreetingHeader.jsx
```
LINE 22: Link to PunchPass page — createPageUrl('PunchPass')
  REPLACE WITH: Link to JoyCoinsHistory page

LINE 28: Displays punchPass?.current_balance
  REPLACE WITH: Display Joy Coins balance from useJoyCoins()

LINE 30: Label text "Punches"
  REPLACE WITH: "Joy Coins"
```

### FILE: src/pages/PunchPass.jsx (ENTIRE PAGE — see Priority 4)
```
LINE 77: Toast message "Punch pass purchase coming soon!"
  REPLACE WITH: Remove or redirect to Joy Coins page

LINE 81: Toast message "Donate punch passes coming soon!"
  REPLACE WITH: Remove (Joy Coins has transfer feature already)

LINE 105: Page title "Punch Pass Network"
  REPLACE WITH: N/A — this page should be deleted/redirected

LINE 119: Balance label "punch passes"
  REPLACE WITH: N/A — this page should be deleted/redirected

LINE 145: Section header "Set Your Punch Pass PIN"
  REPLACE WITH: N/A — this page should be deleted/redirected

LINE 199: Button text "Buy More Punches"
  REPLACE WITH: N/A — this page should be deleted/redirected

LINE 211: Button text "Donate a Punch"
  REPLACE WITH: N/A — this page should be deleted/redirected

LINE 240: Empty state "No punch passes used yet"
  REPLACE WITH: N/A — this page should be deleted/redirected

LINE 266: Badge text "-{n} punch/punches"
  REPLACE WITH: N/A — this page should be deleted/redirected

LINE 283: Empty state "Buy your first punch pass to get started"
  REPLACE WITH: N/A — this page should be deleted/redirected

LINE 307: Transaction text "+{n} punches"
  REPLACE WITH: N/A — this page should be deleted/redirected
```

### FILE: src/components/events/EventCard.jsx
```
LINE 63-66: Badge displaying "1 Punch" / "{n} Punches" on event cards
  REPLACE WITH: Remove punch badge entirely (Joy Coin badge already exists on lines 57-61)

LINE 68: Conditional `!punchPassEligible` used to show dollar price
  REPLACE WITH: Remove punchPassEligible check; use isJoyCoinEvent instead
```

### FILE: src/components/events/EventDetailModal.jsx
```
LINE 192-195: Badge "1 Punch" / "{n} Punches" in hero image overlay
  REPLACE WITH: Remove (Joy Coin badge already exists on lines 186-190)

LINE 197: Conditional `!punchPassEligible` for price display
  REPLACE WITH: Remove punchPassEligible check

LINE 222-225: Badge "1 Punch" / "{n} Punches" in no-image price section
  REPLACE WITH: Remove (Joy Coin badge already exists on lines 216-220)

LINE 227: Conditional `!punchPassEligible` for price display
  REPLACE WITH: Remove punchPassEligible check

LINE 386-389: Badge "Punch Pass Eligible" in Age & Audience section
  REPLACE WITH: Remove entirely or replace with "Accepts Joy Coins"
```

### FILE: src/components/dashboard/widgets/FinancialWidget.jsx
```
LINE 43: Tier description "Punch Pass, multiple tickets, auto-publish events"
  REPLACE WITH: "Joy Coins, multiple tickets, auto-publish events"
```

### FILE: src/components/admin/AdminUsersSection.jsx
```
LINE 284: Label "Punch Pass Balance:"
  REPLACE WITH: "Joy Coins Balance:" (and wire to Joy Coins entity data)
```

### FILE: src/pages/Admin.jsx
```
LINE 287: Admin route label "Punch Pass" with description "Punch Pass system settings — coming soon."
  REPLACE WITH: Remove route entirely (Joy Coins admin panel already exists at path "joy-coins" on line 285)
```

### FILE: src/pages/Terms.jsx (LEGAL — REQUIRES ATTORNEY REVIEW)
```
LINE 52: "Community Pass punches are access rights..."
  REPLACE WITH: "Community Pass Joy Coins are access rights..." (needs legal review)

LINE 53: "are not money, stored value, credits, or a payment instrument"
  NOTE: "stored value" and "credits" are intentional legal disclaimers — keep but update context for Joy Coins

LINE 56: "Punches have no cash or set monetary value"
  REPLACE WITH: "Joy Coins have no cash or set monetary value" (needs legal review)

LINE 72: "Punches are non-transferable, expire at the end of each billing cycle..."
  REPLACE WITH: "Joy Coins are non-transferable..." (NOTE: Joy Coins DO support transfer — legal conflict!)

LINE 77-78: "transfer, sell, gift, cash out, or redeem punches... Peer-to-peer transfer of punches is not permitted"
  REPLACE WITH: Update for Joy Coins (NOTE: Joy Coins HAVE P2P transfer via JoyCoinsTransfer.jsx — terms need rewrite)

LINE 82: "not a money transmitter, payment processor, or provider/seller of prepaid access"
  NOTE: "prepaid access" is a legal term — keep but ensure Joy Coins language is consistent
```

### FILE: src/pages/Support.jsx
```
LINE 95-96: FAQ answer "...through a punch-based system. Think of it like a community access pass, not stored value."
  REPLACE WITH: "...through Joy Coins. Think of it like a community access pass, not stored value."
  NOTE: "stored value" disclaimer should stay but context needs updating
```

---

## Priority 2 — Variable/Function Names

These are developer-facing identifiers that should be renamed for codebase consistency.

### FILE: src/hooks/useUserState.js
```
LINE 18: const { data: punchPass } = useQuery({
  RENAME TO: joyCoins (or remove — useJoyCoins hook already exists)

LINE 19: queryKey: ['punchPass', userId]
  RENAME TO: ['joyCoins', userId]

LINE 22: base44.entities.PunchPass.filter(...)
  RENAME TO: base44.entities.JoyCoins.filter(...) — see Priority 3

LINE 29: const hasPunchActivity = punchPass && (punchPass.total_used > 0 ...)
  RENAME TO: hasJoyCoinActivity

LINE 32: if (recCount >= 5 || hasPunchActivity)
  RENAME TO: hasJoyCoinActivity

LINE 41: punchPass (return value)
  RENAME TO: joyCoins
```

### FILE: src/hooks/useOrganization.js
```
LINE 25: canUsePunchPass: false
  RENAME TO: canUseJoyCoins: false

LINE 40: canUsePunchPass: tierLevel >= 2
  RENAME TO: canUseJoyCoins: tierLevel >= 2
```

### FILE: src/pages/MyLane.jsx
```
LINE 27: const { recommendations, punchPass } = useUserState(currentUser?.id);
  RENAME TO: const { recommendations, joyCoins } = useUserState(...)

LINE 57: <GreetingHeader currentUser={currentUser} punchPass={punchPass} />
  RENAME TO: joyCoins={joyCoins}
```

### FILE: src/components/mylane/GreetingHeader.jsx
```
LINE 5: export default function GreetingHeader({ currentUser, punchPass })
  RENAME PROP TO: joyCoins

LINE 28: {punchPass?.current_balance ?? 0}
  RENAME TO: {joyCoins?.balance ?? 0}
```

### FILE: src/components/events/EventCard.jsx
```
LINE 10: const punchPassEligible = event.punch_pass_accepted;
  RENAME TO: Remove entirely (use isJoyCoinEvent which already exists on line 15)

LINE 14: const punchCount = punchPassEligible ? ...
  DELETE: No longer needed
```

### FILE: src/components/events/EventDetailModal.jsx
```
LINE 18: const punchPassEligible = event.punch_pass_accepted;
  RENAME TO: Remove entirely (use isJoyCoinEvent which already exists on line 21)

LINE 19: const punchCount = punchPassEligible ? ...
  DELETE: No longer needed

LINE 376: punchPassEligible reference in conditional
  DELETE: Remove punch pass check
```

### FILE: src/components/dashboard/EventEditor.jsx
```
LINE 50: const { tier, canUsePunchPass, canUseMultipleTickets } = useOrganization(business);
  RENAME TO: canUseJoyCoins

LINE 121: Comment "Prefill from backend field names: date, punch_pass_accepted, network, thumbnail_url"
  UPDATE COMMENT TO: Remove punch_pass_accepted reference

LINE 236: if (formData.punch_pass_eligible && formData.pricing_type === "free")
  RENAME TO: joy_coin_enabled (or remove if Joy Coins already has this validation)

LINE 237: e.pricing_type = "Punch Pass events cannot be free"
  RENAME TO: "Joy Coin events cannot be free"

LINE 306: Comment "map to backend field names (date, punch_pass_accepted, network, thumbnail_url)"
  UPDATE COMMENT TO: Remove punch_pass_accepted reference
```

### FILE: src/components/admin/AdminUsersSection.jsx
```
LINE 55: const { data: userPunchPasses = [] } = useQuery({
  RENAME TO: userJoyCoins

LINE 56: queryKey: ['admin-user-punchpass', selectedUser?.id]
  RENAME TO: ['admin-user-joycoins', selectedUser?.id]

LINE 58: base44.entities.PunchPass.filter(...)
  RENAME TO: base44.entities.JoyCoins.filter(...) — see Priority 3

LINE 110-111: const punchPassBalance = userPunchPasses.length > 0 ? ...
  RENAME TO: joyCoinBalance

LINE 285: {punchPassBalance}
  RENAME TO: {joyCoinBalance}
```

---

## Priority 3 — Entity/Database References

These reference Base44 entity names and database field names. Changing these requires a migration strategy — you can't just rename them without updating the Base44 dashboard entities too.

### Entity: `PunchPass` → `JoyCoins` (already exists as separate entity)
Referenced in:
```
src/hooks/useUserState.js:22         — base44.entities.PunchPass.filter(...)
src/pages/PunchPass.jsx:28           — base44.entities.PunchPass.filter(...)
src/components/admin/AdminUsersSection.jsx:58 — base44.entities.PunchPass.filter(...)
functions/setPunchPassPin.ts:33      — base44.entities.PunchPass.filter(...)
functions/setPunchPassPin.ts:37      — base44.entities.PunchPass.update(...)
functions/setPunchPassPin.ts:42      — base44.entities.PunchPass.create(...)
functions/validatePunchPass.ts:48    — base44.asServiceRole.entities.PunchPass.filter(...)
functions/validatePunchPass.ts:90    — base44.asServiceRole.entities.PunchPass.update(...)
functions/searchHubMember.ts:90      — base44.asServiceRole.entities.PunchPass.filter(...)
functions/searchHubMember.ts:110     — base44.asServiceRole.entities.PunchPass.filter(...)
functions/handleEventCancellation.ts:27 — base44.asServiceRole.entities.PunchPass.get(...)
functions/handleEventCancellation.ts:31 — base44.asServiceRole.entities.PunchPass.update(...)
```
NOTE: `JoyCoins` entity already exists and is used throughout the new system. The PunchPass entity can potentially be deprecated once all data is migrated.

### Entity: `PunchPassTransaction` → `JoyCoinTransactions` (already exists)
Referenced in:
```
src/pages/PunchPass.jsx:38 — base44.entities.PunchPassTransaction.filter(...)
```
NOTE: `JoyCoinTransactions` entity already exists.

### Entity: `PunchPassUsage` → `JoyCoinReservations` (already exists as separate concept)
Referenced in:
```
src/pages/PunchPass.jsx:47               — base44.entities.PunchPassUsage.filter(...)
functions/validatePunchPass.ts:96        — base44.asServiceRole.entities.PunchPassUsage.create(...)
functions/handleEventCancellation.ts:18  — base44.asServiceRole.entities.PunchPassUsage.filter(...)
functions/handleEventCancellation.ts:37  — base44.asServiceRole.entities.PunchPassUsage.delete(...)
```
NOTE: Joy Coins system uses `JoyCoinReservations` for event holds. Different data model — not a direct rename.

### Database Field: `punch_pass_accepted` (on Event entity)
Referenced in:
```
src/components/events/EventCard.jsx:10        — event.punch_pass_accepted
src/components/events/EventDetailModal.jsx:18 — event.punch_pass_accepted
functions/receiveEvent.ts:59                  — punch_pass_eligible (mapped TO punch_pass_accepted)
functions/receiveEvent.ts:115                 — punch_pass_accepted: punch_pass_eligible || false
functions/updateEvent.ts:57                   — punch_pass_eligible destructured
functions/updateEvent.ts:112                  — updateData.punch_pass_accepted = punch_pass_eligible
```
NOTE: Joy Coins events use `joy_coin_enabled` (boolean) + `joy_coin_cost` (number) + `joy_coin_spots` (number). The `punch_pass_accepted` field on the Event entity needs to be deprecated in Base44 dashboard.

### Database Field: `punch_cost` (parameter in validatePunchPass)
Referenced in:
```
functions/validatePunchPass.ts:32  — punch_cost = 1 (destructured from request body)
functions/validatePunchPass.ts:80  — punchPass.current_balance < punch_cost
functions/validatePunchPass.ts:84  — required: punch_cost
functions/validatePunchPass.ts:92  — total_used: ... + punch_cost
functions/validatePunchPass.ts:103 — punches_deducted: punch_cost
functions/validatePunchPass.ts:112 — punches_deducted: punch_cost
```

### Database Fields on PunchPass entity: `current_balance`, `total_used`, `total_purchased`, `total_donated`, `pin_hash`
These exist on the PunchPass entity. The JoyCoins entity uses: `balance`, `lifetime_earned`, `lifetime_spent`.
Migration strategy needed to map old fields to new entity structure.

---

## Priority 4 — Dead Code / Deletable

### DELETE: `src/pages/PunchPass.jsx`
- **Entire file (347 lines)** — Legacy Punch Pass user page
- Joy Coins equivalent already exists: `src/pages/JoyCoinsHistory.jsx`
- All functionality (balance display, PIN, usage history, transactions) is superseded by Joy Coins system

### DELETE: `pages.config.js` PunchPass route
```
LINE 11: import PunchPass from './pages/PunchPass';
  DELETE: Remove import

LINE 33: "PunchPass": PunchPass,
  DELETE: Remove route entry
  NOTE: Consider adding redirect from /PunchPass to /JoyCoinsHistory if external links exist
```

### DELETE: Admin route for Punch Pass
```
src/pages/Admin.jsx LINE 287:
  <Route path="punch-pass" element={<PlaceholderSection title="Punch Pass" ... />} />
  DELETE: Joy Coins admin panel already exists at path "joy-coins" (line 285)
```

### MIGRATE: `functions/setPunchPassPin.ts`
- **Entire file (58 lines)** — Sets PIN on PunchPass entity
- Decision needed: Does Joy Coins system use PIN authentication?
  - If yes → migrate to `setJoyCoinPin.ts` targeting JoyCoins entity
  - If no → delete entirely

### MIGRATE: `functions/validatePunchPass.ts`
- **Entire file (123 lines)** — Validates PIN and deducts punches for spoke check-ins
- Decision needed: Does Joy Coins system need spoke-based check-in with PIN?
  - If yes → migrate to `validateJoyCoins.ts` targeting JoyCoins + JoyCoinTransactions entities
  - If no → delete entirely

### UPDATE: `functions/handleEventCancellation.ts`
- Lines 17-43: Entire punch pass refund block references PunchPass and PunchPassUsage entities
- Decision needed: Should event cancellation refund Joy Coins?
  - If yes → rewrite to use JoyCoins + JoyCoinReservations entities
  - If no → remove the refund block (lines 17-43) and the email note (lines 74-75)

### UPDATE: `functions/searchHubMember.ts`
- Lines 90-118: PIN search and punch_balance lookup both reference PunchPass entity
- Decision needed: Should hub member search show Joy Coin balance?
  - If yes → rewrite to use JoyCoins entity
  - If no → remove punch-related fields from response

### UPDATE: `functions/receiveEvent.ts` and `functions/updateEvent.ts`
- Both reference `punch_pass_eligible` in the spoke event sync API
- Decision needed: Do partner nodes still send `punch_pass_eligible`?
  - If yes → map to `joy_coin_enabled` instead of `punch_pass_accepted`
  - If no → remove field handling

---

## False Positives

These matches contain "punch" but are NOT related to the Punch Pass system:

```
(none found — all "punch" references in this codebase are Punch Pass related)
```

---

## Legal Risk Terms (Attorney Review Required)

### FILE: src/pages/Terms.jsx
```
LINE 53: "stored value" — intentional legal disclaimer, but context says "punches" not "Joy Coins"
LINE 53: "credits" — intentional legal disclaimer
LINE 82: "prepaid access" — intentional legal disclaimer

ACTION: The Terms of Service needs a full rewrite of Section 3 to replace all "punch"
language with "Joy Coins" AND address the fact that Joy Coins support P2P transfer
(JoyCoinsTransfer.jsx) which directly conflicts with current Terms lines 72 and 77-78
that say "Punches are non-transferable" and "Peer-to-peer transfer of punches is not
permitted." This is a legal inconsistency that must be resolved.
```

### FILE: src/pages/Support.jsx
```
LINE 95-96: "punch-based system" and "stored value" — update description but keep
"not stored value" disclaimer language
```

---

## CLAUDE.md References

The following lines in `claude.md` reference Punch Pass and should be updated when this migration is complete:

```
LINE 142: "punch usage" in Organism phase description
LINE 165: canUsePunchPass in useOrganization example
LINE 335: canUsePunchPass in hook documentation
LINE 383: "Community Pass replaced Punch Pass stored-value model" — historical note, may keep
```

---

## Recommended Migration Order

1. **Priority 1 first** — Update user-facing text (Layout.jsx nav, GreetingHeader, event badges, admin labels, widget text)
2. **Priority 4 delete** — Remove PunchPass.jsx page, route, and admin placeholder
3. **Priority 2 rename** — Rename variables/props across hooks and components
4. **Priority 3 entity** — Database migration strategy (coordinate with Base44 dashboard)
5. **Legal review** — Terms.jsx rewrite addressing Joy Coins transfer feature vs. current "non-transferable" language
6. **Server functions** — Decide fate of setPunchPassPin.ts, validatePunchPass.ts, update handleEventCancellation.ts and searchHubMember.ts
7. **CLAUDE.md** — Update documentation references last
