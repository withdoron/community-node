# Phase 3 Build B — Diagnostic

**Date:** 2026-04-24
**Scope:** Why is Red Umbrella's public profile rendering with empty description, no services, and no categories?
**Outcome:** Root cause identified. Fix path A+C (narrow). Not a render bug. Awaiting Doron confirmation before executing fix commits.

---

## Q1: Where does the public profile render from, and what field populates each UI element?

Component: [`src/pages/BusinessProfile.jsx`](../src/pages/BusinessProfile.jsx). Every field is read from the `Business` entity. No `FieldServiceProfile` reads. No dual-source fallbacks. Mapping:

| UI element | Source | Fallback |
|---|---|---|
| Hero banner | `business.banner_url` → `business.photos[0]` → `business.logo_url` | category-accent name-card |
| Category badge | `getCategoryDisplayLabel(business, …)` resolved from `main_category`, `subcategory`, `primary_category`, `sub_category_id`, or legacy `category` | empty string |
| Business name (h1) | `business.name` | none |
| Subtitle line under name | `business.subcategory?.trim()` | hidden |
| **Tagline** | **NOT RENDERED AT ALL** | — (gap, see Risks) |
| TrustSignal (line under subtitle) | derived from `recommendation_count`, `story_count`, `vouch_count` | **"New to LocalLane"** when `recommendation_count === 0` |
| Location block | `Location` entity (`business_id` join) → `business.address`/`business.city` | hidden if neither |
| Description paragraph | `business.description` | **"No description available."** |
| Serves (service area) | `business.service_area?.trim()` | hidden |
| Services-offered paragraph | `business.services_offered?.trim()` | hidden |
| Product tags | `business.product_tags[]` | hidden |
| Payment methods + notes | `business.payment_methods[]` + `business.payment_notes` | hidden |
| Services tab | `business.services[]` (structured) → else `business.services_offered` text → else empty state | **"No services listed yet"** |
| Photos tab | `business.photos[]` | "No photos available" |
| Contact sidebar | `business.phone`/`email`/`website`/`business_hours`/`instagram`/`facebook`/`shop_url` | each hidden if empty |
| Locations sidebar | `Location` entity | hidden |
| Upcoming events | `Event` entity (`business_id` join) | hidden |
| Recommendations tab | `Recommendation` entity | empty states |

**"New to LocalLane"** is TrustSignal's dignified empty state for zero-recommendation businesses — the string is at `TrustSignal.jsx:11`. This is correct rendering for a new business. Doron's observation that it appeared "where we'd expect a tagline" is a visual-placement misinterpretation, not a bug.

## Q2: What's actually in Red Umbrella's data?

Red Umbrella (`69ea5590481b7e15af7216b6`) was created via `migrationHelpers.create_business_from_fs_profile` during Phase 2 ([phase-2-production-migration.js:179](../src/scripts/migrations/phase-2-production-migration.js)). That function's `businessFields` body ([migrationHelpers/entry.ts:172-187](../base44/functions/migrationHelpers/entry.ts)) writes exactly this shape:

```js
{
  name: profile.business_name ?? profile.workspace_name ?? 'Unnamed Business',
  owner_user_id: profile.user_id,
  owner_email: profile.email ?? profile.created_by,
  email: profile.email ?? profile.created_by,
  phone: profile.phone ?? '',
  website: profile.website ?? '',
  tagline: profile.tagline ?? '',
  logo_url: profile.logo_url ?? '',
  brand_color: profile.brand_color ?? '',
  listed_in_directory: true,
  subscription_tier: null,
  is_active: true,
  parent_business_id: parentBusinessId,
  ...overrides,
}
```

**Nine content fields pulled from `FieldServiceProfile` → `Business`. Everything else on the Business entity was never written.**

So Red Umbrella today has:
- **Populated** (from migration): `name`, `owner_user_id`, `owner_email`, `email`, `phone`, `website`, `tagline` = `"Home and Garage Contractors"`, `logo_url`, `brand_color`, `listed_in_directory: true`, `subscription_tier: null`, `is_active: true`, `parent_business_id: null`.
- **Empty or unset** (never written): `description`, `services[]`, `services_offered`, `main_category`, `subcategory`, `subcategories[]`, `sub_category_id`, `primary_category`, `category`, `archetype`, `address`, `city`, `state`, `zip_code`, `business_hours`, `service_area`, `banner_url`, `photos[]`, `instagram`, `facebook`, `shop_url`, `product_tags[]`, `payment_methods[]`, `payment_notes`, `accepts_joy_coins`, `accepts_silver`, `network_ids[]`, `recommendation_count`.

The render is doing exactly what the render should do: showing populated fields, hiding empty optional fields, and showing dignified empty states for the "Services" tab and description paragraph. **There is no data to render — because no data has ever been entered for these fields.**

## Q3: Why do Spetzler / NH / Recess render richly?

Businesses that predate Phase 2 were created via **`BusinessOnboarding.jsx`** (the original wizard). That flow writes via `base44.entities.Business.create({...payload, …})` with the user's own answers to a category/description/services wizard ([BusinessOnboarding.jsx:95-112](../src/pages/BusinessOnboarding.jsx)). The `payload` shape includes all the directory-profile fields: `description`, `category`, `services_offered`, `subcategory`, etc. — structured from the wizard's form state ([line 134-145](../src/pages/BusinessOnboarding.jsx) explicitly manages a `formData.services` array with `{name, starting_price, description}`).

So Spetzler, NH, Recess, Danny Sikes, and the Doron-owned brands (LocalLane, TCA) created pre-Phase-2 have content because a human walked the onboarding wizard. Red Umbrella has empty directory fields because the migration path bypassed onboarding entirely — it pulled the minimum needed to link Bari's FS tool to a parent entity and stopped there.

Mycelia, LLC (created in Phase 2 via `create_business` action, not `create_business_from_fs_profile`) also has sparse content — but it's `listed_in_directory: false` by design, so nobody sees the emptiness.

## Q4: If content lived on FSProfile, why wasn't it migrated?

**It didn't live on FSProfile.** Inspecting [`FieldServiceProfile.jsonc`](../base44/entities/FieldServiceProfile.jsonc): the entity holds operational workspace config (workers, hourly_rate, industry_preset, feature flags, trade_categories_json, default_terms, invite_code) plus minimal business identity (business_name, owner_name, license_number, phone, email, website, tagline, logo_url, brand_color, service_area). It **does not** have `description`, `services[]`, `services_offered`, `category`, `subcategory`, `subcategories[]`, `archetype`, `address`, `city`, `state`, `zip_code`, `business_hours`, `banner_url`, `photos[]`, `instagram`, `facebook`, `shop_url`, `product_tags[]`, `payment_methods[]`, `accepts_joy_coins`, `accepts_silver`, or `network_ids[]`.

FieldServiceProfile is a **tool profile**, not a directory profile. The business-directory content for Red Umbrella was never anywhere — not on FSProfile, not on Business. Bari has been using his FS workspace operationally (clients, estimates, documents) without ever having walked through a directory-onboarding flow. His public face on LocalLane has simply never been authored.

**Migration has one real miss, though:** FSProfile has `service_area: string` and Business has `service_area: string`, and `create_business_from_fs_profile` did not carry it forward. That's the single content field that existed on Bari's FSProfile and is missing from his Business. Everything else is an origination gap, not a migration gap.

---

## Root cause

**No data was ever authored for Red Umbrella's directory profile.** The render is correct. The entity is correct. The migration was correct for what it was scoped to do — link FS tool to a Business record for the multi-business architecture. It was not scoped to populate a directory profile from scratch.

The bug is structural: businesses created via the migration path skip the onboarding wizard that writes directory content, and no equivalent flow exists afterward. The BusinessSettings page ([`src/components/dashboard/BusinessSettings.jsx`](../src/components/dashboard/BusinessSettings.jsx)) already has edit fields for most of the missing content (description, categories, address, contact, business_hours, services_offered, product_tags, payment_methods, shop_url, service_area, instagram, facebook) behind an "Edit Profile" button, and its save path goes through `updateBusiness/update_profile` which already allows these fields.

So the fix is not "build missing UX" — it's "close the gaps in existing UX + give migrated businesses a way to catch up."

---

## Proposed fix path: A-minor + C-extension

### Path A-minor (one content backfill)

Copy `FieldServiceProfile.service_area` → `Business.service_area` for any Business where:
- `business.service_area` is empty AND
- there is a linked FSProfile with non-empty `service_area` whose `business_id === business.id`.

Idempotent. Never overwrites existing content. Written as a new Base44 agent prompt per DEC-093, applied via a one-shot Node script following Phase 2's migration pattern. Affects Red Umbrella only in current data.

### Path C-extension (close the BusinessSettings gaps)

BusinessSettings today edits: `name`, `description`, `primary_category`/`main_category`/`sub_category`/`sub_category_id`/`subcategory`, `business_hours`, `email`, `phone`, `website`, `instagram`, `facebook`, `video_url`, `address`, `city`, `state`, `zip_code`, `display_full_address`, `service_area`, `services_offered`, `shop_url`, `product_tags[]`, `payment_methods[]`, `payment_notes`. Plus upload mutations for `logo_url` and `banner_url`.

**Missing from BusinessSettings** (but rendered by BusinessProfile):
- `services[]` — structured array of `{name, description, starting_price}`. BusinessOnboarding already has UI for this at [BusinessOnboarding.jsx:134-145](../src/pages/BusinessOnboarding.jsx); the pattern can be lifted into Settings. Not in `PROFILE_ALLOWLIST` today either — needs to be added for saves to succeed.
- `photos[]` — photo gallery (multi-file upload). Pattern exists in logo/banner upload mutations; extending to an array is straightforward.
- `tagline` — single-line string. BusinessProfile doesn't even render this today (see Risks #1), but Settings editing it is still worth adding since Mycelia, LocalLane, and Red Umbrella all have tagline populated from the Phase 2 migration.
- `accepts_joy_coins` / `accepts_silver` toggles — already in `PROFILE_ALLOWLIST`. Just need UI.

**Plus one UX hint**: in BusinessSettings, when the current business has a largely-empty directory profile (`description`, `services_offered`, and `main_category` all empty), surface an empty-state nudge like "Your public profile is missing content. Fill in the sections below so people can find you." Only shown to owner. Dismissible or auto-hides once content is filled.

No render changes. No new server function. Additions to `PROFILE_ALLOWLIST` in `updateBusiness/entry.ts` for `services` and `photos` (already has `product_tags`, `payment_methods`, so the array-field pattern is established).

### Why not B?

Nothing to rewire. The profile reads from Business consistently; Business is the correct source of truth per DEC-155. FSProfile doesn't hold this content and shouldn't — the two entities have distinct concerns (tool workspace vs. directory identity). Teaching the profile to dual-read from FSProfile would create the exact "stone vs feet" problem DEC-146 warns against.

### Why not a bigger A (full backfill)?

Because there's no content to backfill. `service_area` is the only overlap. Every other empty field on Red Umbrella is empty everywhere. Writing a backfill that guesses values (e.g., deriving `archetype` from FSProfile's `industry_preset`) is authoring content on Bari's behalf without his input — that's wrong. He should author his own directory profile.

---

## Risks

1. **Tagline is rendered nowhere on the public profile today.** `business.tagline` is populated on Red Umbrella ("Home and Garage Contractors"), Mycelia ("Holding company for the LocalLane ecosystem"), LocalLane ("The garden."), TCA ("Curriculum, study, and depth of practice.") — but `BusinessProfile.jsx` has no `{business.tagline}` reference. The field is getting migrated forward and saved but never displayed. Worth rendering as the subtitle line when `business.subcategory` is empty (fallback ladder: subcategory → tagline → hidden), independent of this build's scope.

2. **Bari's FieldServiceProfile `service_area` value is unknown from here.** The Phase 2 migration output doesn't log it; Base44 entity fetches from the preview env are unauthenticated and return empty (preview limitation documented in DEC-167). The backfill script's dry-run should print whether the source field is actually non-empty before `--apply`.

3. **"New to LocalLane" text placement invites confusion.** It appears where a user's eye expects a tagline or short descriptor. If tagline starts rendering (per Risk #1), the TrustSignal empty state probably wants repositioning or deemphasis — otherwise both strings will compete for the same visual slot.

4. **Admin Impersonation is the real unlock for tomorrow's meeting.** Seedlings logged in private/SEEDLING-TRACKER.md during Bari-prep called this out twice. Without it, Doron cannot fill in Red Umbrella's profile on Bari's behalf before they meet — he can only walk Bari through Settings together at the meeting. Path C-extension shortens that walk but doesn't remove it.

5. **The migration-path origination gap will recur.** Any future business created via `create_business` or `create_business_from_fs_profile` (e.g., when another contractor like Peter joins) will hit the same empty-profile state. Path C-extension solves the UX; a post-migration "finish your profile" welcome card (Phase 4.5 or later) would solve the surfacing.

6. **`services` structured array vs. `services_offered` text.** The profile renders `services[]` preferentially, falling back to `services_offered`. If Path C adds both editors, we need a UI decision: are these two ways of expressing the same content, or two different things? BusinessOnboarding treats them as distinct (services = priced offerings, services_offered = freeform bullet list). Worth confirming with Doron before duplicating.

---

## Questions for Doron

1. **Confirm fix path A-minor + C-extension.** The alternative — "leave content-editing to Phase 4 folder architecture when BusinessSettings moves into its own Settings space" — is also defensible; it stalls Red Umbrella's public profile but avoids Round 1 scope creep.

2. **Decide services[] vs. services_offered.** Should Settings edit both independently, only one, or merge them into a single canonical field? (If merged, which direction — promote `services[]` everywhere and migrate `services_offered` forward, or vice versa?)

3. **Tagline rendering (Risk #1).** Add `business.tagline` to BusinessProfile's subtitle ladder as part of this build, or leave it for Phase 4's Profile-space redesign?

4. **Admin Impersonation for tomorrow.** Is walking Bari through Settings at the meeting acceptable, or do we need a last-mile option (e.g., Doron dictates to Bari over the phone tonight and Bari types in, or Doron collects Bari's content and Hyphae writes a one-off Red-Umbrella-specific script)?

5. **Empty-state nudge copy.** Suggested: "Your public profile is missing content. Fill in the sections below so neighbors can find you." — or something warmer. Doron's call.

---

## Ship

**Diagnostic commit only this turn.** Contents:
- This file at [`community-node/docs/build-b-diagnostic.md`](.).

No code touched. No fix attempted. Awaiting Doron's answer to questions 1-5 before any further commits.

This file is ephemeral — it gets deleted in the fix's cleanup commit per the prompt.
