# BUILD-PROTOCOL.md

> The 16-phase build sequence (Phases 0-15). Don't skip phases.

---

## Quick Reference Card

```
 0. Decision Filter    -> Should we build this?
 1. Plan               -> What and why?
 2. Scheme             -> Data model and state (Base44 agent prompt for entities)
 3. Surface Mapping    -> Where does it show up? (Admin surface mandatory)
 4. UI/UX Design       -> What does it look/feel like?
 5. Pre-Build Audit    -> What exists? What can we reuse?
 6. Security           -> Who can see/do what?
 7. Build              -> Implementation
 8. Construction Gate  -> Ship behind guard until walkthrough passes
 9. Tier Gating        -> Different behavior per tier?
10. Polish             -> Edge cases, mobile, dark theme
11. Post-Build Audit   -> Does reality match the plan?
12. Documentation      -> Update the system of record
13. Legal Check        -> Terms/Privacy affected?
14. Organism Signal    -> Data for the creature?
15. Space Agent        -> Does this space need its own intelligence?
```

---

## Phase 0: Decision Filter

Before suggesting or building anything, ask three questions:
1. Does this help a real person right now?
2. Does this make the Organism more alive?
3. Does this move money closer to flowing?

If none: defer unless Doron specifically asks.

## Phase 1: Plan

What are we building and why? One sentence for the what, one for the why. If you can't articulate both clearly, the feature isn't ready.

## Phase 2: Scheme

Data model and state design. In Base44 world: what entities need to exist, what fields do they need, what are the relationships? Entity changes go through Base44 agent prompts (DEC-093), not manual dashboard.

## Phase 3: Surface Mapping

Where does this feature show up in the UI? Every user-facing feature MUST have a corresponding admin surface (DEC-092) — even if it's read-only stats. The gardener needs to see what's happening.

## Phase 4: UI/UX Design

What does it look and feel like? Gold Standard dark theme. Mobile-first. 44px touch targets. Follow existing component patterns.

## Phase 5: Pre-Build Audit

What exists that we can reuse? Check for existing components, hooks, patterns. Don't rebuild what's already there.

## Phase 6: Security

Who can see what? Who can do what? Entity permissions, role checks, admin guards. Admin email: doron.bsg@gmail.com.

## Phase 7: Build

Implementation. Data layer first, then components, then surfaces. Commit to main.

## Phase 8: Construction Gate (DEC-092)

Ship behind `{false && <Component />}` until the feature passes a walkthrough with Doron. The gate is one line to remove. This is not optional — every new feature ships gated.

## Phase 9: Tier Gating (DEC-101)

Does this feature behave differently per tier? Current pricing model:

- **Community spaces** (Playmaker, Frequency Station): no cost. Agent included.
- **Business spaces** (Field Service, Finance, Property Pulse, Harvest vendor): $9/month. First month includes full superagent.
- **Superagent tier** (after month 1): $18/month full agent partner, or $9 help-mode only.
- **Recess**: $45/month Community Pass membership.

Language rules: Never say "free." Never say "trial." Never say "upgrade" — say "keep your assistant." Never lead with price.

If the feature is tier-gated, implement the locked state for lower tiers using `useOrganization()` hook.

## Phase 10: Polish

Edge cases, mobile responsiveness, dark theme compliance, loading/empty/error states. Test at 375px width.

## Phase 11: Post-Build Audit

Does reality match the plan? Walk through the feature in the browser. Check console for errors. Verify all status flows work.

## Phase 12: Documentation

Update CLAUDE.md, ACTIVE-CONTEXT.md, SESSION-LOG.md, DECISIONS.md. If entity changes were made, document them.

## Phase 13: Legal Check

Do the Terms of Service or Privacy Policy need updating? Does this feature handle PII, payments, or legally binding actions (e-signatures)?

## Phase 14: Organism Signal

Does this feature generate data for the Organism? What pulse signals does it create? What vitality does it reflect?

## Phase 15: Space Agent (DEC-094, DEC-103)

Does this space need its own intelligence? Every space in the garden has a Superagent — an AI assistant that reads the space's entity data, answers user questions, searches the directory, looks up external information, and collects feedback. Reference SUPERAGENT-SPEC.md (private repo) for full birth protocol.

### Birth Protocol

1. **WHY first** — Write a WHY document (SUPERAGENT-SPEC.md Section 3). What is this agent's purpose in the organism?
2. **Create Base44 agent** — Description, instructions (with organism identity), tools (entity CRUD), memory (Global + Per User), welcome message.
3. **Wire into workspace UI** — `<AgentChatButton agentName="[Name]Agent" userId={currentUser?.id} />` in the workspace's JSX.
4. **Update agent-active event** — Add the workspace's state variable to the `agentActive` check in BusinessDashboard.jsx (or dispatch from the page component for non-dashboard pages like Admin).
5. **Test** — Button appears, chat opens, subtitle reads correctly, feedback button hides.

### Ongoing Maintenance

**When any entity, field, or feature changes in a space that has a superagent, update the agent's instructions to reflect the change. The agent must know its own garden.** (DEC-103)

### Reference

- Agent naming: `[SpaceName]Agent` (e.g., FieldServiceAgent, PlaymakerAgent)
- Agent UI: AgentChat + AgentChatButton with `agentName` prop (reusable)
- Feedback: ServiceFeedback entity (shared across all agents, Create permission)
- Dynamic subtitle: AgentChat.jsx derives subtitle from agentName automatically
- Five agents live as of 2026-03-29: FieldService, Playmaker, Admin, Finance, PropertyPulse

Output: Base44 agent config, entity access list, UI integration, agent-active event update.

---
