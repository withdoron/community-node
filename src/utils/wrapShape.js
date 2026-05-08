/**
 * wrapShape — read-tolerance helper for Base44 `object`-typed array fields.
 *
 * DEC-216 candidate: Base44's `object` type accepts arbitrary JSON, and the
 * load-bearing storage convention for array-shaped values is the wrap form
 * `{ items: [...] }`. Writes must use the wrap form; reads tolerate both
 * shapes plus legacy plain arrays + accidental JSON-string-of-array values
 * (the latter two appear in records written before the wrap convention was
 * codified).
 *
 * Three consumers at extraction time (Phase 2.3):
 *   - workers_json on FieldServiceProfile (FieldServicePeople.jsx)
 *   - line_items + labor_estimate on FSEstimate/FSChangeOrder (fsLineItems.js)
 *   - workers_json reads from Phase 2.4's <SubVendorPicker> (next phase)
 *
 * Living Feet (DEC-146): one parser, every consumer reads through it. When the
 * fourth `object`-array field surfaces (e.g., a future trade_modifiers_json),
 * it inherits the same read tolerance for free.
 */
export function parseWrappedArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return parseWrappedArray(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (value && typeof value === 'object' && Array.isArray(value.items)) {
    return value.items;
  }
  return [];
}
