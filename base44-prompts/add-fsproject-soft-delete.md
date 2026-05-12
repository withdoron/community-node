# Add Soft-Delete + Unassigned Sentinel Fields to Entity: FSProject

Please add three fields to the existing **FSProject** entity.

## Context

IF-008 (Project deletion with dependents) — see `Spec-Repo/spaces/migration/MIGRATION-IN-FLIGHT.md`. Today FSProject is hard-delete only: clicking Delete calls `base44.entities.FSProject.delete(id)` and the row vanishes, leaving every dependent record (FSPayment, FSDailyLog, FSEstimate, FSChangeOrder, FSMaterialEntry, FSLaborEntry, FSDocument, FSPermit, FSDailyPhoto, Engagement) referencing a project that no longer exists. The Home tab still surfaces those orphans because workspace-scoped queries don't join FSProject existence.

Session 1 of the IF-008 build adds:
1. **`deleted_at` + `deleted_by`** — FSProject gains its own soft-delete fields, matching the pattern dependents already carry (Phase 1.0 commit 1). When the cascade runs, the parent project is soft-deleted (last operation), not hard-deleted.
2. **`is_unassigned`** — flags a per-workspace sentinel project that holds orphans from deletes the user chose to "proceed anyway." The sentinel is created lazily on first need by `softDeleteProjectWithCascade()` with `is_unassigned: true`. UI surfaces filter `is_unassigned: true` rows out of normal project pickers (Session 2 enforces the sweep across consumer surfaces).

The new architecture lets `softDeleteProjectWithCascade(projectId, mode, options)` operate in three modes (`delete` / `reassign` / `unassigned`). All three soft-delete the parent project; only `delete` mode also soft-deletes the dependents. `reassign` and `unassigned` re-parent dependents to a target project or the sentinel respectively.

## Entity Name

**FSProject** (already exists — do NOT create a new entity)

## New Fields to Add

| Field Name | Type | Required | Default | Description |
|------------|------|----------|---------|-------------|
| deleted_at | Date/Datetime | No | (null) | Nullable datetime. Stamps when the project was soft-deleted via the `softDeleteProjectWithCascade` cascade. Null means the record is live. Excluded from default reads via client-side `excludeDeleted()` filter, matching the convention established for FSPayment / FSDailyLog / FSMaterialEntry / FSLaborEntry in Phase 1.0 commit 1. |
| deleted_by | Text (string) | No | (null) | Nullable. User ID (Users.id) of the user who soft-deleted the project. Captured for audit trail. Mirrors the FSPayment.deleted_by shape. |
| is_unassigned | Boolean | No | false | Flags the per-workspace Unassigned sentinel project. Exactly one row per workspace carries `is_unassigned: true`; the cascade creates it lazily on first need. The sentinel holds orphaned dependents from "proceed anyway" deletes. Project pickers and normal list views filter these rows OUT so they don't pollute regular project selection. |

## Important

- Do NOT change any existing fields on FSProject (no edits to `name`, `status`, `client_id`, `original_budget`, `total_budget`, etc.)
- Do NOT change any existing permissions on FSProject (`security.update` stays as is; existing `rls.create` + `rls.delete` stay as is — there is no `rls.update` key today and one must NOT be added per DEC-215)
- Only ADD these three fields
- All three fields are optional (not required)
- The companion code change at `src/utils/softDeleteProjectWithCascade.js` reads/writes these fields; it will fail at runtime if the fields don't exist yet

## Publish + Sequencing

After adding the fields, **publish the app** so the new schema goes live. The companion code in this session's commit will fail at runtime against FSProject if the fields aren't published — soft-delete on the parent project, sentinel creation, and the cleanup of existing orphans all depend on these fields existing in the Base44 schema. Run this prompt BEFORE pulling the code commit from `main`.

## Confirmation

After adding the fields, please confirm by listing the three new fields with their names, types, and defaults — plus confirm that `rls.update` is still absent from the FSProject `rls` block.
