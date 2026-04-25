import React from 'react';
import { X, Plus } from 'lucide-react';

// Curated multi-select chip input. Selected chips up top (primary/gold,
// removable via X). Unselected towns below as outlined add-buttons.
//
// Built for Lane County town selection (Build E) but shape is generic — any
// curated list of {slug, display_name} works.
//
// Visual matches the Build B product_tags chip pattern in BusinessSettings;
// behavior matches Build 2's immediate-write toggle pattern (parent owns the
// mutation, this component just emits add/remove events).

export default function TownMultiSelect({
  selectedSlugs = [],
  towns = [],
  onAdd,
  onRemove,
  disabled = false,
  emptyHelpText = 'Pick the towns you serve.',
}) {
  const selectedSet = new Set(selectedSlugs);
  const selectedTowns = towns.filter((t) => selectedSet.has(t.slug));
  const unselectedTowns = towns.filter((t) => !selectedSet.has(t.slug));

  return (
    <div className="space-y-3">
      {selectedTowns.length === 0 ? (
        <p className="text-xs text-muted-foreground/70">{emptyHelpText}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {selectedTowns.map((town) => (
            <span
              key={town.slug}
              className="bg-primary/20 text-primary rounded-full px-3 py-1 text-sm flex items-center gap-1.5"
            >
              {town.display_name}
              <button
                type="button"
                onClick={() => onRemove?.(town.slug)}
                disabled={disabled}
                aria-label={`Remove ${town.display_name}`}
                className="hover:text-red-400 transition-colors disabled:opacity-50 disabled:hover:text-primary"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {unselectedTowns.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            {selectedTowns.length === 0 ? 'Available towns' : 'Add another'}
          </p>
          <div className="flex flex-wrap gap-2">
            {unselectedTowns.map((town) => (
              <button
                key={town.slug}
                type="button"
                onClick={() => onAdd?.(town.slug)}
                disabled={disabled}
                className="border border-border text-foreground-soft rounded-full px-3 py-1 text-sm flex items-center gap-1 hover:border-primary hover:text-primary hover:bg-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-3 w-3" />
                {town.display_name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
