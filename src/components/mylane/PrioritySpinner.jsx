/**
 * PrioritySpinner — vertical gallery-style priority picker.
 * Used inside HomeFeed for Attention / This week / Spaces tabs.
 * CSS values from MOCKUP-SPINNER-V6-FINAL.html.
 *
 * Props:
 *   items     — [{title, subtitle, barColor, spaceIndex?, spaceName?}]
 *   currentIndex — active center item
 *   onSelect(index) — callback on tap/swipe
 *   onOpenSpace(spaceIndex) — callback when "Open [space]" tapped
 */
import React, { useRef, useCallback } from 'react';

// Sound + haptic preference — default on
function isSoundEnabled() {
  try { return localStorage.getItem('mylane_sound') !== '0'; } catch { return true; }
}

// Audio tick — sine, 300 + index*35 Hz, 30ms, gain 0.035
// Haptic: 8ms subtle buzz
function playVerticalTick(index) {
  if (!isSoundEnabled()) return;
  try {
    if (navigator.vibrate) navigator.vibrate(8);
  } catch {}
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 300 + index * 35;
    osc.type = 'sine';
    gain.gain.value = 0.035;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  } catch { /* audio not available */ }
}

// Bar color classes from mockup
const BAR_COLORS = {
  ur: '#ef4444', // urgent — red
  ac: '#f59e0b', // action — amber
  ev: '#3b82f6', // event — blue
  lf: '#22c55e', // life — green
};

export default function PrioritySpinner({ items = [], currentIndex = 0, onSelect, onOpenSpace }) {
  const pointerRef = useRef({ y: 0, active: false });

  const handleSelect = useCallback((idx) => {
    if (idx < 0 || idx >= items.length) return;
    playVerticalTick(idx);
    onSelect?.(idx);
  }, [items.length, onSelect]);

  const handlePointerDown = useCallback((e) => {
    pointerRef.current = { y: e.clientY, active: true };
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (!pointerRef.current.active) return;
    pointerRef.current.active = false;
    const delta = e.clientY - pointerRef.current.y;
    if (Math.abs(delta) > 20) {
      if (delta < 0 && currentIndex < items.length - 1) handleSelect(currentIndex + 1);
      else if (delta > 0 && currentIndex > 0) handleSelect(currentIndex - 1);
    }
  }, [currentIndex, items.length, handleSelect]);

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#1e293b', fontSize: 13 }}>
        All clear
      </div>
    );
  }

  // Each item is ~57px tall (from mockup). Center in viewport offset.
  const translateY = -(currentIndex * 57) + 90;

  return (
    <div
      className="relative overflow-hidden select-none touch-pan-x cursor-grab active:cursor-grabbing"
      style={{ flex: 1, minHeight: 200 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div
        className="will-change-transform"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: 'transform 0.32s cubic-bezier(0.22, 0.68, 0, 1)',
          padding: '8px 20px',
        }}
      >
        {items.map((item, i) => {
          const d = i - currentIndex;
          const isCenter = d === 0;
          const isAdjacent = Math.abs(d) === 1;

          // Scale + opacity from mockup
          const scale = isCenter ? 1 : isAdjacent ? 0.93 : 0.86;
          const opacity = isCenter ? 1 : isAdjacent ? 0.45 : 0.12;
          const barColor = BAR_COLORS[item.barColor] || '#475569';

          return (
            <div
              key={i}
              className="flex items-start gap-2.5 cursor-pointer"
              style={{
                padding: '10px 12px',
                marginBottom: 5,
                borderRadius: 8,
                background: '#0a0f1a',
                border: '1px solid #111827',
                transform: `scale(${scale})`,
                opacity,
                transition: 'all 0.32s cubic-bezier(0.22, 0.68, 0, 1)',
                transformOrigin: 'center',
              }}
              onClick={() => handleSelect(i)}
            >
              {/* Color bar */}
              <div
                style={{
                  width: 3,
                  minHeight: 28,
                  borderRadius: 2,
                  flexShrink: 0,
                  marginTop: 2,
                  background: barColor,
                }}
              />
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.3 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>
                  {item.subtitle}
                </div>
                {item.spaceIndex != null && item.spaceName && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSpace?.(item.spaceIndex);
                    }}
                    style={{
                      fontSize: 10,
                      color: '#f59e0b',
                      marginTop: 3,
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      display: 'inline-block',
                    }}
                  >
                    Open {item.spaceName.toLowerCase()}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Vertical fade edges */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(180deg, #020617 0%, transparent 15%, transparent 85%, #020617 100%)',
        }}
      />
    </div>
  );
}
