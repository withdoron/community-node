import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * ProjectTileDrillIn — tap-to-audit modal for the Project Detail tiles.
 *
 * Every number on the Project Detail surface should be traceable to its
 * source records. This component is the bridge: opens from a tile, lists the
 * records that compose the tile's value, and shows the total at the bottom
 * matching the tile.
 *
 * Pure presentation. The parent (FieldServiceProjects) builds the row list
 * per tile type and passes it in — no per-tile rendering logic lives here.
 *
 * For derived tiles (Net Cash, Remaining), pass `math` JSX in place of `rows`
 * so the modal shows the calculation with each input clickable to drill into
 * its own source.
 */
export default function ProjectTileDrillIn({
  open,
  onClose,
  title,
  subtitle,
  total,
  rows,
  math,
  emptyMessage,
  footer,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -m-2 text-muted-foreground hover:text-foreground rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {math ? (
            math
          ) : rows && rows.length > 0 ? (
            <ul className="divide-y divide-border">
              {rows.map((row, i) => (
                <DrillInRow key={row.key ?? i} row={row} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic py-6 text-center">
              {emptyMessage || 'No source records yet.'}
            </p>
          )}
        </div>

        {/* Footer — total + optional note */}
        {(total !== undefined || footer) && (
          <div className="border-t border-border p-5 flex-shrink-0 space-y-2">
            {total !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground-soft uppercase tracking-wider">
                  Total
                </span>
                <span className="text-xl font-bold text-foreground">{total}</span>
              </div>
            )}
            {footer && (
              <p className="text-xs text-muted-foreground">{footer}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DrillInRow({ row }) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{row.primary}</p>
        {row.secondary && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{row.secondary}</p>
        )}
      </div>
      <div className="flex-shrink-0 text-right pl-3">
        <p className={`text-sm font-semibold ${row.amountClass || 'text-foreground'}`}>
          {row.amount}
        </p>
        {row.trailing && (
          <p className="text-xs text-muted-foreground mt-0.5">{row.trailing}</p>
        )}
      </div>
    </>
  );

  if (row.onClick) {
    return (
      <li>
        <button
          type="button"
          onClick={row.onClick}
          className="w-full flex items-start gap-3 py-3 text-left hover:bg-secondary/40 rounded-lg px-2 -mx-2 transition-colors min-h-[44px]"
        >
          {content}
        </button>
      </li>
    );
  }
  return (
    <li className="flex items-start gap-3 py-3 px-2 -mx-2">
      {content}
    </li>
  );
}
