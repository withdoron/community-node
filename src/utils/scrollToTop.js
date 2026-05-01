// scrollToTopOf — walk up the DOM from a starting element to the closest
// scrollable ancestor and reset its scrollTop to 0. Also resets window scroll
// as a belt-and-suspenders fallback for non-overlay layouts.
//
// Why this exists: the Mylane content area (`.mylane-content-area`, class
// inferred from the parent shell) sets `overflowY: auto` and persists its
// scrollTop across tab switches and content swaps. So a user who saves
// Settings while scrolled near the bottom — or who navigates from a deep page
// into Log via "Log a payment" — lands at whatever scroll position the
// previous content left behind.
//
// Living Feet (DEC-146): the same walk-up-and-reset pattern was already
// inlined into FieldServiceLog's mount effect (commit db138bf). Settings
// after-save scroll-to-top is the second consumer, so the helper moves here.
//
// Usage:
//   import { scrollToTopOf } from '@/utils/scrollToTop';
//   const rootRef = useRef(null);
//   ...
//   onSuccess: () => scrollToTopOf(rootRef.current),
//   ...

export function scrollToTopOf(startEl) {
  let el = startEl?.parentElement;
  while (el && el !== document.body) {
    const overflowY = window.getComputedStyle(el).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      el.scrollTop = 0;
      break;
    }
    el = el.parentElement;
  }
  if (typeof window !== 'undefined') window.scrollTo(0, 0);
}
