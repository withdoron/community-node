import React from 'react';
import { ChevronUp, ChevronDown, X, Plus } from 'lucide-react';
import VoiceInput from './VoiceInput';
import CurrencyInput from './CurrencyInput';
import { CATEGORIES, CATEGORY_MAP, makeItem } from '@/utils/fsLineItems';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Sentinel for the trade picker's "no trade" option. Radix Select disallows
// empty-string values; we round-trip this sentinel to/from '' at the I/O
// boundary so the underlying line-item shape is unchanged (trade_category_id
// stays '' for unallocated, matching the existing render-side fallback that
// floats untagged items into the Unallocated bucket).
const NO_TRADE_VALUE = '__no_trade__';

/**
 * LineItemsEditor — shared line-items editor used by FSEstimate builder and
 * FSChangeOrder builder. Knows nothing about its parent's percentages,
 * totals, or save flow — it's a pure controlled editor over a line items array.
 *
 * Props:
 *   items           — array of unified line items
 *   onChange        — (newItems) => void
 *   tradeCategories — array used for the trade category dropdown (insurance only)
 *   showTradeCategories — boolean; show the trade dropdown per row
 *   addCategories   — array of category values to render as add buttons (defaults to all four)
 *
 * The editor enforces at least one item: removeItem only removes when more
 * than one item is present.
 */

const INPUT_CLASS =
  'w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

export default function LineItemsEditor({
  items,
  onChange,
  tradeCategories = [],
  showTradeCategories = false,
  addCategories = ['materials', 'labor', 'subcontractor', 'fee'],
  disabled = false,
}) {
  const updateItem = (idx, field, value) => {
    const next = [...items];
    const updated = { ...next[idx], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      updated.amount =
        (parseFloat(field === 'quantity' ? value : updated.quantity) || 0) *
        (parseFloat(field === 'unit_price' ? value : updated.unit_price) || 0);
    }
    next[idx] = updated;
    onChange(next);
  };
  const addItem = (category) => onChange([...items, makeItem({ category: category || 'materials' })]);
  const insertItemAfter = (idx) => {
    const newItem = makeItem({ category: 'materials' });
    const next = [...items];
    next.splice(idx + 1, 0, newItem);
    onChange(next);
    requestAnimationFrame(() => {
      const inputs = document.querySelectorAll('[data-line-item-desc]');
      inputs[idx + 1]?.focus();
    });
  };
  const removeItem = (idx) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== idx));
  };
  const moveItem = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const ADD_BUTTON_STYLES = {
    materials: { label: 'Add Line Item', cls: 'text-primary hover:text-primary-hover' },
    labor: { label: 'Labor', cls: 'text-sky-400 hover:text-sky-300' },
    subcontractor: { label: 'Subcontractor', cls: 'text-violet-400 hover:text-violet-300' },
    fee: { label: 'Fee', cls: 'text-muted-foreground hover:text-foreground-soft' },
    other: { label: 'Other', cls: 'text-muted-foreground hover:text-foreground-soft' },
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.materials;
        const computedAmt = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
        return (
          <React.Fragment key={item.id || idx}>
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <Select
                  value={item.category || 'materials'}
                  onValueChange={(value) => updateItem(idx, 'category', value)}
                  disabled={disabled}
                >
                  <SelectTrigger className="bg-secondary border-border text-foreground min-w-[110px] h-auto py-2 text-sm focus:ring-ring">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showTradeCategories && (
                  <Select
                    value={item.trade_category_id || NO_TRADE_VALUE}
                    onValueChange={(value) =>
                      updateItem(idx, 'trade_category_id', value === NO_TRADE_VALUE ? '' : value)
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className="bg-secondary border-border text-foreground min-w-[110px] max-w-[160px] h-auto py-2 text-xs focus:ring-ring">
                      <SelectValue placeholder="Trade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_TRADE_VALUE}>Trade — Unallocated</SelectItem>
                      {tradeCategories.map((tc) => (
                        <SelectItem key={tc.id} value={tc.id}>{tc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="flex-1">
                  <input type="text" data-line-item-desc className={INPUT_CLASS} value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    placeholder="Description" />
                </div>
                <VoiceInput onTranscript={(t) => updateItem(idx, 'description', (item.description ? item.description + ' ' : '') + t)} />
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                    className="text-muted-foreground/70 hover:text-primary disabled:opacity-30 p-0.5"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}
                    className="text-muted-foreground/70 hover:text-primary disabled:opacity-30 p-0.5"><ChevronDown className="h-3.5 w-3.5" /></button>
                </div>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)}
                    className="p-2 text-muted-foreground/70 hover:text-primary min-h-[44px]">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {item.category === 'subcontractor' && (
                <div>
                  <label className="text-xs text-muted-foreground/70">Sub Name</label>
                  <input type="text" className={INPUT_CLASS} value={item.sub_name || ''}
                    onChange={(e) => updateItem(idx, 'sub_name', e.target.value)}
                    placeholder="e.g., Gastlin Gutters" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div>
                  <label className="text-xs text-muted-foreground/70">Qty</label>
                  <input type="number" className={INPUT_CLASS} value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateItem(idx, 'quantity', ''); }}
                    onBlur={(e) => { if (e.target.value === '') updateItem(idx, 'quantity', 0); }}
                    min="0" step="any" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground/70">Unit Price</label>
                  <CurrencyInput className={INPUT_CLASS} value={item.unit_price}
                    onChange={(v) => updateItem(idx, 'unit_price', v)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground/70">Amount</label>
                  <div className={`${INPUT_CLASS} flex items-center justify-end bg-secondary/60 cursor-default`}>
                    {fmt(computedAmt)}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => insertItemAfter(idx)}
              className="group flex items-center justify-center w-full py-1 -my-1"
              title="Insert line item here"
            >
              <span className="flex-1 h-px bg-secondary group-hover:bg-primary/40 transition-colors" />
              <span className="flex items-center justify-center h-6 w-6 rounded-full border border-border text-muted-foreground/50 group-hover:border-primary group-hover:text-primary transition-colors">
                <Plus className="h-3 w-3" />
              </span>
              <span className="flex-1 h-px bg-secondary group-hover:bg-primary/40 transition-colors" />
            </button>
          </React.Fragment>
        );
      })}

      <div className="flex gap-2 flex-wrap">
        {addCategories.map((c) => {
          const style = ADD_BUTTON_STYLES[c] || ADD_BUTTON_STYLES.materials;
          return (
            <button key={c} type="button" onClick={() => addItem(c)}
              className={`flex items-center gap-1.5 text-sm min-h-[44px] ${style.cls}`}>
              <Plus className="h-4 w-4" /> {style.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
