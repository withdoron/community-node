# Add Fields to Entity: TeamEvent

Please add the following two fields to the existing **TeamEvent** entity.

## Entity Name

**TeamEvent** (already exists — do NOT create a new entity)

## New Fields to Add

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| rsvps | Text | No | A JSON string storing RSVP responses from team members. Format: `{"member_user_id": "yes"}` where values are "yes", "no", or "maybe". Used to track who is attending each event. Stored as text because Base44 does not have a native JSON field type. |
| duties | Text | No | A JSON string storing duty assignments for the event. Format: `[{"type": "snack", "member_id": "xxx", "family_name": "Johnson", "custom_label": ""}]`. Duty types include: snack, water, setup, cleanup, and custom. Stored as text because Base44 does not have a native JSON field type. |

## Important

- Do NOT change any existing fields on TeamEvent
- Do NOT change any existing permissions on TeamEvent
- Only ADD these two new Text fields
- Both fields are optional (not required)

## Confirmation

After adding the fields, please confirm by listing the two new fields with their names and types.
