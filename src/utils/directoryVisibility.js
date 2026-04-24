/**
 * Directory-visibility filtering.
 *
 * Public surfaces (Directory page, Network pages, homepage teaser) must hide
 * businesses marked `listed_in_directory: false`. The condition is
 * intentionally `!== false`, not `=== true`: businesses where the field is
 * `null`, `undefined`, or `true` are all listed. Only explicit `false`
 * hides. This keeps pre-existing businesses visible without requiring a
 * backfill of the field (DEC-117 dark-until-explored applied to defaulting).
 *
 * Admin surfaces (Admin page, admin panels) deliberately do NOT use this
 * helper — admins see every business including hidden ones so they can
 * manage them. That's by design: the security membrane is at the surface
 * level, not the data level (per Section 13.1).
 *
 * Living Feet (DEC-146): one filter, many consumers. Do not inline the
 * `listed_in_directory !== false` check anywhere else — import this helper
 * so the rule lives in one place.
 */
export function filterListedBusinesses(businesses) {
  if (!Array.isArray(businesses)) return [];
  return businesses.filter((b) => b && b.listed_in_directory !== false);
}
