import React from 'react';
import { X, Plus } from 'lucide-react';

// Curated multi-select chip input. Selected chips up top (primary/gold,
// removable via X). Unselected items below as outlined add-buttons.
//
// Generic by shape — works with any `{slug, display_name}` curated list.
// First caller: Lane County town selection (Build E). Second: business
// categories (Build F). Visual matches the Build B product_tags chip
// pattern in BusinessSettings; behavior matches Build 2's immediate-write
// toggle pattern (parent owns the mutation, this component just emits
// add/remove events).

export default function SlugMultiSelect({
  selectedSlugs = [],
  items = [],
  onAdd,
  onRemove,
  disabled = false,
  emptyHelpText = 'Pick the ones that apply.',
}) {
  const selectedSet = new Set(selectedSlugs);
  const selectedItems = items.filter((it) => selectedSet.has(it.slug));
  const unselectedItems = items.filter((it) => !selectedSet.has(it.slug));

  return (
    <div className="space-y-3">
      {selectedItems.length === 0 ? (
        <p className="text-xs text-muted-foreground/70">{emptyHelpText}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {selectedItems.map((item) => (
            <span
              key={item.slug}
              className="bg-primary/20 text-primary rounded-full px-3 py-1 text-sm flex items-center gap-1.5"
            >
              {item.display_name}
              <button
                type="button"
                onClick={() => onRemove?.(item.slug)}
                disabled={disabled}
                aria-label={`Remove ${item.display_name}`}
                className="hover:text-red-400 transition-colors disabled:opacity-50 disabled:hover:text-primary"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {unselectedItems.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            {selectedItems.length === 0 ? 'Available options' : 'Add another'}
          </p>
          <div className="flex flex-wrap gap-2">
            {unselectedItems.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => onAdd?.(item.slug)}
                disabled={disabled}
                className="border border-border text-foreground-soft rounded-full px-3 py-1 text-sm flex items-center gap-1 hover:border-primary hover:text-primary hover:bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-3 w-3" />
                {item.display_name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
