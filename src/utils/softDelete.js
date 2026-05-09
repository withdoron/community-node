/**
 * Soft-delete utilities — Phase 1.0 commit 1.
 *
 * The four cost-tracking entities (FSPayment, FSMaterialEntry, FSLaborEntry,
 * FSDailyLog) gained `deleted_at` (datetime, nullable) in Phase 1.0. When set,
 * the record is treated as deleted for all default reads. Records archived,
 * not destroyed — preserves audit trail and supports reversibility.
 *
 * Read-path discipline (LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL §13.4):
 * Every query that reads these entities filters out soft-deleted records via
 * excludeDeleted(arr). Client-side filter rather than Base44 .filter({ deleted_at: null })
 * because Base44 SDK null-equality support on filter is unverified at Phase 1.0
 * commit time — client-side is guaranteed-correct semantics with one extra .filter()
 * pass per query.
 *
 * Living Feet (DEC-146): one helper, every consumer reads through it. When the
 * delete UI ships in commit 2, the same filter in place catches every site
 * automatically — no second sweep.
 *
 * Note: rare admin/forensic surfaces that legitimately want to see deleted
 * records skip this helper (e.g., a future "show deleted" toggle in admin
 * tools, AuditLog detail view). Default for every user-facing query is
 * excludeDeleted-by-default.
 */
export function excludeDeleted(arr) {
  return (arr || []).filter((r) => !r.deleted_at);
}
