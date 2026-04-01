/**
 * SpaceSpinner — horizontal gallery-style space picker.
 * Always visible, even when drilled into a space.
 * CSS values from MOCKUP-SPINNER-V6-FINAL.html — these are the spec.
 *
 * Props:
 *   items     — [{id, label, icon: LucideIcon, dim?: boolean}]
 *   currentIndex — active position
 *   onSelect(index) — callback when user taps or swipes to a position
 */
import React, { useRef, useCallback } from 'react';

// Audio tick — sine oscillator, 40ms, gain 0.012, freq 440 + index*60
function playTick(index) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440 + index * 60;
    osc.type = 'sine';
    gain.gain.value = 0.012;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch { /* audio not available */ }
}

export default function SpaceSpinner({ items = [], currentIndex = 0, onSelect }) {
  const pointerRef = useRef({ x: 0, active: false });

  const handleSelect = useCallback((idx) => {
    if (idx < 0 || idx >= items.length) return;
    playTick(idx);
    onSelect?.(idx);
  }, [items.length, onSelect]);

  const handlePointerDown = useCallback((e) => {
    pointerRef.current = { x: e.clientX, active: true };
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (!pointerRef.current.active) return;
    pointerRef.current.active = false;
    const delta = e.clientX - pointerRef.current.x;
    if (Math.abs(delta) > 20) {
      // Swipe left (negative delta) = next, swipe right = prev
      if (delta < 0 && currentIndex < items.length - 1) handleSelect(currentIndex + 1);
      else if (delta > 0 && currentIndex > 0) handleSelect(currentIndex - 1);
    }
  }, [currentIndex, items.length, handleSelect]);

  // Position offset: each node is 74px wide, center of container
  const containerCenter = 260 - 37; // from mockup: translateX(-(ci*74)+(260-37))
  const translateX = -(currentIndex * 74) + containerCenter;

  return (
    <div
      className="select-none touch-pan-y cursor-grab active:cursor-grabbing relative"
      style={{ padding: '14px 0 6px' }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* Spinner track */}
      <div className="flex items-center justify-center relative overflow-hidden" style={{ height: 68 }}>
        <div
          className="flex items-center will-change-transform"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: 'transform 0.32s cubic-bezier(0.22, 0.68, 0, 1)',
          }}
        >
          {items.map((item, i) => {
            const d = i - currentIndex;
            const isCenter = d === 0;
            const isAdjacent = Math.abs(d) === 1;
            const isFar = Math.abs(d) >= 2;
            const isDimmed = item.dim && !isCenter;

            // Sizes from mockup spec
            const boxSize = isCenter ? 42 : isAdjacent ? 30 : 22;
            const iconSize = isCenter ? 17 : isAdjacent ? 12 : 11;
            const borderColor = isCenter ? '#f59e0b' : '#1e293b';
            const borderRadius = isCenter ? 10 : 6;
            const bgColor = isCenter ? '#120e04' : '#0a0f1a';
            const iconColor = isCenter ? '#f59e0b' : isAdjacent ? '#64748b' : '#475569';
            const labelSize = isCenter ? 10 : 8;
            const labelColor = isCenter ? '#f59e0b' : isAdjacent ? '#475569' : '#334155';
            const labelWeight = isCenter ? 500 : 400;
            const labelMargin = isCenter ? 3 : 2;
            const opacity = (isFar || isDimmed) ? 0.15 : 1;

            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className="flex flex-col items-center justify-center flex-shrink-0 cursor-pointer"
                style={{
                  width: 74,
                  opacity,
                  transition: 'all 0.32s cubic-bezier(0.22, 0.68, 0, 1)',
                }}
                onClick={() => handleSelect(i)}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: boxSize,
                    height: boxSize,
                    border: `1.5px solid ${borderColor}`,
                    borderRadius,
                    background: bgColor,
                    transition: 'all 0.32s',
                  }}
                >
                  <Icon
                    style={{
                      width: iconSize,
                      height: iconSize,
                      color: iconColor,
                      transition: 'all 0.32s',
                    }}
                    strokeWidth={1.5}
                  />
                </div>
                <span
                  style={{
                    fontSize: labelSize,
                    color: labelColor,
                    fontWeight: labelWeight,
                    marginTop: labelMargin,
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.3px',
                    transition: 'all 0.32s',
                  }}
                >
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Fade edges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, #020617 0%, transparent 18%, transparent 82%, #020617 100%)',
          }}
        />
      </div>

      {/* Amber dot indicator */}
      <div className="flex justify-center" style={{ marginTop: 5 }}>
        <div
          style={{
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: '#f59e0b',
          }}
        />
      </div>
    </div>
  );
}
