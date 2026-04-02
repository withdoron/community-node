/**
 * SpaceSpinner — horizontal gallery-style space picker with momentum swipe.
 * Always visible, even when drilled into a space.
 * CSS values from MOCKUP-SPINNER-V6-FINAL.html — these are the spec.
 *
 * Props:
 *   items     — [{id, label, icon: LucideIcon, dim?: boolean}]
 *   currentIndex — active position
 *   onSelect(index) — callback when user taps or swipes to a position
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';

const ITEM_WIDTH = 74;

// ─── Shared AudioContext (iOS Safari requires user-gesture init) ───
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
  // Resume if suspended (iOS Safari suspends until user gesture)
  if (_audioCtx?.state === 'suspended') {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}

function isSoundEnabled() {
  try { return localStorage.getItem('mylane_sound') !== '0'; } catch { return true; }
}

function playTick(index) {
  if (!isSoundEnabled()) return;
  try { if (navigator.vibrate) navigator.vibrate(8); } catch {}
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440 + index * 60;
    osc.type = 'sine';
    gain.gain.value = 0.05;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {}
}

// Initialize AudioContext on first user gesture (iOS Safari requirement)
function initAudioOnGesture() {
  getAudioCtx();
  document.removeEventListener('pointerdown', initAudioOnGesture);
}
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', initAudioOnGesture, { once: true });
}

export default function SpaceSpinner({ items = [], currentIndex = 0, onSelect }) {
  const containerRef = useRef(null);
  const beltRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── Momentum swipe state ───
  const dragRef = useRef({
    active: false,
    startX: 0,
    startOffset: 0,
    currentOffset: 0,
    lastX: 0,
    lastTime: 0,
    velocity: 0,
  });
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const animFrameRef = useRef(null);

  // Calculate the translateX for a given index — centers active item in container
  const getOffsetForIndex = useCallback((idx) => {
    const center = containerWidth / 2 - ITEM_WIDTH / 2;
    return -(idx * ITEM_WIDTH) + center;
  }, [containerWidth]);

  const baseOffset = getOffsetForIndex(currentIndex);

  const handleSelect = useCallback((idx) => {
    if (idx < 0 || idx >= items.length) return;
    playTick(idx);
    onSelect?.(idx);
  }, [items.length, onSelect]);

  // ─── Pointer handlers for momentum swipe ───
  const handlePointerDown = useCallback((e) => {
    // Cancel any running momentum animation
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    const d = dragRef.current;
    d.active = true;
    d.startX = e.clientX;
    d.startOffset = baseOffset;
    d.currentOffset = 0;
    d.lastX = e.clientX;
    d.lastTime = Date.now();
    d.velocity = 0;
    setIsDragging(true);
    setDragOffset(0);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [baseOffset]);

  const handlePointerMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    d.currentOffset = dx;

    // Track velocity from last few frames
    const now = Date.now();
    const dt = now - d.lastTime;
    if (dt > 0) {
      d.velocity = (e.clientX - d.lastX) / dt; // px/ms
    }
    d.lastX = e.clientX;
    d.lastTime = now;

    setDragOffset(dx);

    // Play tick sound when crossing item boundaries
    const rawIdx = -(d.startOffset + dx - containerWidth / 2 + ITEM_WIDTH / 2) / ITEM_WIDTH;
    const nearestIdx = Math.round(Math.max(0, Math.min(items.length - 1, rawIdx)));
    if (nearestIdx !== currentIndex) {
      playTick(nearestIdx);
    }
  }, [containerWidth, items.length, currentIndex]);

  const handlePointerUp = useCallback((e) => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    setIsDragging(false);

    const dx = d.currentOffset;
    const velocity = Math.max(-1.5, Math.min(1.5, d.velocity)); // cap at 1.5 px/ms

    // If barely moved, treat as tap (no swipe)
    if (Math.abs(dx) < 5) {
      setDragOffset(0);
      return;
    }

    // Calculate how many positions to move based on drag + velocity
    const momentumPx = velocity * 120;
    const totalDelta = dx + momentumPx;
    const positionsDelta = Math.round(-totalDelta / ITEM_WIDTH);
    const targetIdx = Math.max(0, Math.min(items.length - 1, currentIndex + positionsDelta));

    setDragOffset(0);

    if (targetIdx !== currentIndex) {
      // Play ticks for intermediate positions
      const step = targetIdx > currentIndex ? 1 : -1;
      let tickIdx = currentIndex;
      const tickInterval = setInterval(() => {
        tickIdx += step;
        if ((step > 0 && tickIdx > targetIdx) || (step < 0 && tickIdx < targetIdx)) {
          clearInterval(tickInterval);
          return;
        }
        playTick(tickIdx);
      }, 50);

      handleSelect(targetIdx);
    }
  }, [currentIndex, items.length, handleSelect]);

  // Mouse wheel handler — scroll through spinner positions on desktop
  const wheelTimerRef = useRef(null);
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    // Debounce wheel events (fire max once per 120ms)
    if (wheelTimerRef.current) return;
    wheelTimerRef.current = setTimeout(() => { wheelTimerRef.current = null; }, 120);
    if (e.deltaY > 0 || e.deltaX > 0) {
      if (currentIndex < items.length - 1) handleSelect(currentIndex + 1);
    } else if (e.deltaY < 0 || e.deltaX < 0) {
      if (currentIndex > 0) handleSelect(currentIndex - 1);
    }
  }, [currentIndex, items.length, handleSelect]);

  // Final translateX: base offset + drag delta (during drag) or just base offset (at rest)
  const translateX = isDragging ? baseOffset + dragOffset : baseOffset;

  if (containerWidth === 0) {
    return (
      <div ref={containerRef} style={{ padding: '14px 0 6px', height: 68 + 14 + 6 }} />
    );
  }

  return (
    <div
      className="select-none touch-none cursor-grab active:cursor-grabbing relative"
      style={{ padding: '14px 0 6px' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      {/* Spinner track */}
      <div
        ref={containerRef}
        className="flex items-center justify-center relative overflow-hidden"
        style={{ height: 68 }}
      >
        <div
          ref={beltRef}
          className="flex items-center will-change-transform"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.22, 0.68, 0, 1)',
          }}
        >
          {items.map((item, i) => {
            const d = i - currentIndex;
            const isCenter = d === 0;
            const isAdjacent = Math.abs(d) === 1;
            const isFar = Math.abs(d) >= 2;
            const isDimmed = item.dim && !isCenter;

            const boxSize = isCenter ? 42 : isAdjacent ? 30 : 22;
            const iconSize = isCenter ? 17 : isAdjacent ? 12 : 11;
            const borderColor = isCenter ? 'var(--ll-accent, #f59e0b)' : 'var(--ll-border-hover, #1e293b)';
            const borderRadius = isCenter ? 10 : 6;
            const bgColor = isCenter ? 'var(--ll-bg-active, #120e04)' : 'var(--ll-bg-elevated, #0a0f1a)';
            const iconColor = isCenter ? 'var(--ll-accent, #f59e0b)' : isAdjacent ? 'var(--ll-text-dim, #64748b)' : 'var(--ll-text-ghost, #475569)';
            const labelSize = isCenter ? 10 : 8;
            const labelColor = isCenter ? 'var(--ll-accent, #f59e0b)' : isAdjacent ? 'var(--ll-text-ghost, #475569)' : 'var(--ll-text-faint, #334155)';
            const labelWeight = isCenter ? 500 : 400;
            const labelMargin = isCenter ? 3 : 2;
            const opacity = (isFar || isDimmed) ? 0.15 : 1;

            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className="flex flex-col items-center justify-center flex-shrink-0 cursor-pointer"
                style={{
                  width: ITEM_WIDTH,
                  opacity,
                  transition: isDragging ? 'opacity 0.1s' : 'all 0.32s cubic-bezier(0.22, 0.68, 0, 1)',
                }}
                onClick={(e) => {
                  // Only handle click if not dragging
                  if (Math.abs(dragRef.current.currentOffset) < 5) handleSelect(i);
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: boxSize, height: boxSize,
                    border: `1.5px solid ${borderColor}`,
                    borderRadius, background: bgColor,
                    transition: isDragging ? 'none' : 'all 0.32s',
                  }}
                >
                  <Icon
                    style={{ width: iconSize, height: iconSize, color: iconColor, transition: isDragging ? 'none' : 'all 0.32s' }}
                    strokeWidth={1.5}
                  />
                </div>
                <span
                  style={{
                    fontSize: labelSize, color: labelColor, fontWeight: labelWeight,
                    marginTop: labelMargin, whiteSpace: 'nowrap', letterSpacing: '0.3px',
                    transition: isDragging ? 'none' : 'all 0.32s',
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
            background: 'linear-gradient(90deg, var(--ll-bg-base, #020617) 0%, transparent 18%, transparent 82%, var(--ll-bg-base, #020617) 100%)',
          }}
        />
      </div>

      {/* Amber dot indicator */}
      <div className="flex justify-center" style={{ marginTop: 5 }}>
        <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ll-accent, #f59e0b)' }} />
      </div>
    </div>
  );
}
