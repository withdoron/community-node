// FieldServiceProfile feature flags — single source of truth (Living Feet, DEC-146).
//
// Canonical storage: `profile.features_json` (object blob). Top-level boolean
// fields on the profile (overhead_profit_enabled, insurance_work_enabled, etc.)
// are deprecated — they exist in the schema for backward compatibility but
// are not read or written anymore. The Base44 deprecation prompt that removes
// them lives at `base44-prompts/PHASE-1-DEPRECATE-LEGACY-FEATURE-FLAGS.md`.
//
// Why this file exists:
// Pre-fix, `getFeatures()` lived inside FieldServiceSettings.jsx and was the
// only consumer. Other components received `features` via prop drilling, but
// the mount point in MyLaneDrillView wired `profile.features` (a key that
// does not exist on the entity) instead of running the derivation. Result:
// `features === {}` for every Field Service tab, and any read using
// `=== true` silently returned false. O&P and Xactimate disappeared even
// when Settings showed them on. Extracting the helper lets every read site —
// mount point and Settings alike — share one derivation.

export const FEATURE_DEFAULTS = {
  permits_enabled: true,
  subs_enabled: true,
  management_fees_enabled: false,
  insurance_fee_enabled: false,
  overhead_profit_enabled: false,
  xactimate_enabled: false,
  // Tax defaults off — most Oregon contractors (LocalLane's primary market) don't
  // collect sales tax. Contractors in tax states opt in via Settings.
  tax_enabled: false,
  payments_enabled: true,
  timeline_enabled: true,
};

// Derive the resolved feature flags for a FieldServiceProfile. Always returns
// a fully-populated object with defaults for any missing keys, so callers can
// safely use `flags.permits_enabled` without optional chaining surprises.
//
// Migration: legacy `insurance_work_enabled` (a single combined toggle for
// O&P + Xactimate) is split into the two new flags on read. The legacy key
// is dropped from the returned object so it never gets re-written.
export function getFeatures(profile) {
  const f = profile?.features_json || {};
  const merged = { ...FEATURE_DEFAULTS, ...f };
  if (f.insurance_work_enabled === true && !f.overhead_profit_enabled && !f.xactimate_enabled) {
    merged.overhead_profit_enabled = true;
    merged.xactimate_enabled = true;
  }
  delete merged.insurance_work_enabled;
  return merged;
}

// Convenience boolean check. Defaults to FEATURE_DEFAULTS when the flag is
// missing, which matches getFeatures()'s behavior.
export function isFeatureEnabled(profile, key) {
  return getFeatures(profile)[key] === true;
}

// FS profile cache key — single source of truth for invalidation.
//
// FieldServiceProfile records are loaded by the MyLane page via the
// `getMyLaneProfiles` server function under queryKey `['mylane-profiles-v2',
// userId]`. Settings + People used to invalidate `['fs-profiles']` after every
// save — that key matched no live query, so the invalidate was a no-op and
// the profile prop reaching Settings on remount was stale (toggles appeared
// to revert). Living Feet (DEC-146): one helper, every save site uses it,
// when the underlying cache key changes we update one line.
export function invalidateFSProfiles(queryClient, userId) {
  if (!queryClient) return;
  // userId is part of the cache key. If we know it, scope the invalidation
  // (faster — only marks the one key stale). Otherwise broad-invalidate by
  // prefix and React Query handles the rest.
  if (userId) {
    queryClient.invalidateQueries({ queryKey: ['mylane-profiles-v2', userId] });
  } else {
    queryClient.invalidateQueries({ queryKey: ['mylane-profiles-v2'] });
  }
}
