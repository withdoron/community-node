# Mylane Shell Containment Audit

**Date:** 2026-04-15
**Auditor:** Hyphae
**Status:** Audit complete. No code changes made.

---

## Summary

The app has **29 distinct routes** serving 33 page files. Of these, **only 1 route** (`/MyLane`) renders inside the Mylane shell. The remaining 28 routes render inside the **legacy Layout wrapper** (nav header + footer) or standalone (no wrapper at all). There are **6 escape points** where links inside the shell navigate to pages outside it. There are **5 orphaned pages/affordances** with no path to them from the Mylane shell. The single biggest structural issue is that the Layout wrapper and the Mylane shell are **parallel containers, not nested ones** — every route is wrapped in `<LayoutWrapper>` at the router level, and MyLane opts out of that wrapper's header/footer via a CSS flag. This means bringing pages "inside the shell" requires either rendering them as overlays within MyLaneSurface (the current pattern for Directory/Events/Frequency/Settings) or restructuring the router so the shell IS the layout wrapper.

---

## Shell Composition

**File:** `src/components/mylane/MyLaneSurface.jsx` (~906 lines)

The Mylane shell mounts inside `src/pages/MyLane.jsx`, which is the single page component that renders the full shell experience. The shell contains:

| Component | Location | Behavior |
|-----------|----------|----------|
| **Header** | Top bar | Logo (resets to home), music icon (Frequency overlay toggle), "Directory" text (overlay toggle), "Events" text (overlay toggle), avatar circle (Account overlay toggle) |
| **SpaceSpinner** | Below header | Horizontal gallery of workspace positions. Tapping a space renders its content inline via MyLaneDrillView |
| **Content area** | Main body | Renders HomeFeed, DiscoverPosition, DevLab, or MyLaneDrillView based on active spinner position |
| **Overlays** | Full-screen panels | Frequency Station, Directory, Events, and Account — each lazy-loads the full page component and renders it inline inside the shell |
| **CommandBar (mobile)** | Bottom-docked bar | Agent input, chips, voice — gated to allowlist (R&D) |
| **CommandBar (desktop)** | Fixed right panel | Agent panel — gated to allowlist (R&D) |
| **Account overlay** | Overlay panel | Settings (rendered inline), Newsletter (dead link), Sound/haptics toggle, Theme cycle, Terms (new tab), Privacy (new tab), Log out |

**Navigation pattern:** Everything inside the shell uses overlay toggles or spinner selection. No `<Link>` or `navigate()` calls leave the shell — except for Terms/Privacy (intentional new-tab) and Log out.

---

## Route Inventory

### Routes from `pages.config.js` (wrapped in LayoutWrapper)

| Route | Component | Auth | Inside Shell? | Notes |
|-------|-----------|------|--------------|-------|
| `/` | Home (unauth) or redirect to MyLane (auth) | Public | No (Home) / Yes (redirect) | Home page is the pre-auth landing |
| `/Admin/*` | Admin | Protected | No | Admin panel — separate layout |
| `/BusinessOnboarding` | BusinessOnboarding | Protected | No | Multi-step wizard |
| `/BusinessProfile` | BusinessProfile | Public | No | Full business detail page |
| `/CategoryPage` | CategoryPage | Public | No | Filtered business list |
| `/Directory` | Directory | Public | **Partially** | Rendered as overlay inside shell AND as standalone route outside shell |
| `/Events` | Events | Public | **Partially** | Same dual rendering as Directory |
| `/Home` | Home | Public | No | Landing page |
| `/MyLane` | MyLane | Protected | **Yes** | The shell itself |
| `/Philosophy` | Philosophy | Public | No | Mission statement page |
| `/Privacy` | Privacy | Public | No | Privacy policy |
| `/Search` | Search | Public | No | Business search |
| `/Settings` | Settings | Protected | **Partially** | Rendered inline in Account overlay AND as standalone route |
| `/SpokeDetails` | SpokeDetails | Public | No | API integration hub |
| `/Support` | Support | Public | No | Support contact info |
| `/Terms` | Terms | Public | No | Terms of service |
| `/Recommend` | Recommend | Protected | No | Recommendation form |
| `/welcome` | UserOnboarding | Protected | No | Legacy redirect to MyLane |
| `/TeamOnboarding` | TeamOnboarding | Protected | No | Team creation wizard |
| `/FinanceOnboarding` | FinanceOnboarding | Protected | No | Finance workspace wizard |
| `/FieldServiceOnboarding` | FieldServiceOnboarding | Protected | No | Field service workspace wizard |
| `/PropertyManagementOnboarding` | PropertyManagementOnboarding | Protected | No | PM workspace wizard |
| `/MealPrepOnboarding` | MealPrepOnboarding | Protected | No | Kitchen workspace wizard |

### Routes defined directly in App.jsx

| Route | Component | Auth | Inside Shell? | Notes |
|-------|-----------|------|--------------|-------|
| `/Events/:eventId` | Events (with URL param) | Public | No | Shareable event deep-link |
| `/my-lane/transactions` | JoyCoinsHistory | Protected | No | Joy Coins history |
| `/networks` | Networks | Protected | No | Networks index |
| `/networks/:slug` | NetworkPage | Protected | No | Single network detail |
| `/claim-business` | ClaimBusiness | Protected | No | Business claim flow |
| `/join/:inviteCode` | JoinTeam | Public | No | Team invite — no LayoutWrapper |
| `/door/:slug` | JoinTeam | Public | No | Human-readable team join |
| `/join-field-service/:inviteCode` | JoinFieldService | Public | No | FS workspace invite |
| `/join-pm/:inviteCode` | JoinPM | Public | No | PM workspace invite |
| `/client-portal/:profileId/:projectId` | ClientPortal | Public | No | Public client portal — no LayoutWrapper |
| `/client-portal` | ClientPortal | Public | No | Client portal base |
| `/shaping` | ShapingTheGarden | Public | No | Ideas board |
| `/frequency` | FrequencyStation | Public | No | Standalone frequency station |
| `/frequency/:slug` | SongDetail | Public | No | Song detail page |

---

## Navigation Map

### Inside the Mylane Shell

| Link/Action | Location | Destination | Contained? |
|-------------|----------|-------------|------------|
| Logo click | Header | Home position (spinner index 0) | Yes (internal) |
| Music icon | Header | Frequency Station overlay | Yes (inline) |
| "Directory" text | Header | Directory overlay | Yes (inline) |
| "Events" text | Header | Events overlay | Yes (inline) |
| Avatar circle | Header | Account overlay | Yes (inline) |
| Spinner items | Below header | Workspace content (MyLaneDrillView) | Yes (inline) |
| Settings (in Account) | Account overlay | Settings page rendered inline | Yes (inline) |
| Newsletter (in Account) | Account overlay | **Dead link — no onClick handler** | N/A |
| Sound & haptics | Account overlay | Toggle (no navigation) | Yes |
| Theme | Account overlay | Cycle (no navigation) | Yes |
| Terms (in Account) | Account overlay | `/Terms` in **new browser tab** | **Escapes** (intentional) |
| Privacy (in Account) | Account overlay | `/Privacy` in **new browser tab** | **Escapes** (intentional) |
| Log out | Account overlay | `window.location.href = '/'` | **Escapes** (auth requirement) |
| Business card (in Directory overlay) | Directory overlay | `/BusinessProfile?id=...` via `<Link>` | **Escapes** (navigates to standalone page) |
| Events navigation | Events overlay | `/Events` or `/Events/:id` via `navigate()` | **Escapes** (route change exits shell) |
| Discover > workspace | Discover position | Onboarding wizard pages via `navigate(createPageUrl(...))` | **Escapes** (navigates to standalone wizard) |
| FrequencyMiniPlayer tap | App-level (outside shell) | `/frequency` or `/frequency/:slug` via `navigate()` | **Escapes** (navigates to standalone page) |
| Join invite link copy | MyLaneDrillView (team) | Clipboard copy of `/join/...` URL | N/A (clipboard) |

### Inside the Layout Wrapper (legacy nav — visible on pages other than MyLane/Home)

| Link | Location | Destination |
|------|----------|-------------|
| Logo | Header | MyLane (auth) or Home (unauth) |
| Directory | Desktop nav + drawer | `/Directory` |
| Events | Desktop nav + drawer | `/Events` |
| My Lane | Dropdown + drawer | `/MyLane` |
| Admin Panel | Dropdown + drawer (admin only) | `/Admin` |
| Settings | Dropdown + drawer | `/Settings` |
| Become / Sign In | Header CTA | Base44 auth redirect |
| Philosophy | Footer | `/Philosophy` |
| Terms | Footer | `/Terms` |
| Privacy | Footer | `/Privacy` |
| Support | Footer | `/Support` |
| Newsletter signup | Footer | Form submission (NewsletterSubscriber entity) |

---

## Escape Points

Links inside the Mylane shell that navigate to pages rendering outside it:

| # | Trigger | From | To | Severity |
|---|---------|------|----|----------|
| 1 | **Business card click** | Directory overlay | `/BusinessProfile?id=...` (Layout wrapper) | High — common user action |
| 2 | **Event navigation** | Events overlay | `/Events/:id` route change (exits shell for URL state) | Medium — URL changes but content is similar |
| 3 | **Discover > workspace wizard** | Discover position (spinner) | Onboarding wizards (`/TeamOnboarding`, `/FieldServiceOnboarding`, etc.) | Medium — one-time flows, but jarring |
| 4 | **FrequencyMiniPlayer tap** | App-level mini-player | `/frequency` or `/frequency/:slug` (Layout wrapper) | Medium — frequent for music users |
| 5 | **Terms link** | Account overlay | `/Terms` (new tab) | Low — intentional, legal page |
| 6 | **Privacy link** | Account overlay | `/Privacy` (new tab) | Low — intentional, legal page |

Log out is excluded — navigating away on sign-out is expected behavior.

---

## Orphans

Pages/affordances with no path to them from the Mylane shell:

| # | Page/Affordance | Route | Reachable From | Status |
|---|----------------|-------|----------------|--------|
| 1 | **Philosophy** | `/Philosophy` | Footer only (not visible on MyLane page) | Orphaned — no shell path |
| 2 | **Support** | `/Support` | Footer only | Orphaned — no shell path |
| 3 | **Newsletter signup** | Footer component | Footer form only (Account overlay shows "Newsletter" text but it's a dead link with no onClick) | Orphaned — no shell path, dead link in Account |
| 4 | **Search** | `/Search` | Not linked from anywhere visible — no nav link, no footer link, no shell link | Fully orphaned |
| 5 | **SpokeDetails** | `/SpokeDetails` | Not linked from anywhere visible | Fully orphaned |
| 6 | **ShapingTheGarden** | `/shaping` | Not linked from anywhere visible in shell or Layout | Fully orphaned |
| 7 | **JoyCoinsHistory** | `/my-lane/transactions` | Not linked from anywhere visible | Fully orphaned |
| 8 | **Recommend** | `/Recommend` | Only from BusinessProfile page (which itself is outside shell) | Orphaned from shell |
| 9 | **CategoryPage** | `/CategoryPage` | Not directly linked (was used by old directory categories) | Likely dead |
| 10 | **ClaimBusiness** | `/claim-business` | Not linked from anywhere visible | Orphaned |

---

## Structural Pattern

The architecture has two parallel layout systems:

1. **Layout wrapper** (`src/Layout.jsx`) — legacy container with nav header, hamburger drawer, and footer. Wraps every route via `<LayoutWrapper>` in App.jsx. The MyLane page opts out of the header via `hideNavHeader` (line 63 of Layout.jsx) and the footer via `currentPageName !== 'MyLane'` (line 279).

2. **Mylane shell** (`src/components/mylane/MyLaneSurface.jsx`) — the new unified container. Has its own header, overlays, spinner navigation, and content area. Only the `/MyLane` route renders this.

**The critical structural issue:** These two systems are siblings, not parent-child. The router wraps everything in LayoutWrapper, and MyLane happens to hide the Layout's header/footer. This means:

- Pages rendered as overlays inside the shell (Directory, Events, Frequency, Settings) work correctly — they're lazy-loaded components mounted inside MyLaneSurface.
- But any `<Link>` or `navigate()` call from within those overlays changes the React Router route, which unmounts the MyLane page and mounts the destination page inside the Layout wrapper instead. The user falls through the floor.
- The shell cannot intercept route changes from child components because it doesn't own the router.

---

## Recommended Plan

### Phase 1: Fix escape points (highest impact, lowest risk)

**Goal:** Stop links inside the shell from navigating away.

1. **BusinessCard links in Directory overlay.** When Directory renders inside the shell overlay, business card clicks should open BusinessProfile as a new overlay or inline panel instead of navigating to `/BusinessProfile`. Options: (a) intercept clicks and render BusinessProfile inline, (b) add an `onBusinessClick` callback prop to Directory that the shell handles.

2. **FrequencyMiniPlayer.** When tapped, should toggle the Frequency overlay in the shell instead of navigating to `/frequency`. The mini-player already has access to the frequency context; it needs a way to signal the shell to open the overlay. Options: (a) custom event that MyLaneSurface listens for, (b) shared context/callback.

3. **Events URL state.** The Events overlay uses `navigate('/Events')` and `navigate('/Events/:id')` to manage URL state for deep-linking. This changes the route, which unmounts the shell. Fix: use URL search params or state within the overlay instead of route-level navigation.

4. **Discover workspace wizards.** Onboarding wizards navigate to standalone pages. These are one-time flows — acceptable as escape points during beta, but should eventually render as overlays or modals inside the shell.

### Phase 2: Surface orphans in the shell

**Goal:** Give every real page a home inside the shell.

1. **Add Philosophy and Support links to the Account overlay** under a new "About" section (below Legal). These are identity pages — they belong in the account/info area.

2. **Wire the Newsletter link in Account overlay.** It currently has no onClick handler. Either: (a) render the newsletter signup form inline when tapped, or (b) open a small modal with the form. The Footer already has a working form component that can be extracted.

3. **Search.** Decide: is Search still needed as a standalone page? The Directory overlay has search built in. If Search is redundant, delete it. If it serves a different purpose, surface it in the shell header.

### Phase 3: Structural containment

**Goal:** Make the shell the single layout container.

1. **Move LayoutWrapper inside MyLaneSurface for authenticated users.** For authenticated routes, the shell should be the outermost container, and page components render inside its content area. The Layout nav/footer should only render for unauthenticated public pages (Home, Directory, Events, BusinessProfile, Terms, Privacy, etc.).

2. **Alternatively: keep the current overlay pattern** and expand it. Every page that an authenticated user needs (Settings, Admin, etc.) renders as an overlay inside the shell. The standalone routes remain for unauthenticated/public access and deep-linking.

3. **Recommended approach: Option 2 (expand overlays).** It's more incremental, doesn't require restructuring the router, and matches the existing pattern. Add BusinessProfile, Recommend, and legal pages to the overlay system. Admin is the only authenticated page that might warrant its own route due to its complexity.

### Phase 4: Deletion candidates

These pages should be reviewed for deletion:

| Page | Reasoning | Decision needed |
|------|-----------|-----------------|
| **UserOnboarding** (`/welcome`) | Already a redirect to MyLane. Safe to remove the route after confirming no external links point to it. | Low risk — delete route, keep redirect as safety net |
| **CategoryPage** | Not linked from anywhere. Directory handles category filtering internally. | Confirm no external links, then delete |
| **SpokeDetails** | Not linked from anywhere visible. Purpose unclear — may be a legacy admin tool. | Ask Doron if this is still needed |
| **Search** | Directory overlay has search built in. Standalone Search page may be redundant. | Confirm with Doron — possibly merge into Directory |
| **JoyCoinsHistory** | Not linked from anywhere. Joy Coins feature may be dormant. | Ask Doron about Joy Coins status |
| **ShapingTheGarden** | Ideas board — not linked from anywhere. May be intended for future launch. | Ask Doron |
| **ClaimBusiness** | Not linked from anywhere visible. May be part of a flow not yet wired up. | Ask Doron |

### Execution Order

1. **Session 1:** Fix BusinessCard escape (highest-frequency escape point) + wire Newsletter link in Account overlay
2. **Session 2:** Fix FrequencyMiniPlayer escape + fix Events URL state issue
3. **Session 3:** Add Philosophy/Support to Account overlay + surface or delete orphans (after Doron review)
4. **Session 4:** Onboarding wizards as overlays (if desired — acceptable as escape during beta)
5. **Session 5:** Structural decision — overlay expansion vs. router restructure (requires Doron + Mycelia alignment)

---

## Open Questions for Doron and Mycelia

1. **BusinessProfile inside the shell:** When a user taps a business in the Directory overlay, should it open as a full overlay (like Directory itself), a slide-in panel, or is navigating away acceptable for now? This is the most frequent escape point.

2. **SpokeDetails, ShapingTheGarden, ClaimBusiness, JoyCoinsHistory** — are these pages still active or intended for future use? If dormant, should they be construction-gated or deleted?

3. **Search page** — is this redundant with the Directory overlay's built-in search, or does it serve a different purpose?

4. **Legal pages (Terms/Privacy) in new tabs** — the current pattern opens them in new browser tabs from the Account overlay. Is this acceptable long-term, or should they render as overlays inside the shell?

5. **Admin panel** — should Admin eventually render inside the shell (as an overlay or dedicated position), or is it acceptable as a separate standalone page? It's complex and admin-only.

6. **Onboarding wizards** — these are one-time flows that currently navigate away from the shell. Is the escape acceptable (user returns to MyLane on completion), or should they render as overlays for smoother UX?

7. **FrequencyMiniPlayer** — when the mini-player is tapped, should it open the Frequency overlay in the shell, or navigate to the standalone `/frequency` page? The shell already has Frequency as an overlay.

8. **Newsletter in Account overlay** — the "Newsletter" item exists but has no click handler. Should it open an inline signup form, link to an external page, or be removed until The Good News is ready?

---

*Audit complete. No code was modified. This report is the input for a planning session with Doron and Mycelia before any execution begins.*
