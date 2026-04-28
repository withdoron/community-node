import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Tile — generic visual primitive for tile cockpit, folder tiles, leaf tiles,
 * and the existing Directory tile. Renders the rounded card shell with its
 * gradient fill, left-edge accent, and hover lift. Consumers wrap this with
 * domain-specific decoration (e.g., BusinessCard adds network chips, tier
 * badges, vitality state).
 *
 * Visual signature (preserved from the existing Directory tile, see DEC-060):
 *   - rounded-lg, p-5
 *   - bg-gradient-to-br from-secondary to-secondary/90
 *   - border border-border, border-l-4 with the accent class
 *   - On hover (interactive only): -translate-y-0.5, primary-tinted border + shadow
 *   - 300ms ease-out transition timing
 *
 * Wrapper pattern (mirrors BusinessCard's existing intercept-or-link split):
 *   - If `onClick` is provided, renders as <div onClick> (for in-shell intercept)
 *   - Else if `href` is provided, renders as <Link to={href}> (default navigation)
 *   - Else renders as a static <div> (no interactive affordance, no hover lift)
 *
 * Design context: Phase 4.2-tiles-1. See Spec-Repo/PHASE-4-MIGRATION-PLAN.md
 * Section 8.13 ("Tile cockpit design pivot") for the rationale on why this
 * primitive exists and what builds downstream of it.
 *
 * Props:
 *   label        primary text — required, rendered as <h3>
 *   sublabel     secondary text — optional, muted
 *   icon         optional element rendered before the label row
 *   accentClass  Tailwind class for the left-edge color (e.g.
 *                'border-l-amber-700'). Defaults to 'border-l-muted-foreground'
 *   kind         informational tag ('business' | 'folder' | 'leaf' | ...)
 *                — currently passed through as data-tile-kind, may drive
 *                visual differentiation in future builds
 *   onClick      optional click handler — wins over href when both are present
 *   href         optional link destination
 *   className    optional class merged via cn()
 *   children     optional decoration rendered below the label/sublabel block
 *   ...rest      forwarded to the wrapper element (data-* attrs, etc.)
 */
const DEFAULT_ACCENT = 'border-l-muted-foreground';

export default function Tile({
  label,
  sublabel,
  icon,
  accentClass,
  kind,
  onClick,
  href,
  className,
  children,
  ...rest
}) {
  const interactive = Boolean(onClick || href);

  const tileClass = cn(
    'block rounded-lg p-5',
    'bg-gradient-to-br from-secondary to-secondary/90',
    'border border-border',
    'border-l-4',
    accentClass || DEFAULT_ACCENT,
    'transition-all duration-300 ease-out',
    interactive && 'cursor-pointer hover:border-primary/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.08)] hover:-translate-y-0.5',
    className,
  );

  // When no icon is passed, the label renders as a bare <h3> — matches the
  // existing Directory tile DOM shape exactly, so no consumer sees a structural
  // change. The flex wrapper only appears when an icon is provided.
  const labelBlock = label ? (
    icon ? (
      <div className="flex items-center gap-2">
        <span className="flex-shrink-0">{icon}</span>
        <h3 className="text-lg font-semibold text-foreground line-clamp-1">
          {label}
        </h3>
      </div>
    ) : (
      <h3 className="text-lg font-semibold text-foreground line-clamp-1">
        {label}
      </h3>
    )
  ) : null;

  const body = (
    <>
      {labelBlock}
      {sublabel && (
        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
          {sublabel}
        </p>
      )}
      {children}
    </>
  );

  if (onClick) {
    return (
      <div className={tileClass} onClick={onClick} data-tile-kind={kind} {...rest}>
        {body}
      </div>
    );
  }

  if (href) {
    return (
      <Link to={href} className={tileClass} data-tile-kind={kind} {...rest}>
        {body}
      </Link>
    );
  }

  return (
    <div className={tileClass} data-tile-kind={kind} {...rest}>
      {body}
    </div>
  );
}
