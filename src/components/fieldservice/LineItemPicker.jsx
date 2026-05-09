import React, { useState, useMemo } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useContractLineItems } from '@/hooks/useContractLineItems';
import { CATEGORY_MAP } from '@/utils/fsLineItems';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const TRIGGER_CLASS =
  'w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent min-h-[44px] flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

/**
 * LineItemPicker — typeahead picker for selecting a line item from the
 * project's FSEstimate or any signed FSChangeOrder. Phase 1.0 commit 1
 * primitive (per LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL.md §12 Q4 + Q7 locks:
 * type-ahead from day one; label "Line item").
 *
 * Composes the same shadcn Command (cmdk) + Popover pattern as
 * SubVendorPicker (Phase 2.4). Reuses useContractLineItems hook for the
 * chronological union of estimate + signed CO line items.
 *
 * Selection writes the item's `id` (string FK) to the consuming form's
 * line_item_id state. Empty selection writes null = "Unallocated" per
 * FINANCIAL-WORKFLOW-SPEC §3.2.5 destination architecture.
 *
 * Degrades gracefully when:
 *   - projectId is null/undefined → trigger disabled with "Select a project first"
 *   - project has no estimate yet → trigger disabled with "No line items available"
 *   - line_item_id is set but the item no longer exists (orphaned reference) →
 *     trigger renders with "Detached: [original]" hint, prompts re-pick on open
 */
export default function LineItemPicker({
  projectId,
  value,
  onChange,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const lineItems = useContractLineItems(projectId);

  // Resolve current selection by id.
  const selectedItem = useMemo(
    () => (value ? lineItems.find((it) => it.id === value) : null),
    [value, lineItems]
  );
  const isOrphaned = !!value && !selectedItem;

  const noProject = !projectId;
  const noItems = !!projectId && lineItems.length === 0;
  const triggerDisabled = disabled || noProject;

  let triggerLabel;
  let triggerLabelClass = '';
  if (selectedItem) {
    const cat = CATEGORY_MAP[selectedItem.category]?.label || selectedItem.category || '';
    const desc = selectedItem.description || `${cat} line`;
    triggerLabel = `${desc} · ${fmt(selectedItem.amount)}`;
  } else if (isOrphaned) {
    triggerLabel = 'Detached line — re-pick';
    triggerLabelClass = 'text-muted-foreground italic';
  } else if (noProject) {
    triggerLabel = 'Select a project first';
    triggerLabelClass = 'text-muted-foreground/70';
  } else if (noItems) {
    triggerLabel = 'No line items available — Unallocated';
    triggerLabelClass = 'text-muted-foreground/70';
  } else {
    triggerLabel = 'Pick a line item (or leave Unallocated)';
    triggerLabelClass = 'text-muted-foreground/70';
  }

  const handlePick = (item) => {
    onChange?.(item.id);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.(null);
    setQuery('');
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => { if (!triggerDisabled && !noItems) setOpen(o); }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={triggerDisabled}
          className={TRIGGER_CLASS}
        >
          <span className="flex-1 text-left truncate flex items-center gap-2">
            {selectedItem && (
              <span
                className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${CATEGORY_MAP[selectedItem.category]?.badge || ''}`}
              >
                {selectedItem._origin_label}
              </span>
            )}
            <span className={triggerLabelClass}>{triggerLabel}</span>
          </span>
          {selectedItem && !triggerDisabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleClear(e);
              }}
              className="p-1 -m-1 text-muted-foreground/70 hover:text-foreground rounded"
              aria-label="Clear selection (set to Unallocated)"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border"
        align="start"
      >
        <Command shouldFilter={true}>
          <CommandInput
            placeholder="Search line items..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty className="py-3 px-2 text-sm text-muted-foreground">
              No matching line items.
            </CommandEmpty>
            {lineItems.length > 0 && (
              <CommandGroup>
                {lineItems.map((it) => {
                  const cat = CATEGORY_MAP[it.category];
                  const desc = it.description || `${cat?.label || 'Line'} item`;
                  return (
                    <CommandItem
                      key={it.id}
                      value={`${desc} ${cat?.label || ''} ${it._origin_label}`}
                      onSelect={() => handlePick(it)}
                      className="flex items-center gap-2"
                    >
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${cat?.badge || ''}`}
                      >
                        {it._origin_label}
                      </span>
                      <span className="text-foreground flex-1 truncate">{desc}</span>
                      <span className="text-muted-foreground/70 text-xs flex-shrink-0">
                        {fmt(it.amount)}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
