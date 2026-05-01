import React, { useState, useEffect } from 'react';

// CurrencyInput — controlled input that displays raw numeric while focused
// (so the contractor can type "1000" without commas getting in the way) and
// formatted currency on blur ("$1,000.00"). Mirrors the Amount column display
// in LineItemsEditor so all dollar-amount inputs read consistently.
//
// Per DEC-089 (fractal SOP) — extracted as one thing reused across every
// dollar-input site rather than re-implemented per surface.
//
// Props:
//   value         — number or string (parent-controlled)
//   onChange      — (newValue: string) => void; called with raw string while typing
//   onFocus       — optional, called after default focus behavior
//   onBlur        — optional, called after default blur behavior
//   className     — appended to the input className
//   showPrefix    — when true, renders a "$" inside-left (default false; use when the
//                   input doesn't already live next to a $ glyph)
//   ...rest       — passed through to the <input>

const fmtCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number.isFinite(parseFloat(n)) ? parseFloat(n) : 0,
  );

export default function CurrencyInput({
  value,
  onChange,
  onFocus,
  onBlur,
  className = '',
  showPrefix = false,
  ...rest
}) {
  const [focused, setFocused] = useState(false);

  // While focused: show the raw editable string. Blur: show formatted currency.
  // We pull the formatted value from the underlying numeric value so the parent
  // owns the canonical number and we just shape the display.
  const displayValue = focused
    ? (value ?? '')
    : fmtCurrency(value);

  const inputType = focused ? 'number' : 'text';

  const inputEl = (
    <input
      {...rest}
      type={inputType}
      inputMode="decimal"
      step="0.01"
      min="0"
      value={displayValue}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={(e) => {
        setFocused(true);
        if (parseFloat(e.target.value) === 0) onChange?.('');
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        if (e.target.value === '' || e.target.value == null) onChange?.(0);
        onBlur?.(e);
      }}
      className={`${showPrefix ? 'pl-7 ' : ''}${className}`}
    />
  );

  if (!showPrefix) return inputEl;

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none">$</span>
      {inputEl}
    </div>
  );
}
