/**
 * fsLineItems — shared line-item shape, math, and migration helpers
 * for FSEstimate and FSChangeOrder. A change order is structurally a smaller
 * estimate amending the original contract, so they share the same primitives.
 *
 * Categories: materials, labor, subcontractor, fee, other (display tokens use
 * semantic Tailwind classes per DEC-132).
 *
 * calcTotals math is the single source of truth for line items + percentage
 * calculated additions on both surfaces. Read by builders, previews, the
 * client-facing portal views, and the FSChangeOrder.amount write path that
 * feeds FSProject.total_budget on signing.
 */

export const CATEGORIES = [
  { value: 'materials', label: 'Materials', badge: 'bg-primary/20 text-primary-hover' },
  { value: 'labor', label: 'Labor', badge: 'bg-sky-500/20 text-sky-400' },
  { value: 'subcontractor', label: 'Subcontractor', badge: 'bg-violet-500/20 text-violet-400' },
  { value: 'fee', label: 'Fee', badge: 'bg-muted-foreground/20 text-muted-foreground' },
  { value: 'other', label: 'Other', badge: 'bg-surface/20 text-muted-foreground/70' },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

export const EMPTY_UNIFIED_ITEM = {
  id: '', category: 'materials', trade_category_id: '', description: '',
  quantity: 1, unit_price: 0, amount: 0, sub_name: '',
};

let _nextItemId = 1;
export function newItemId() {
  return `item_${Date.now()}_${_nextItemId++}`;
}

export function makeItem(overrides) {
  return { ...EMPTY_UNIFIED_ITEM, id: newItemId(), ...overrides };
}

function parseJSON(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object' && Array.isArray(val.items)) return val.items;
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

/**
 * Read-time migration. Old materials shape {description, qty, unit_cost} +
 * separate labor shape {description, hours, rate} → unified items.
 * If items already carry a `category` field, they're already unified.
 */
export function migrateLineItems(rawLineItems, rawLaborEstimate) {
  const items = parseJSON(rawLineItems);
  const labor = parseJSON(rawLaborEstimate);

  if (items.length > 0 && items[0].category) {
    return items.map((it) => ({
      ...EMPTY_UNIFIED_ITEM,
      ...it,
      id: it.id || newItemId(),
    }));
  }

  const migratedMaterials = items
    .filter((it) => it.description || (parseFloat(it.unit_cost || it.unit_price) || 0) > 0)
    .map((it) => makeItem({
      category: 'materials',
      description: it.description || '',
      quantity: parseFloat(it.qty || it.quantity) || 1,
      unit_price: parseFloat(it.unit_cost || it.unit_price) || 0,
      amount: (parseFloat(it.qty || it.quantity) || 1) * (parseFloat(it.unit_cost || it.unit_price) || 0),
    }));

  const migratedLabor = labor
    .filter((it) => it.description || (parseFloat(it.hours) || 0) > 0)
    .map((it) => {
      const hrs = parseFloat(it.hours) || 0;
      const rate = parseFloat(it.rate) || 0;
      return makeItem({
        category: 'labor',
        description: it.description || '',
        quantity: hrs,
        unit_price: rate,
        amount: hrs * rate,
      });
    });

  const merged = [...migratedMaterials, ...migratedLabor];
  return merged.length > 0 ? merged : [makeItem()];
}

/**
 * calcTotals — pure math for line items + percentage-based calculated
 * additions. Identical math on FSEstimate and FSChangeOrder.
 *
 * subtotal      = sum of line item amounts
 * opAmount      = subtotal * (overheadProfitPct / 100)
 * beforeTax     = subtotal + opAmount + otherAmount
 * taxAmount     = beforeTax * (taxRate / 100)
 * total         = beforeTax + taxAmount  (the full client-billed grand total)
 *
 * For FSChangeOrder, this `total` is the value written to both `total` and
 * `amount` — `amount` is canonical for FSProject.total_budget recompute, so
 * the recompute correctly captures O&P, tax, and other lines, not just the
 * line items subtotal.
 */
export function calcTotals(items, overheadProfitPct, taxRate, otherAmount) {
  const subtotal = (items || []).reduce((s, it) => {
    const amt = parseFloat(it.amount) || ((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0));
    return s + amt;
  }, 0);
  const opAmount = subtotal * ((parseFloat(overheadProfitPct) || 0) / 100);
  const beforeTax = subtotal + opAmount + (parseFloat(otherAmount) || 0);
  const taxAmount = beforeTax * ((parseFloat(taxRate) || 0) / 100);
  return { subtotal, opAmount, beforeTax, taxAmount, total: beforeTax + taxAmount };
}
