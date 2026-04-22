# Phase 1 Schema Foundation — Round 1 Business Foundation

> Purpose: Add fields to existing entities and create a new `AuditLog` entity so that Phase 2+ reparenting, business switcher, and the Desk rename can build on a clean schema.
> All new fields are **nullable** or have **safe defaults**. Nothing breaks existing records. No UI reads these fields yet.
> Per DEC-093, this prompt is the source of truth — please make the changes exactly as specified and nothing else.
> **Please stay in discussion mode until every section below is confirmed (extends DEC-144).** Ask if anything is unclear before making changes.

---

## Scope of this prompt

This prompt requests:
1. Add 10 fields + 2 archive fields to the **Business** entity.
2. Add 6 fields to the **User** entity.
3. Add `business_id` (plus 2 archive fields on FieldServiceProfile only) to the **FieldService** entity family (10 entities).
4. Create a new **AuditLog** entity.

Do not rename, remove, or change the type of any existing field. Do not change permissions on existing fields. Do not delete any records.

---

## 1. Business entity — add 10 new fields

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| legal_name | Text | No | — | Legal entity name (e.g. "Mycelia, LLC"). Distinct from the brand display name. |
| display_name | Text | No | — | Public-facing brand display name. If null, UI falls back to existing `name` field. |
| listed_in_directory | Boolean | No | `true` | Whether this business appears in the public directory. Separates directory visibility from `is_active` (which currently conflates delete + hide). Hidden businesses still exist and operate; they just aren't discoverable. |
| brand_color | Text | No | — | Hex color for brand (e.g. "#f59e0b"). Used on tiles, banners, buttons inside this business's spaces. |
| logo_url | Text | No | — | URL of the business's brand logo. Separate from `banner_url` and `photos`. |
| tagline | Text | No | — | Short brand tagline shown on tiles and the directory listing. |
| location_precision | Text (enum) | No | `"exact"` | Location privacy control. Allowed values: `exact`, `neighborhood`, `general_area`. Used by micro-producers who don't want their home address shown. |
| parent_business_id | Text | No | — | FK to another Business record. When set, this business is nested under a parent (holding-company or brand-under-brand relationship). One level of nesting supported in Round 1. |
| archived_at | Text (datetime ISO string) | No | — | Soft-archive timestamp. If set, this business is archived and should not appear in normal queries even when `is_active: true`. |
| archived_by | Text | No | — | User ID (or email) of the user who archived the business. |

Notes:
- These fields are **additive only**. Existing fields (`name`, `is_active`, `subscription_tier`, etc.) stay untouched.
- If Base44 does not support arbitrary enum field types, `location_precision` may be created as plain Text with the allowed values documented here. Validation is handled in application code.

---

## 2. User entity — add 6 new fields

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| bio | Text (long) | No | — | Freeform user bio. Reserved for future public user pages (Round 2). |
| latitude | Number | No | — | Geocoded latitude. Reserved for future user location features. |
| longitude | Number | No | — | Geocoded longitude. Reserved for future user location features. |
| page_public_toggle | Boolean | No | `false` | Controls whether this user's personal page is public. Default private. Reserved for Round 2. |
| geocoded_at | Text (datetime ISO string) | No | — | ISO datetime of last geocode for this user's lat/lng. |
| active_member | Boolean | No | `false` | Membership flag for the $9/month per-user entity fee (DEC/Round 1). Phase 5 will read this to gate certain actions. Phase 1 just creates the field; no UI reads it yet. |

Notes:
- User permissions stay as-is. Do not change existing User field permissions.
- If `bio` cannot be stored as long-text in your schema, Text is acceptable — application code will handle length.

---

## 3. FieldService family — add `business_id` to ALL 10 entities

Add the following single field to **each** of these 10 entities:

- FieldServiceProfile
- FSClient
- FSProject
- FSEstimate
- FSDocument
- FSPermit
- FSDailyLog
- FSMaterialEntry
- FSLaborEntry
- FSPayment

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| business_id | Text | No | — | FK to a Business record. Scopes this record to a specific business inside the new multi-business architecture. Will be backfilled from each FS profile's owner's businesses in a separate Hyphae script. Code continues to work with `business_id: null` (dual-read pattern during backfill). |

Notes:
- Do NOT remove the existing `linked_business_workspace_id` field on FieldServiceProfile. It coexists with `business_id` during migration. Deprecation is a later cleanup.
- Permissions on `business_id` should follow the existing read/write permissions on the parent entity (same as any other scalar field on that entity).

### Additionally, add archive fields to FieldServiceProfile (ONLY on this entity in the FS family)

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| archived_at | Text (datetime ISO string) | No | — | Soft-archive timestamp for FS profiles. |
| archived_by | Text | No | — | User ID / email of the archiver. |

The 9 other FS child entities do **not** need `archived_at` / `archived_by` in Phase 1 — child entity archival is derived from their parent profile's archive state.

---

## 4. Create NEW entity — AuditLog

Please create a new entity called **AuditLog**.

### Description

Append-only log of entity mutations performed by migrations, admin actions, reparenting, and backfills. Every future schema-changing or cross-entity operation writes an AuditLog entry before and after the mutation. Used for retrospective debugging and rollback reference.

### Fields

| Field Name | Type | Required | Default | Description |
|---|---|---|---|---|
| entity_type | Text | Yes | — | Name of the affected entity (e.g., "Business", "FieldServiceProfile", "FSClient"). |
| entity_id | Text | Yes | — | Primary ID of the affected record. |
| action | Text (enum) | Yes | — | The type of action performed. Allowed values: `create`, `update`, `delete`, `archive`, `reparent`, `backfill`, `migration`. If Base44 doesn't enforce enums, store as plain Text. |
| old_value | Text (JSON string) | No | — | JSON-stringified prior state of the record (or the affected subset of fields). Null for `create` actions. |
| new_value | Text (JSON string) | No | — | JSON-stringified new state of the record (or the affected subset of fields). Null for `delete` actions. |
| user_id | Text | Yes | — | User ID of the person or service role that triggered the action. For server-driven actions, use the acting admin's user ID (server-authoritative, per DEC-139). |
| source | Text | Yes | — | Which system wrote this entry. Allowed values (free-text, not enforced): `manual`, `migration`, `reparent_function`, `backfill_script`, `admin_ui`, `agent_write`. |
| timestamp | Text (datetime ISO string) | Yes | auto-set to now | When the action occurred. If Base44 auto-sets `created_date` on every record, this field can be a duplicate of that — please set it to default to the record's creation time. |

Note: `created_date` is auto-added by Base44 and is sufficient for most timestamp needs. `timestamp` is retained in the field list for compatibility with migration scripts that set it explicitly.

### Permissions

| Operation | Permission Level | Reason |
|---|---|---|
| **Create** | Authenticated Users | Any authenticated user (including server functions acting on behalf of users) can write audit entries for actions they perform. Integrity is enforced at the server-function level (DEC-139), not at the entity level. |
| **Read** | Admin Only | Audit log contents can include sensitive data (old/new field values). Only admin users (and server functions via `asServiceRole`) should read. |
| **Update** | Admin Only | Audit entries should almost never be edited. Admin-only keeps the door closed by default. |
| **Delete** | Admin Only | Same reasoning. Audit entries should be append-only in practice; admin is the fallback for true mistakes. |

If "Admin Only" is not a selectable permission tier in Base44, the closest equivalent (e.g., a specific admin-restricted role) is acceptable. Please confirm the exact permission setting used in your confirmation.

---

## Confirmation checklist

After the changes are applied, please confirm by listing:

1. The 10 new fields on **Business** (name + type) + the 2 archive fields.
2. The 6 new fields on **User**.
3. `business_id` added to each of the 10 FS entities (confirm entity-by-entity that the field was added).
4. `archived_at` and `archived_by` added to FieldServiceProfile.
5. The AuditLog entity created with all 8 fields and the 4 permission settings.
6. Any field where you deviated from the spec (e.g., used Text instead of an enum). State what and why.

---

## Things to NOT do

- Do NOT change any existing field's name, type, or required status.
- Do NOT modify any existing field's permissions.
- Do NOT delete or archive any records.
- Do NOT remove the legacy `linked_business_workspace_id` field on FieldServiceProfile — it coexists during migration.
- Do NOT remove the legacy `subscription_tier` field on Business — it is deprecated (DEC-115 clean deprecation) but stays for later cleanup.
- Do NOT set any default other than what is specified above (especially: do not set `business_id` defaults).

---

*Phase 1 ends here. The `business_id` backfill, `reparentBusiness()` function, and Mycelia/LocalLane/TCA/Consulting record creation are Phase 2 work — do not create those records in this prompt.*
