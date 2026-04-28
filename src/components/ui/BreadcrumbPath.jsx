import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

/**
 * BreadcrumbPath — cockpit-agnostic navigable path component.
 *
 * Takes a segments array (root → current) and renders a horizontal trail of
 * pill-shaped segments. The last segment is the current location and renders
 * non-interactively (with `aria-current="page"`); earlier segments call their
 * own `onClick` callback when tapped. Pure rendering — no state, no
 * navigation logic. Whatever component mounts the breadcrumb owns the state
 * and the click handlers.
 *
 * Two presentation modes via `mode` prop:
 *   - "primary" (default): large segments, generous padding, designed to
 *     occupy the prominent position in the tile cockpit
 *   - "adjacent": smaller, more compact, designed to sit above or below
 *     another navigation primitive (e.g., the spinner cockpit) without
 *     dominating it
 *
 * Both modes share the same data, the same logic, and the same warm-glow
 * pill family — they differ only in size and visual weight. Future cockpits
 * inherit the breadcrumb for free by mounting this component in either mode.
 *
 * Composes the shadcn breadcrumb primitives in `breadcrumb.jsx` (DEC-173 —
 * resurface, not rebuild) for the a11y wrapping (`<nav aria-label>`, `<ol>`,
 * `<li>`, `aria-current="page"`). The visual styling overrides shadcn's
 * defaults to match LocalLane's warm-on-hover pill language (the network
 * chips in BusinessCard, the Tile primitive's hover state).
 *
 * Design context: Phase 4.2-tiles-2. See Spec-Repo/PHASE-4-MIGRATION-PLAN.md
 * Section 8.13 ("Tile cockpit design pivot" → Breadcrumb component).
 *
 * Segment shape:
 *   id        unique string within this breadcrumb (used as React key)
 *   label     display text — required
 *   icon      optional element rendered before the label (lucide icon, etc.)
 *   onClick   optional callback. Last segment is always non-interactive
 *             regardless — it represents "you are here".
 *
 * Props:
 *   segments  array of segment objects, ordered root → current — required
 *   mode      "primary" | "adjacent" (default "primary")
 *   className optional class merged onto the outer <nav> via cn()
 *   ...rest   forwarded to the outer <nav> element
 */

const PRIMARY_STYLES = {
  list: 'flex items-center justify-center gap-2 py-3 px-4 text-sm',
  active:
    'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-semibold',
  interactive:
    'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-secondary text-foreground-soft border border-border font-medium hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer',
  separator: '[&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted-foreground/60',
};

const ADJACENT_STYLES = {
  list: 'flex items-center justify-center gap-1 py-1 px-2 text-xs',
  active:
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium',
  interactive:
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer',
  separator: '[&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground/60',
};

export default function BreadcrumbPath({
  segments,
  mode = 'primary',
  className,
  ...rest
}) {
  if (!Array.isArray(segments) || segments.length === 0) return null;

  const styles = mode === 'adjacent' ? ADJACENT_STYLES : PRIMARY_STYLES;

  return (
    <Breadcrumb className={className} data-breadcrumb-mode={mode} {...rest}>
      <BreadcrumbList className={styles.list}>
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          const interactive = !isLast && typeof seg.onClick === 'function';

          return (
            <React.Fragment key={seg.id}>
              <BreadcrumbItem>
                {interactive ? (
                  <button
                    type="button"
                    onClick={seg.onClick}
                    className={cn(styles.interactive)}
                  >
                    {seg.icon && <span className="flex-shrink-0">{seg.icon}</span>}
                    <span>{seg.label}</span>
                  </button>
                ) : (
                  <BreadcrumbPage className={cn(styles.active)}>
                    {seg.icon && <span className="flex-shrink-0">{seg.icon}</span>}
                    <span>{seg.label}</span>
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator className={styles.separator}>
                  <ChevronRight />
                </BreadcrumbSeparator>
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
