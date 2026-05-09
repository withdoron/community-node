import { useState } from 'react';

// One-shot localStorage prefill consumer.
//
// Cross-tab navigation across the FS surface uses localStorage as the seam:
// the source surface writes a key (e.g. 'fs-estimate-prefill-id'), navigates
// to the destination tab via onNavigateTab, and the destination consumes the
// key on mount. The consume-and-clear semantics ensure a stale id can't
// outlive its trigger across later tab switches.
//
// useConsumePrefill reads the key once on mount, removes it, and returns the
// value (or null) for the lifetime of the component instance. Consumers use
// the returned value to drive an effect once their data dependency is loaded
// — the hook gives you the value, the consumer decides when to act on it.
//
// Living Feet (DEC-146) — five+ inline consumers across the FS surface
// (Estimates, two in Log, two in Documents, plus the Desk Home tile drill-
// throughs adding Projects + People consumers) were doing the same read-and-
// remove dance. Funneling through one hook closes the class of bug where
// the read happens but the remove is forgotten (stale prefill replays on
// next mount).
//
// Lazy useState initializer is load-bearing: it runs once at first render and
// captures the value before React's effects fire, so consumers see the value
// immediately without waiting an effect cycle. Re-reads are guaranteed to
// return null because the localStorage key was already removed.
export function useConsumePrefill(key) {
  const [value] = useState(() => {
    try {
      const v = localStorage.getItem(key);
      if (v) localStorage.removeItem(key);
      return v;
    } catch {
      // SSR or sandboxed iframe with no localStorage — fail safe.
      return null;
    }
  });
  return value;
}
