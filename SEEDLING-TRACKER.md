# SEEDLING-TRACKER.md

> All nodes, contacts, and growth status. The garden's nursery.

---

## Active Nodes

| Node | Type | Status | Score | Last Updated |
|------|------|--------|-------|-------------|
| Community Node | Platform | Audit complete (87/100). Entity permissions locked. Dead code cleaned. Auth consolidated. | ~87/100 | 2026-04-04 |
| Field Service | Workspace | Documents + e-sign + agent live. Mobile optimized. | ~92/100 | 2026-03-27 |
| Harvest Network | Network | Phase 2 shipped — product tags, payment methods, tag filtering, geocoding. Map view and application flow gated. Two egg sellers ready to join. | ~60/100 | 2026-03-27 |
| Property Management | Workspace | Phase 4 complete | ~95/100 | 2026-03-25 |
| Personal Finance | Workspace | V1 complete | ~78/100 | 2026-03-25 |
| Play Trainer (Team) | Workspace | Production. Schedule (RSVP/duties/recurring/readiness), photos, 4 print layouts, player cards, leaderboard. Parent invite flow complete. | Production | 2026-04-03 |
| Frequency Station | Feature | Phase 2 live, "Come Alive" playing | Functional | 2026-03-25 |
| FieldServiceAgent | Space Agent | LIVE. First Superagent. Reads all FS entities, web search, ServiceFeedback. Chat UI with voice. Live on all FS tabs. | Live | 2026-03-27 |

## Seedling Nodes (Planted, Not Yet Built)

| Seedling | Type | Status | Notes |
|----------|------|--------|-------|
| Meal Prep & Groceries | Workspace | Phase 1 built (2026-04-01) | Recipe Book complete. 3 entities (MealPrepProfile, Recipe, RecipeIngredient). Construction gated (testingMode: true). Awaiting walkthrough. |
| Creative Alliance | Network | Activation signal | Three real people identified: greeting card maker, natural remedies seller (Etsy), Saturday Market vendors. LocalLane's version of Etsy for non-food makers. |
| The Circuit | Partnership | Conversations started | Community Pass / Recess Pass audit needed for partnership structure. |
| Mycelia Admin Agent | Platform Agent | Planned | Platform-level Superagent for the gardener. Admin dashboard intelligence. |
| HarvestAgent | Space Agent | Planned | Agent for Harvest Network space. Vendor lookup, market schedules. |
| RecessAgent | Space Agent | Planned | Agent for movement/play spaces. Class schedules, instructor lookup. |
| Organism Creature (Avatar) | Feature | Designed (2026-03-31) | 7-param SVG mushroom (spaces, connections, recentActivity, tenure, modePreference, networkDepth, diversityScore). 5 composable layers. Breathing animation. Build when 50+ active users with diverse workspace usage. |
| Pip-Boy Wearable | Hardware | Concept (2026-03-31) | Phone band docking to wrist/forearm. App switches to simplified glanceable interface. Voice-first Mylane. The band IS the onboarding. Needs working mobile app + manufacturing research. |
| Mylane-to-Mylane Messaging | Feature | Designed (2026-03-31) | MylaneMessage entity. Cross-user communication via relationship links. Whisper/nudge/alert urgency. Companion-to-companion delivery. Build after items 5-6 (Mylane as default + ghost cards). |
| Dynamic Pricing Gauge | Feature | Designed (2026-03-31) | UsageEvent metering + getUserGauge() server function + Mylane gauge card. $3 ante, $9 increments. Fuel gauge visible in Mylane. Needs Stripe integration + UsageEvent entity deployed. |
| League & Play Library | Workspace | Seedling (2026-04-03) | League workspace (Randy, $9/mo) > Teams (coaches, free) > Players. Shared play library with fork model. Hyphae review: use flag-on-Play instead of SharedPlay entity for V1, derive usage count, add LeagueAgent, season_id concept. Matures at 3+ teams. Spec in private repo. |
| Founding Gardener Program | Feature | Concept (2026-04-04) | DEC-138. Earned status, not signup bonus. Weighted score: spaces (10), feedback (5), weeks active (3), content (2), participation (1). Observation live via platformPulse gardeners action + MCP. First report: 22 users, 6 active, 16 dormant. Doron assigns personally after observation. |
| Newsletter "The Good News" | Content | Planned (2026-04-04) | Wake 16 dormant accounts. Tone: "We've been building. Here's what grew." Show what shipped, invite back. |
| LocalLane-as-Pip-Boy | Product Thesis | Concept (2026-04-10) | LocalLane is a Pip-Boy — each user gets a personalized interface to the organism. Custom themes, controls, agents. Shared features are shared (directory, events, passes, marketplace); the interface is personal. Doron is the first user building his own Pip-Boy and letting others subscribe to parts that fit their lives. Normal-person-explainable, location-independent, matches the seed-within-fruit fractal. |
| Community Data Center | Architecture | Ten-year arc (2026-04-10) | Each community eventually runs its own LocalLane instance on its own hardware (refrigerator-sized box in a library, church, maker space, farm), federated to other communities through explicit sharing agreements. Analogous to Mastodon/Matrix/Nextcloud but community-organism-shaped. The server-function-as-boundary pattern (readTeamData, agentScopedQuery) is already compatible with federation — the fractal holds from team membership to community membership. |
| Raised Personal Assistant | Project | Post-May 19 (2026-04-10) | Persistent local AI assistant raised over time using OpenClaw/Clawbot framework on Mac mini. Intentional character shaping. Eventually housed in 3D-printed robot body (Chappie reference). Shared SuperMemory with Mycelia and Hyphae via shared-foundation container + separate write containers. Reference implementation for Pip-Boy thesis. NOT STARTING until after custody trial (2026-05-19). |
| Business Profile + Client Invite | Product Motion | Concept (2026-04-10) | Doron has a business profile on LocalLane. When working for Dan, Bari, Rick, or any client, he invites them into the space he works with them on. The space IS the relationship — billing, hours, work logs, documents flow through it. Consulting work builds new spaces. New principle: no more building for free unless using it himself or building to sell. People with skin in the game only. Next Playmaker-adjacent product motion to spec once team space is stable. |
| `legacyCategoryMapping` cleanup | Cleanup | Phase 5 candidate (2026-04-25) | `categoryData.jsx:229-240` references pre-DEC-055 category IDs. Vestigial after multi-category support shipped in Build F. Removable in Phase 5 (DEC-180). |
| BusinessEditDrawer derived-write pattern | Cleanup | Phase 5 candidate (2026-04-25) | `BusinessEditDrawer.jsx:75-98` derived-write pattern becomes vestigial after Build F.3's Directory pill filter patch. Removable in Phase 5 (DEC-180). |
| HardHat string-icon in workspaceTypes | Cleanup | Phase 5 candidate (2026-04-25) | `workspaceTypes.js:232` HardHat string-icon. Cleanup when archetype-neutralizing the workspace type. |
| Persistent Base44 SDK 404 console spam | Investigation | Root-cause candidate (2026-04-25) | 404s logged on every page load from the Base44 SDK. Source unknown; not user-visible. Worth a focused root-cause investigation pass. |
| Duplicate `DC` key React warning (Radix Select) | Cosmetic fix | Open (2026-04-25) | React warns about duplicate `DC` key in a Radix Select instance. Likely state-code Select. Separate cosmetic fix. |

## Key Contacts

| Person | Connection | Status | Notes |
|--------|-----------|--------|-------|
| Bari (Red Umbrella) | Field Service pilot user | Active | Going on trip end of next week. 14+ feedback items collected, most shipped same day. |
| Peter (Elite Auto Tech N Tow) | Potential second FS vertical | Identified | Mechanic in Eugene. |
| Hayley | Lane County Farmers Market ED | Building | Saturday Market orientation completed. |
| Get Air (Charlie) | Recess Pass pilot | Declined for now | Open to future when established. |
| Coach Rick | Team / Playmaker | Confirmed working (2026-04-10) | Visibility bug resolved. Rick confirmed from his own phone: "I have everything!" Full roster, playbook, schedule visible. Next: test coach onboarding with fresh account, then call Randy about league. |
| Randy | Grab It NFL FLAG coordinator | Met 2026-03-30 | Head coordinator of Grab It NFL FLAG in Eugene. Paid position. League-wide Playmaker sponsorship opportunity. Call after Coach Rick confirms flow works. Research his scheduling workflow. |
| Natasha (nataherb2024) | First pure organic signup | Discovered 2026-04-04 | Gardener score 13 — same as Bari. Unknown connection to platform. Worth investigating. |
| Jeslyn Everitt | First real parent user | Active | Gardener score 4. Entered via team invite. |

---
