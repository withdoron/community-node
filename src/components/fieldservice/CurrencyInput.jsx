import React, { useRef, useEffect } from 'react';

// CurrencyInput — controlled text input that formats as the user types.
//
// Display: "$1,234.56" — the dollar sign and thousands separators appear
// as the user enters digits, not on blur. Underlying value passed to the
// parent stays a numeric string ("1234.56") so callers can do the usual
// parseFloat() to persist.
//
// Cursor management: counting digit-and-decimal chars before the cursor in
// the raw input, then placing the cursor after the same count of digit/decimal
// chars in the reformatted output. This keeps "$1,234" → typing "5" between
// the "1" and "2" → "$15,234" with cursor still between "5" and "," instead
// of jumping to the end. Restored after React re-renders via a ref + effect
// so the controlled value has time to flush.
//
// DEC-089 fractal: extracted as one shared input so all 10 dollar-amount
// sites share the same behavior. Living Feet (DEC-146).
//
// Props:
//   value         — numeric string ("1234.56") or number (1234.56) — parent owned
//   onChange      — (cleanedString) => void; receives sanitized digits-and-dot
//                   only ("1234.56"), never the formatted display
//   onFocus       — optional, called after default focus behavior
//   onBlur        — optional, called after default blur behavior
//   className     — appended to the input className
//   showPrefix    — accepted for backward compatibility; ignored (the "$" is
//                   now part of the formatted display, no external prefix
//                   needed). Existing callers can leave the prop in place.
//   ...rest       — passed through to the <input>

// Strip everything except digits and dots; keep only the first dot; cap at
// 2 decimal places so a money value can't exceed cents resolution.
function sanitize(raw) {
  if (raw == null) return '';
  let s = String(raw).replace(/[^0-9.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot === -1) return s;
  return (
    s.slice(0, firstDot + 1) +
    s.slice(firstDot + 1).replace(/\./g, '').slice(0, 2)
  );
}

// Format a numeric string as "$1,234.56". Preserves trailing decimal so the
// user can type "1234." and not get the dot stripped mid-keystroke.
function format(numericString) {
  if (numericString == null || numericString === '') return '';
  const s = String(numericString);
  const dot = s.indexOf('.');
  const intPart = dot === -1 ? s : s.slice(0, dot);
  const decPart = dot === -1 ? '' : s.slice(dot);
  const intFormatted = intPart === ''
    ? (decPart ? '0' : '')
    : Number(intPart).toLocaleString('en-US');
  if (intFormatted === '' && decPart === '') return '';
  return `$${intFormatted || '0'}${decPart}`;
}

// Count digit and dot chars in str[0..pos).
function countDigits(str, pos) {
  let n = 0;
  const limit = Math.min(pos, str.length);
  for (let i = 0; i < limit; i++) {
    if (/[0-9.]/.test(str[i])) n++;
  }
  return n;
}

// Position right after the Nth digit/dot in `formatted`. If N is 0 (cursor
// before any digit) place it just past the leading "$" so typing extends
// from there.
function cursorAfterDigit(formatted, n) {
  if (n === 0) return formatted.startsWith('$') ? 1 : 0;
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/[0-9.]/.test(formatted[i])) count++;
    if (count === n) return i + 1;
  }
  return formatted.length;
}

// eslint-disable-next-line no-unused-vars
export default function CurrencyInput({
  value,
  onChange,
  onFocus,
  onBlur,
  className = '',
  showPrefix: _showPrefix,
  ...rest
}) {
  const inputRef = useRef(null);
  const pendingCursor = useRef(null);

  const displayValue = format(value);

  // After every render — once React has flushed the controlled value back into
  // the input — restore the cursor position computed during the last keystroke.
  // Setting it inside onChange is too early; the input still shows the user's
  // raw text at that point, not the reformatted display.
  useEffect(() => {
    if (
      pendingCursor.current !== null &&
      document.activeElement === inputRef.current
    ) {
      const pos = pendingCursor.current;
      try { inputRef.current.setSelectionRange(pos, pos); } catch { /* ignore */ }
      pendingCursor.current = null;
    }
  });

  const handleChange = (e) => {
    const input = e.target;
    const raw = input.value;
    const rawCursor = input.selectionStart ?? raw.length;
    const digitsBefore = countDigits(raw, rawCursor);
    const cleaned = sanitize(raw);
    const formatted = format(cleaned);
    pendingCursor.current = cursorAfterDigit(formatted, digitsBefore);
    onChange?.(cleaned);
  };

  return (
    <input
      {...rest}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={(e) => {
        // Old behavior preserved: clear when focusing a zero-valued field so
        // the user can type fresh without first deleting "$0".
        if (parseFloat(value) === 0) onChange?.('');
        onFocus?.(e);
      }}
      onBlur={(e) => {
        // Match the original CurrencyInput contract — blur with empty value
        // collapses back to a numeric 0 so parents that round-trip the value
        // through parseFloat get a stable type.
        if (value === '' || value == null) onChange?.(0);
        onBlur?.(e);
      }}
      className={className}
    />
  );
}
