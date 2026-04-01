# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-04-01

## Current Focus

Meal Prep workspace Phase 1 (Recipe Book) built and construction-gated. Three Base44 entities created (MealPrepProfile, Recipe, RecipeIngredient). Full workspace wired: config, onboarding, components, server functions, MyLane card, drill view. Awaiting Doron walkthrough to flip construction gate.

## Active Nodes

| Node | Status | What Just Shipped | What's Next |
|------|--------|-------------------|-------------|
| Community Node | Production, 22 users | Meal Prep Phase 1 built (construction gated). Warm entry backfill for FS + PM. | Doron walkthrough, flip gate, agentScopedQuery update |
| Meal Prep | Phase 1 built | 3 entities, onboarding, recipe book, MyLane card, server functions | Walkthrough, then Phase 2 (meal planning) |
| Contractor Daily | Build 17, stable | N/A | Dan Sikes field testing |
| Property Pulse | Activated | N/A | North Bend coast trip |
| Personal Finance | V1 | Category bug fixed, import working | Batch categorization via Mylane |
| Playmaker | ~98/100 | Invite flow bulletproof | Coach Rick, Randy league |

## Current Blockers

- Base44 publish blocker (request ID 95a004a0) — blocks getMyLaneProfiles server function
- Professional legal review (~$100) — needed before formal launch
- Mylane copilot not yet wired into MyLane.jsx (only exists in BusinessDashboard)

## Upcoming Priorities

1. Meal Prep workspace Phase 1 — Base44 entity creation (MealPrepProfile, Recipe, RecipeIngredient) via agent prompt, then Hyphae build (Recipe Book)
2. Mushroom artwork landing page
3. Wire Mylane copilot into MyLane.jsx (Mylane Beta toggle)
4. Query optimization (DEC-130) when publish unblocks
5. Coach Rick invite retry
6. Call Randy — demo + scheduling workflow
7. Coast trip (North Bend + seed spreading)

## Key Economics

- Free discovery (costs us nothing)
- Free with account: full Mylane surface, manual mode
- Mylane Beta: free during beta, $9 when live
- $18 Personal Assistant (agent writes on your behalf)
- Workspace costs: $9 for revenue tools (Field Service, PM, Business), free for life tools (Team, Finance)
- Dynamic gauge shows value delivered, not cost incurred
- 100 users at estimated mix = sustainable against $50-100 Base44 cost
- Query optimization drops page load from ~17 to ~5 credits (DEC-130)

## Key Context for Next Session

- Networks (Recess, Harvest) are dark — private, invite-only, not in nav
- Frequency Station and Shaping the Garden are Mylane cards, not nav destinations
- Onboarding wizard replaced — inline welcome in MyLane.jsx
- Four-layer gardener model: User, Curator, Community, Master Gardeners
- Property Pulse active job: North Bend duplex, paid from rent
- lanecountyrecess.com domain renews April 23, 2026
- Traffic ticket ~$520 due ~4/7
- Custody trial 5/19/2026
- Second audit: Footer newsletter check (imperative .list()) still needs server function fix
- Second audit: SpokeDetails.jsx left in place — verify Spoke entity status in Base44 before deleting
- Landing page v2: mushroom artwork ready, technical plan complete, build prompt ready
