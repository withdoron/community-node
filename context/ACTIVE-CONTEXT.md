# ACTIVE-CONTEXT.md

> What's happening RIGHT NOW. This file gets overwritten each session, not appended.
> Last updated: 2026-04-01 (session end)

## Current Focus

Meal Prep Phase 1 (Recipe Book) shipped and construction-gated. MCP confirmed working from Claude mobile. Architecture questions raised — broad vision audit needed before more detail work. App is public but space layering needs clarity.

## Active Nodes

| Node | Status | What Just Shipped | What's Next |
|------|--------|-------------------|-------------|
| Community Node | Production, 22 users | Meal Prep P1, repo cleanup, MCP mobile confirmed, door buttons for existing users | Broad vision audit, space architecture clarity |
| Meal Prep | Phase 1 built (gated) | 3 entities, onboarding, recipe book, MyLane card, server functions, drill-through fix | Gold Standard audit, walkthrough, flip gate |
| Contractor Daily | Build 17, stable | N/A | Dan Sikes field testing |
| Property Pulse | Activated | N/A | North Bend coast trip |
| Personal Finance | V1 | Category bug fixed | Batch categorization via Mylane |
| Playmaker | ~98/100 | Invite flow bulletproof | Coach Rick, Randy league |

## Current Blockers

- Base44 publish needed — deploys getMyLaneProfiles server function with MealPrepProfile
- agentScopedQuery update needed in Base44 dashboard (add meal-prep workspace)
- Professional legal review (~$100) — needed before formal launch

## Architecture Questions Open (NOT decided)

These were raised this session and need gardener discussion before more building:
- Do Field Service and Property Pulse sit inside the Business space?
- Is the Business space the pricing gate container for revenue workspaces?
- How do events flow across spaces? (cross-cutting service vs. per-space modules)
- Where does the event creation module live architecturally?
- Where is Recess as a user-facing space?
- BusinessDashboard full retirement timeline
- Broad vision audit needed before detail work — app is public but not flowing well

## Upcoming Priorities

1. Broad vision audit — get space architecture right before more detail work
2. Hyphae opinion on space layering, event flow, BusinessDashboard retirement
3. Doron: publish Base44, update agentScopedQuery, walkthrough Meal Prep
4. Meal Prep Gold Standard polish pass + flip construction gate
5. Mushroom artwork landing page
6. Coach Rick invite retry
7. Call Randy — demo + scheduling workflow

## Key Context for Next Session

- Meal Prep workspace key: meal_prep (underscore) in workspaceTypes, meal-prep (hyphen) in agentScopedWrite
- Supplementary MealPrepProfile query in MyLane.jsx (workaround until server function publish)
- BusinessDashboard does NOT render meal_prep — only works through MyLane drill view
- Warm entry backfill done for FS + PM (were missing)
- Repo paths confirmed: Spec-Repo/ (capitals), private/ (lowercase), locallane-spec-repo deleted
- locallane-mcp has no git remote — needs adding
- Safeway weekly flyer analyzed for meal prep concept validation
- Food inflation and Iran war supply chain research completed
- lanecountyrecess.com domain renews April 23, 2026
- Traffic ticket ~$520 due ~4/7
- Custody trial 5/19/2026
