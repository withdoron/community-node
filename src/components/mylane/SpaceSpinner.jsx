/**
 * SpaceSpinner — 3D space picker with mass + friction physics.
 *
 * Architecture: shared core (state, events, audio, friction deceleration) + variant render functions.
 * Theme determines: variant (drum/coverFlow/flat), physics (mass, friction).
 * Variants are pure functions: (items, currentIndex, opts) → JSX.
 *
 * Physics model: heavy puck on a table. Push it, it moves. Friction stops it.
 * No spring, no bounce, no oscillation, no overshoot. Ever.
 *
 * Two modes:
 *   Ratchet (slow drag): live-snap to discrete positions, zero animation on release
 *   Momentum (fast flick): friction deceleration, ticks on each position crossed
 *
 * Props:
 *   items        — [{id, label, icon: LucideIcon, dim?: boolean}]
 *   currentIndex — active position
 *   onSelect(index) — callback when user taps or swipes to a position
 *   variant      — override variant ('drum' | 'coverFlow' | 'flat')
 */
import React, { useRef, useCallback, useEffect, useState } from 'react';

// ─── Audio ───────────────────────────────────────────────────────────────────
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }
  if (_audioCtx?.state === 'suspended') _audioCtx.resume().catch(() => {});
  return _audioCtx;
}
function isSoundEnabled() {
  try { return localStorage.getItem('mylane_sound') !== '0'; } catch { return true; }
}
function playTick(final) {
  if (!isSoundEnabled()) return;
  try { if (navigator.vibrate) navigator.vibrate(8); } catch {}
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    // Lower pitch, weightier click. Final landing is slightly deeper.
    osc.frequency.value = final ? 260 : 320;
    osc.type = 'triangle';
    gain.gain.value = 0.06;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start(); osc.stop(ctx.currentTime + 0.05);
  } catch {}
}
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', () => getAudioCtx(), { once: true });
}

// ─── Theme detection ─────────────────────────────────────────────────────────
function getActiveTheme() {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') || 'dark';
}
function useTheme() {
  const [theme, setTheme] = useState(getActiveTheme);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(getActiveTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

// ─── Reduced motion ──────────────────────────────────────────────────────────
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  });
  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mql) return;
    const handler = (e) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return reduced;
}

// ─── Per-theme physics (mass + friction only) ───────────────────────────────
// mass:     affects initial animation velocity: anim_vel = gesture_vel / mass
// friction: per-frame velocity decay: vel *= (1 - friction). Higher = stops faster.
export const DEFAULT_PHYSICS = {
  dark:    { mass: 1.0, friction: 0.08 },  // responsive, stops quickly
  light:   { mass: 1.5, friction: 0.06 },  // heavier, glides longer
  fallout: { mass: 1.0, friction: 0.05 },  // looser, travels farther
};

const _physicsOverrides = { fallout: null, dark: null, light: null };

export function setPhysicsOverride(theme, values) {
  _physicsOverrides[theme] = values ? { ...values } : null;
}
export function clearPhysicsOverrides() {
  _physicsOverrides.fallout = null;
  _physicsOverrides.dark = null;
  _physicsOverrides.light = null;
}
function getPhysics(theme) {
  return _physicsOverrides[theme] || DEFAULT_PHYSICS[theme] || DEFAULT_PHYSICS.dark;
}

// ─── Friction deceleration loop ─────────────────────────────────────────────
// No spring. No bounce. Velocity decays under friction until it stops.
// Snaps to discrete positions as it crosses boundaries. Tick on each crossing.
function runFriction({ velocity, friction, onSnap, onComplete }) {
  let vel = velocity; // in items/frame (~16ms)
  let position = 0;   // fractional item offset from start
  let lastSnapped = 0;
  let raf = null;

  function step() {
    vel *= (1 - friction);
    position += vel;

    // Check if we crossed an item boundary
    const currentSnap = Math.round(position);
    if (currentSnap !== lastSnapped) {
      playTick(false);
      lastSnapped = currentSnap;
    }

    // Stop when velocity is negligible
    if (Math.abs(vel) < 0.01) {
      const finalSnap = Math.round(position);
      if (finalSnap !== 0) {
        onSnap(finalSnap);
        playTick(true); // deeper "lock-in" tick
      }
      onComplete?.();
      return;
    }

    raf = requestAnimationFrame(step);
  }

  raf = requestAnimationFrame(step);
  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ─── Constants ──────────────────────────────────────────────────────────────
const ITEM_WIDTH = 74;
const VELOCITY_THRESHOLD = 0.5; // px/ms — below = ratchet, above = momentum

// ─── Variant: Flat (fallback / reduced motion) ──────────────────────────────
function renderFlat(items, currentIndex, { containerWidth, onItemClick }) {
  const center = containerWidth / 2 - ITEM_WIDTH / 2;
  const tx = -(currentIndex * ITEM_WIDTH) + center;
  return (
    <div className="flex items-center justify-center relative overflow-hidden" style={{ height: 68 }}>
      <div className="flex items-center will-change-transform" style={{ transform: `translateX(${tx}px)` }}>
        {items.map((item, i) => {
          const d = i - currentIndex;
          const isCenter = d === 0;
          const isAdjacent = Math.abs(d) === 1;
          const isFar = Math.abs(d) >= 2;
          const isDimmed = item.dim && !isCenter;
          const boxSize = isCenter ? 42 : isAdjacent ? 30 : 22;
          const iconSize = isCenter ? 17 : isAdjacent ? 12 : 11;
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex flex-col items-center justify-center flex-shrink-0 cursor-pointer"
              style={{ width: ITEM_WIDTH, opacity: (isFar || isDimmed) ? 0.15 : 1, transition: 'opacity 0.2s' }}
              onClick={() => onItemClick(i)}>
              <div className="flex items-center justify-center" style={{
                width: boxSize, height: boxSize,
                border: `1.5px solid ${isCenter ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                borderRadius: isCenter ? 10 : 6,
                background: isCenter ? 'var(--ll-bg-active, hsl(var(--secondary)))' : 'hsl(var(--card))',
                transition: 'all 0.2s',
              }}>
                <Icon style={{ width: iconSize, height: iconSize,
                  color: isCenter ? 'hsl(var(--primary))' : isAdjacent ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground) / 0.5)',
                  transition: 'all 0.2s',
                }} strokeWidth={1.5} />
              </div>
              <span style={{ fontSize: isCenter ? 10 : 8,
                color: isCenter ? 'hsl(var(--primary))' : isAdjacent ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground) / 0.5)',
                fontWeight: isCenter ? 500 : 400, marginTop: isCenter ? 3 : 2,
                whiteSpace: 'nowrap', letterSpacing: '0.3px', transition: 'all 0.2s',
              }}>{item.label}</span>
            </div>
          );
        })}
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(90deg, var(--ll-bg-base, hsl(var(--background))) 0%, transparent 18%, transparent 82%, var(--ll-bg-base, hsl(var(--background))) 100%)',
      }} />
    </div>
  );
}

// ─── Variant: Drum (Fallout) ────────────────────────────────────────────────
function renderDrum(items, currentIndex, { onItemClick }) {
  const count = items.length;
  const angleStep = 360 / Math.max(count, 6);
  const radius = 120;
  const totalAngle = -currentIndex * angleStep;

  return (
    <div className="flex items-center justify-center relative overflow-hidden" style={{ height: 80 }}>
      <div style={{ perspective: 600, perspectiveOrigin: '50% 50%', width: '100%', height: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          transformStyle: 'preserve-3d', transform: `rotateY(${totalAngle}deg)`,
          width: 0, height: 0, position: 'relative',
        }}>
          {items.map((item, i) => {
            const angle = i * angleStep;
            const Icon = item.icon;
            const relAngle = ((i - currentIndex) * angleStep + 360 * 5) % 360;
            const isFront = relAngle < 50 || relAngle > 310;
            const isNear = relAngle < 90 || relAngle > 270;
            const isDimmed = item.dim && i !== currentIndex;
            return (
              <div key={item.id} style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: `rotateY(${angle}deg) translateZ(${radius}px) translate(-50%, -50%)`,
                backfaceVisibility: 'hidden',
                opacity: isDimmed ? 0.1 : isNear ? 1 : 0,
                transition: 'opacity 0.15s', cursor: 'pointer',
              }} onClick={() => onItemClick(i)}>
                <div className="flex flex-col items-center" style={{ width: 64 }}>
                  <div className="flex items-center justify-center" style={{
                    width: isFront ? 44 : 32, height: isFront ? 44 : 32,
                    border: `1.5px solid ${i === currentIndex ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                    borderRadius: i === currentIndex ? 10 : 6,
                    background: i === currentIndex ? 'hsl(var(--card))' : 'hsl(var(--secondary))',
                    transition: 'all 0.15s',
                  }}>
                    <Icon style={{ width: isFront ? 18 : 13, height: isFront ? 18 : 13,
                      color: i === currentIndex ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                      transition: 'all 0.15s',
                    }} strokeWidth={1.5} />
                  </div>
                  {isFront && (
                    <span style={{ fontSize: i === currentIndex ? 10 : 8,
                      color: i === currentIndex ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                      fontWeight: i === currentIndex ? 500 : 400,
                      marginTop: 3, whiteSpace: 'nowrap', letterSpacing: '0.3px', textAlign: 'center',
                    }}>{item.label}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(90deg, var(--ll-bg-base, hsl(var(--background))) 0%, transparent 25%, transparent 75%, var(--ll-bg-base, hsl(var(--background))) 100%)',
      }} />
    </div>
  );
}

// ─── Variant: Cover Flow (Gold Standard / Cloud) ────────────────────────────
function renderCoverFlow(items, currentIndex, { containerWidth, onItemClick }) {
  const CARD_WIDTH = 56;
  const SPREAD = 60;
  const ROTATE_ANGLE = 40;
  const CENTER_Z = 40;
  const SIDE_SCALE = 0.72;
  const VISIBLE_SIDES = 2;
  const centerX = containerWidth / 2;

  return (
    <div className="flex items-center justify-center relative overflow-hidden"
      style={{ height: 80, perspective: 500, perspectiveOrigin: '50% 50%' }}>
      {items.map((item, i) => {
        const d = i - currentIndex;
        const absD = Math.abs(d);
        const isCenter = d === 0;
        const isDimmed = item.dim && !isCenter;
        const Icon = item.icon;
        if (absD > VISIBLE_SIDES + 1) return null;

        let tx, rotY, z, scale, opacity;
        if (isCenter) {
          tx = 0; rotY = 0; z = CENTER_Z; scale = 1; opacity = 1;
        } else {
          const sign = d > 0 ? 1 : -1;
          tx = sign * (CARD_WIDTH / 2 + SPREAD * Math.min(absD, VISIBLE_SIDES + 0.5));
          rotY = -sign * ROTATE_ANGLE;
          z = 0;
          scale = SIDE_SCALE - (Math.max(0, absD - 1)) * 0.08;
          opacity = Math.max(0, 1 - Math.max(0, absD - 1) * 0.4);
        }
        if (isDimmed) opacity *= 0.15;
        const boxSize = isCenter ? 44 : 34;
        const iconSize = isCenter ? 18 : 13;

        return (
          <div key={item.id} style={{
            position: 'absolute', left: centerX - CARD_WIDTH / 2, top: '50%', width: CARD_WIDTH,
            transform: `translateX(${tx}px) translateY(-50%) translateZ(${z}px) rotateY(${rotY}deg) scale(${scale})`,
            transformStyle: 'preserve-3d',
            zIndex: 100 - Math.round(absD * 10), opacity, cursor: 'pointer',
            transition: 'opacity 0.15s',
          }} onClick={() => onItemClick(i)}>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center" style={{
                width: boxSize, height: boxSize,
                border: `1.5px solid ${isCenter ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                borderRadius: isCenter ? 12 : 8,
                background: isCenter ? 'var(--ll-bg-active, hsl(var(--secondary)))' : 'hsl(var(--card))',
                boxShadow: isCenter ? '0 4px 20px hsl(var(--primary) / 0.15)' : 'none',
                transition: 'all 0.15s',
              }}>
                <Icon style={{ width: iconSize, height: iconSize,
                  color: isCenter ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  transition: 'all 0.15s',
                }} strokeWidth={1.5} />
              </div>
              <span style={{ fontSize: isCenter ? 10 : 8,
                color: isCenter ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.7)',
                fontWeight: isCenter ? 500 : 400, marginTop: 3,
                whiteSpace: 'nowrap', letterSpacing: '0.3px', textAlign: 'center',
                transition: 'all 0.15s',
              }}>{item.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Variant + theme maps ───────────────────────────────────────────────────
const VARIANT_MAP = { flat: renderFlat, drum: renderDrum, coverFlow: renderCoverFlow };
const THEME_VARIANT = { dark: 'coverFlow', light: 'coverFlow', fallout: 'drum' };

// ─── Core SpaceSpinner ──────────────────────────────────────────────────────
export default function SpaceSpinner({ items = [], currentIndex = 0, onSelect, variant: variantProp }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const theme = useTheme();
  const reducedMotion = usePrefersReducedMotion();
  const variant = reducedMotion ? 'flat' : (variantProp || THEME_VARIANT[theme] || 'coverFlow');
  const renderVariant = VARIANT_MAP[variant] || renderCoverFlow;
  const physics = getPhysics(theme);

  // ─── Container measurement ───
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.offsetWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── State ───
  const dragRef = useRef({
    active: false, startX: 0, currentOffset: 0,
    lastX: 0, lastTime: 0, velocity: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragSnapIndex, setDragSnapIndex] = useState(currentIndex);
  const frictionCancelRef = useRef(null);
  const lastDragSnapRef = useRef(currentIndex);

  const handleSelect = useCallback((idx) => {
    if (idx < 0 || idx >= items.length) return;
    onSelect?.(idx);
  }, [items.length, onSelect]);

  // Trackpad conflict prevention
  const wheelActiveRef = useRef(false);
  const wheelCooldownRef = useRef(null);

  // ─── Pointer handlers ───
  const handlePointerDown = useCallback((e) => {
    if (wheelActiveRef.current) return;
    frictionCancelRef.current?.();
    const d = dragRef.current;
    d.active = true; d.startX = e.clientX; d.currentOffset = 0;
    d.lastX = e.clientX; d.lastTime = Date.now(); d.velocity = 0;
    setIsDragging(true);
    setDragSnapIndex(currentIndex);
    lastDragSnapRef.current = currentIndex;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [currentIndex]);

  const handlePointerMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    d.currentOffset = dx;
    const now = Date.now();
    const dt = now - d.lastTime;
    if (dt > 0) d.velocity = (e.clientX - d.lastX) / dt;
    d.lastX = e.clientX; d.lastTime = now;

    // Live snap: quantize to nearest item (scroll/conveyor direction)
    const snapped = Math.max(0, Math.min(items.length - 1,
      currentIndex + Math.round(-dx / ITEM_WIDTH)
    ));
    if (snapped !== lastDragSnapRef.current) {
      playTick(false);
      lastDragSnapRef.current = snapped;
    }
    setDragSnapIndex(snapped);
  }, [currentIndex, items.length]);

  const handlePointerUp = useCallback(() => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false; setIsDragging(false);
    const velocity = Math.max(-1.5, Math.min(1.5, d.velocity));
    const absVel = Math.abs(velocity);

    // ── RATCHET MODE (slow drag) ──
    // Commit live-snapped index. Zero animation. Instant lock.
    if (absVel < VELOCITY_THRESHOLD) {
      if (dragSnapIndex !== currentIndex) {
        playTick(true);
        handleSelect(dragSnapIndex);
      }
      return;
    }

    // ── MOMENTUM MODE (fast flick) ──
    // Convert gesture velocity to items/frame, run friction deceleration
    const { mass, friction } = physics;
    // velocity is px/ms → convert to items/frame (~16ms per frame)
    const itemsPerFrame = (-velocity * 16) / (ITEM_WIDTH * mass);

    frictionCancelRef.current = runFriction({
      velocity: itemsPerFrame,
      friction,
      onSnap: (totalDelta) => {
        const targetIdx = Math.max(0, Math.min(items.length - 1, currentIndex + totalDelta));
        if (targetIdx !== currentIndex) {
          handleSelect(targetIdx);
        }
      },
      onComplete: () => { frictionCancelRef.current = null; },
    });
  }, [currentIndex, items.length, handleSelect, physics, dragSnapIndex]);

  // ─── Wheel handler ───
  const wheelTimerRef = useRef(null);
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    wheelActiveRef.current = true;
    clearTimeout(wheelCooldownRef.current);
    wheelCooldownRef.current = setTimeout(() => { wheelActiveRef.current = false; }, 300);
    if (wheelTimerRef.current) return;
    wheelTimerRef.current = setTimeout(() => { wheelTimerRef.current = null; }, 120);

    let nextIdx = currentIndex;
    if (e.deltaY > 0 || e.deltaX > 0) {
      if (currentIndex < items.length - 1) nextIdx = currentIndex + 1;
    } else if (e.deltaY < 0 || e.deltaX < 0) {
      if (currentIndex > 0) nextIdx = currentIndex - 1;
    }
    if (nextIdx !== currentIndex) {
      playTick(true);
      handleSelect(nextIdx);
    }
  }, [currentIndex, items.length, handleSelect]);

  // ─── Click handler ───
  const onItemClick = useCallback((i) => {
    if (Math.abs(dragRef.current.currentOffset) < 5) {
      if (i !== currentIndex) {
        playTick(true);
        handleSelect(i);
      }
    }
  }, [currentIndex, handleSelect]);

  // Clean up on unmount
  useEffect(() => () => frictionCancelRef.current?.(), []);

  // ─── Render ───
  const effectiveIndex = isDragging ? dragSnapIndex : currentIndex;

  if (containerWidth === 0) {
    return <div ref={containerRef} style={{ padding: '14px 0 6px', height: 94 }} />;
  }

  return (
    <div
      ref={containerRef}
      className="select-none touch-none cursor-grab active:cursor-grabbing relative"
      style={{ padding: '14px 0 6px' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      {renderVariant(items, effectiveIndex, {
        containerWidth,
        isDragging,
        onItemClick,
      })}

      {/* Dot indicator */}
      <div className="flex justify-center items-center gap-1" style={{ marginTop: 4, height: 8 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{
            width: i === effectiveIndex ? 6 : 3, height: 3, borderRadius: 2,
            background: i === effectiveIndex ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)',
            transition: 'all 0.2s',
          }} />
        ))}
      </div>
    </div>
  );
}
