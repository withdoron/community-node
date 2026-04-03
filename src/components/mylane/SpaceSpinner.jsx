/**
 * SpaceSpinner — 3D space picker with per-theme physics and variant rendering.
 *
 * Architecture: shared core (state, events, audio, spring physics) + variant render functions.
 * Theme determines: variant (drum/coverFlow/flat), physics (stiffness/damping/mass/friction).
 * Variants are pure functions: (items, currentIndex, opts) → JSX.
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
function playTick(index) {
  if (!isSoundEnabled()) return;
  try { if (navigator.vibrate) navigator.vibrate(8); } catch {}
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 440 + index * 60;
    osc.type = 'sine';
    gain.gain.value = 0.05;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(); osc.stop(ctx.currentTime + 0.04);
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

// ─── Reduced motion detection ────────────────────────────────────────────────
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

// ─── Per-theme physics ──────────────────────────────────────────────────────
// stiffness: higher = snappier snap-to-position
// damping:   lower = more overshoot/bounce. ratio ~= damping / (2 * sqrt(stiffness * mass))
// mass:      higher = heavier, slower to accelerate and decelerate
// friction:  momentum multiplier on release (px of lookahead per px/ms velocity)
// Default (shipped) physics values — the fallback when no overrides are active
export const DEFAULT_PHYSICS = {
  fallout: { stiffness: 120, damping: 8, mass: 1, friction: 180 },
  dark:    { stiffness: 200, damping: 20, mass: 1, friction: 100 },
  light:   { stiffness: 140, damping: 16, mass: 1.6, friction: 130 },
};

// Mutable runtime overrides — the Dev Lab tuning panel writes here directly.
// The spring rAF loop reads from getPhysics() every time it creates a spring,
// so changes take effect on the next interaction. No React re-render needed.
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

// ─── Spring simulation ──────────────────────────────────────────────────────
// Drives snap-to-position with natural velocity inheritance.
// displacement starts at (oldPos - newPos), velocity from gesture.
// Settles to 0 — the target position is always 0 displacement.
function runSpring({ stiffness, damping, mass, initialDisplacement, initialVelocity, onUpdate, onComplete }) {
  let displacement = initialDisplacement;
  let velocity = initialVelocity;
  let lastTime = performance.now();
  let raf = null;

  function step(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.032); // cap at ~30fps to prevent spiral
    lastTime = now;

    // F = -kx - cv (spring force - damping force)
    const acceleration = (-stiffness * displacement - damping * velocity) / mass;
    velocity += acceleration * dt;
    displacement += velocity * dt;

    onUpdate(displacement);

    // Settle when both displacement and velocity are negligible
    if (Math.abs(displacement) < 0.3 && Math.abs(velocity) < 0.5) {
      onUpdate(0);
      onComplete?.();
      return;
    }

    raf = requestAnimationFrame(step);
  }

  raf = requestAnimationFrame(step);

  // Return cancel function
  return () => { if (raf) cancelAnimationFrame(raf); };
}

// ─── Constants ──────────────────────────────────────────────────────────────
const ITEM_WIDTH = 74;

// ─── Variant: Flat (fallback / reduced motion) ──────────────────────────────
function renderFlat(items, currentIndex, { containerWidth, translateX, isDragging, springOffset, onItemClick }) {
  const finalTx = translateX + (springOffset || 0);
  return (
    <div className="flex items-center justify-center relative overflow-hidden" style={{ height: 68 }}>
      <div
        className="flex items-center will-change-transform"
        style={{ transform: `translateX(${finalTx}px)` }}
      >
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
              style={{ width: ITEM_WIDTH, opacity: (isFar || isDimmed) ? 0.15 : 1, transition: 'opacity 0.25s' }}
              onClick={() => onItemClick(i)}
            >
              <div className="flex items-center justify-center" style={{
                width: boxSize, height: boxSize,
                border: `1.5px solid ${isCenter ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                borderRadius: isCenter ? 10 : 6,
                background: isCenter ? 'var(--ll-bg-active, hsl(var(--secondary)))' : 'hsl(var(--card))',
                transition: 'all 0.25s',
              }}>
                <Icon style={{ width: iconSize, height: iconSize,
                  color: isCenter ? 'hsl(var(--primary))' : isAdjacent ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground) / 0.5)',
                  transition: 'all 0.25s',
                }} strokeWidth={1.5} />
              </div>
              <span style={{ fontSize: isCenter ? 10 : 8,
                color: isCenter ? 'hsl(var(--primary))' : isAdjacent ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground) / 0.5)',
                fontWeight: isCenter ? 500 : 400, marginTop: isCenter ? 3 : 2,
                whiteSpace: 'nowrap', letterSpacing: '0.3px', transition: 'all 0.25s',
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
function renderDrum(items, currentIndex, { isDragging, dragAngleOffset, springAngleOffset, onItemClick }) {
  const count = items.length;
  const angleStep = 360 / Math.max(count, 6);
  const radius = 120;
  const totalAngle = -currentIndex * angleStep + (isDragging ? dragAngleOffset : (springAngleOffset || 0));

  return (
    <div className="flex items-center justify-center relative overflow-hidden" style={{ height: 80 }}>
      <div style={{ perspective: 600, perspectiveOrigin: '50% 50%', width: '100%', height: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          transformStyle: 'preserve-3d',
          transform: `rotateY(${totalAngle}deg)`,
          width: 0, height: 0, position: 'relative',
        }}>
          {items.map((item, i) => {
            const angle = i * angleStep;
            const Icon = item.icon;
            const relAngle = ((i - currentIndex) * angleStep + (isDragging ? dragAngleOffset : (springAngleOffset || 0)) + 360 * 5) % 360;
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
                    transition: 'all 0.2s',
                  }}>
                    <Icon style={{ width: isFront ? 18 : 13, height: isFront ? 18 : 13,
                      color: i === currentIndex ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                      transition: 'all 0.2s',
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
function renderCoverFlow(items, currentIndex, { containerWidth, isDragging, dragOffset, springOffset, onItemClick }) {
  const CARD_WIDTH = 56;
  const SPREAD = 60;
  const ROTATE_ANGLE = 40;
  const CENTER_Z = 40;
  const SIDE_SCALE = 0.72;
  const VISIBLE_SIDES = 2;
  const centerX = containerWidth / 2;
  // Spring offset shifts all items during snap animation
  const pixelShift = isDragging ? dragOffset : (springOffset || 0);

  return (
    <div className="flex items-center justify-center relative overflow-hidden"
      style={{ height: 80, perspective: 500, perspectiveOrigin: '50% 50%' }}
    >
      {items.map((item, i) => {
        const d = i - currentIndex;
        const rawD = d + (-pixelShift / SPREAD);
        const absD = Math.abs(rawD);
        const isCenter = absD < 0.15 && !isDragging;
        const isDimmed = item.dim && !isCenter;
        const Icon = item.icon;
        if (absD > VISIBLE_SIDES + 1) return null;

        let tx, rotY, z, scale, opacity;
        if (absD < 0.1 && !isDragging && Math.abs(springOffset || 0) < 2) {
          tx = 0; rotY = 0; z = CENTER_Z; scale = 1; opacity = 1;
        } else {
          const sign = rawD > 0 ? 1 : -1;
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
            transition: isDragging ? 'opacity 0.1s' : 'opacity 0.2s',
          }} onClick={() => onItemClick(i)}>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center" style={{
                width: boxSize, height: boxSize,
                border: `1.5px solid ${isCenter ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                borderRadius: isCenter ? 12 : 8,
                background: isCenter ? 'var(--ll-bg-active, hsl(var(--secondary)))' : 'hsl(var(--card))',
                boxShadow: isCenter ? '0 4px 20px hsl(var(--primary) / 0.15)' : 'none',
                transition: 'all 0.25s',
              }}>
                <Icon style={{ width: iconSize, height: iconSize,
                  color: isCenter ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  transition: 'all 0.25s',
                }} strokeWidth={1.5} />
              </div>
              <span style={{ fontSize: isCenter ? 10 : 8,
                color: isCenter ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.7)',
                fontWeight: isCenter ? 500 : 400, marginTop: 3,
                whiteSpace: 'nowrap', letterSpacing: '0.3px', textAlign: 'center',
                transition: 'all 0.25s',
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
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [springOffset, setSpringOffset] = useState(0); // px offset during spring animation
  const [springAngleOffset, setSpringAngleOffset] = useState(0); // angle offset for drum
  const springCancelRef = useRef(null);

  const handleSelect = useCallback((idx) => {
    if (idx < 0 || idx >= items.length) return;
    playTick(idx);
    onSelect?.(idx);
  }, [items.length, onSelect]);

  // Trackpad conflict prevention
  const wheelActiveRef = useRef(false);
  const wheelCooldownRef = useRef(null);

  // ─── Start spring animation ───
  const startSpring = useCallback((positionsDelta, gestureVelocityPxMs) => {
    // Cancel any running spring
    springCancelRef.current?.();

    if (reducedMotion || variant === 'flat') {
      setSpringOffset(0);
      setSpringAngleOffset(0);
      return;
    }

    const { stiffness, damping, mass } = physics;

    if (variant === 'drum') {
      // Drum: spring in angle space
      const angleStep = 360 / Math.max(items.length, 6);
      const initialAngle = positionsDelta * angleStep;
      const initialAngVel = -(gestureVelocityPxMs / ITEM_WIDTH) * angleStep * 1000; // convert to deg/s
      springCancelRef.current = runSpring({
        stiffness, damping, mass,
        initialDisplacement: initialAngle,
        initialVelocity: initialAngVel,
        onUpdate: (d) => setSpringAngleOffset(d),
        onComplete: () => { setSpringAngleOffset(0); springCancelRef.current = null; },
      });
    } else {
      // Cover flow / flat: spring in pixel space
      const initialPx = positionsDelta * ITEM_WIDTH;
      const initialVel = -gestureVelocityPxMs * 1000; // convert px/ms to px/s
      springCancelRef.current = runSpring({
        stiffness, damping, mass,
        initialDisplacement: initialPx,
        initialVelocity: initialVel,
        onUpdate: (d) => setSpringOffset(d),
        onComplete: () => { setSpringOffset(0); springCancelRef.current = null; },
      });
    }
  }, [physics, variant, items.length, reducedMotion]);

  // ─── Pointer handlers ───
  const handlePointerDown = useCallback((e) => {
    if (wheelActiveRef.current) return;
    // Cancel running spring
    springCancelRef.current?.();
    setSpringOffset(0);
    setSpringAngleOffset(0);
    const d = dragRef.current;
    d.active = true; d.startX = e.clientX; d.currentOffset = 0;
    d.lastX = e.clientX; d.lastTime = Date.now(); d.velocity = 0;
    setIsDragging(true); setDragOffset(0);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    d.currentOffset = dx;
    const now = Date.now();
    const dt = now - d.lastTime;
    if (dt > 0) d.velocity = (e.clientX - d.lastX) / dt;
    d.lastX = e.clientX; d.lastTime = now;
    setDragOffset(dx);
  }, []);

  const handlePointerUp = useCallback(() => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false; setIsDragging(false);
    const dx = d.currentOffset;
    const velocity = Math.max(-1.5, Math.min(1.5, d.velocity));
    if (Math.abs(dx) < 5) { setDragOffset(0); return; }

    // Theme-dependent momentum: friction controls how far flicks travel
    const momentumPx = velocity * physics.friction;
    const totalDelta = dx + momentumPx;
    const positionsDelta = Math.round(-totalDelta / ITEM_WIDTH);
    const targetIdx = Math.max(0, Math.min(items.length - 1, currentIndex + positionsDelta));
    setDragOffset(0);

    const actualDelta = targetIdx - currentIndex;
    if (actualDelta !== 0) {
      // Play ticks for intermediate positions
      const step = actualDelta > 0 ? 1 : -1;
      let tickIdx = currentIndex;
      const iv = setInterval(() => {
        tickIdx += step;
        if ((step > 0 && tickIdx > targetIdx) || (step < 0 && tickIdx < targetIdx)) { clearInterval(iv); return; }
        playTick(tickIdx);
      }, 50);
      // Commit selection immediately, animate visually via spring
      handleSelect(targetIdx);
      // Spring starts at old position relative to new (negative delta)
      startSpring(-actualDelta, velocity);
    }
  }, [currentIndex, items.length, handleSelect, physics.friction, startSpring]);

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
      handleSelect(nextIdx);
      startSpring(-(nextIdx - currentIndex), 0);
    }
  }, [currentIndex, items.length, handleSelect, startSpring]);

  // ─── Click handler ───
  const onItemClick = useCallback((i) => {
    if (Math.abs(dragRef.current.currentOffset) < 5) {
      const delta = i - currentIndex;
      if (delta !== 0) {
        handleSelect(i);
        startSpring(-delta, 0);
      }
    }
  }, [currentIndex, handleSelect, startSpring]);

  // Clean up spring on unmount
  useEffect(() => () => springCancelRef.current?.(), []);

  // ─── Computed values ───
  const getOffsetForIndex = useCallback((idx) => {
    return -(idx * ITEM_WIDTH) + containerWidth / 2 - ITEM_WIDTH / 2;
  }, [containerWidth]);

  const baseOffset = getOffsetForIndex(currentIndex);
  const translateX = isDragging ? baseOffset + dragOffset : baseOffset;
  const angleStep = 360 / Math.max(items.length, 6);
  const dragAngleOffset = isDragging ? (dragOffset / ITEM_WIDTH) * angleStep : 0;

  // ─── Loading ───
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
      {renderVariant(items, currentIndex, {
        containerWidth, translateX, isDragging,
        dragOffset, dragAngleOffset,
        springOffset, springAngleOffset,
        onItemClick,
      })}

      {/* Dot indicator */}
      <div className="flex justify-center items-center gap-1" style={{ marginTop: 4, height: 8 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{
            width: i === currentIndex ? 6 : 3, height: 3, borderRadius: 2,
            background: i === currentIndex ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>
    </div>
  );
}
