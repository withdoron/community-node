# Add Field to Entity: Business

Please add the following field to the existing **Business** entity.

## Context

Phase 4.2-tiles-5 introduces a separate "document logo" for businesses — used on estimates, invoices, contracts, and other documents sent to clients. This is intentionally separate from the existing `logo_url` field, which is the directory-facing logo (shown on tiles, search results, public profile). Owners can independently update either logo via the new Settings space surface.

The existing `logo_url` field stays untouched — it remains the source of truth for directory presentation. The new `document_logo_url` is optional. If unset, document-rendering surfaces fall back to `logo_url` for display, so existing owners aren't blank when they first see the new field.

## Entity Name

**Business** (already exists — do NOT create a new entity)

## New Field to Add

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| document_logo_url | Text (URL) | No | URL of the logo to render on documents (estimates, invoices, contracts, signed agreements). Optional. Falls back to `logo_url` when empty. Set independently of `logo_url` because directory presentation and document rendering have different optimal crops/resolutions. |

## Important

- Do NOT change any existing fields on Business (especially do NOT touch `logo_url`)
- Do NOT change any existing permissions on Business
- Only ADD this one new Text field
- Field is optional (not required)
- The companion code change in `base44/functions/updateBusiness/entry.ts` adds `document_logo_url` to PROFILE_ALLOWLIST so the new field can be written through the existing owner write path

## Confirmation

After adding the field, please confirm by listing the new field with its name and type.
