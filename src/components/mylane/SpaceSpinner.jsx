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
// iOS Safari requires AudioContext to be created AND resumed during a user gesture.
// We eagerly create + resume on the first touch/click, then all subsequent playTick
// calls can schedule oscillators immediately.
let _audioCtx = null;
let _audioReady = false;

function initAudio() {
  if (_audioCtx) {
    if (_audioCtx.state === 'suspended') {
      _audioCtx.resume().then(() => { _audioReady = true; }).catch(() => {});
    }
    return;
  }
  try {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // On iOS, context starts suspended. Resume it inside this gesture handler.
    if (_audioCtx.state === 'suspended') {
      _audioCtx.resume().then(() => { _audioReady = true; }).catch(() => {});
    } else {
      _audioReady = true;
    }
    // Play a silent buffer to fully unlock audio on iOS
    const buf = _audioCtx.createBuffer(1, 1, 22050);
    const src = _audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(_audioCtx.destination);
    src.start(0);
  } catch {}
}

function isSoundEnabled() {
  try { return localStorage.getItem('mylane_sound') !== '0'; } catch { return true; }
}

function playTick(final) {
  if (!isSoundEnabled() || !_audioCtx) return;
  // Ensure context is running (may have been suspended by OS)
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {});
    return; // skip this tick — next one will play
  }
  try { if (navigator.vibrate) navigator.vibrate(8); } catch {}
  try {
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.connect(gain); gain.connect(_audioCtx.destination);
    // Low mechanical click. Final landing tick is deeper.
    osc.frequency.value = final ? 260 : 320;
    osc.type = 'triangle';
    gain.gain.value = 0.07;
    gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.05);
    osc.start(); osc.stop(_audioCtx.currentTime + 0.05);
  } catch {}
}

// Initialize audio on ANY user gesture — touchstart covers iOS, pointerdown covers desktop
if (typeof document !== 'undefined') {
  const gestureInit = () => {
    initAudio();
    document.removeEventListener('touchstart', gestureInit);
    document.removeEventListener('pointerdown', gestureInit);
  };
  document.addEventListener('touchstart', gestureInit, { once: true, passive: true });
  document.addEventListener('pointerdown', gestureInit, { once: true });
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

// ─── Cockpit detection ───────────────────────────────────────────────────────
// Cockpit = which instrument the user operates Mylane from. Theme paints the
// panel; cockpit picks the instruments. Mirrors the theme plumbing exactly —
// localStorage + data-cockpit attribute + MutationObserver. Default: 'spinner'.
function getActiveCockpit() {
  if (typeof document === 'undefined') return 'spinner';
  return document.documentElement.getAttribute('data-cockpit') || 'spinner';
}
function useCockpit() {
  const [cockpit, setCockpit] = useState(getActiveCockpit);
  useEffect(() => {
    const observer = new MutationObserver(() => setCockpit(getActiveCockpit()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-cockpit'] });
    return () => observer.disconnect();
  }, []);
  return cockpit;
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
function runFriction({ velocity, friction, onStep, onComplete }) {
  let vel = velocity; // in items/frame (~16ms)
  let position = 0;   // fractional item offset from start
  let lastSnapped = 0;
  let raf = null;

  function step() {
    vel *= (1 - friction);
    position += vel;

    // Snap to each item boundary as we cross it — updates visual immediately
    const currentSnap = Math.round(position);
    if (currentSnap !== lastSnapped) {
      const delta = currentSnap - lastSnapped;
      lastSnapped = currentSnap;
      playTick(false);
      onStep(delta); // advances currentIndex by delta (usually ±1)
    }

    // Stop when velocity is negligible
    if (Math.abs(vel) < 0.01) {
      playTick(true); // deeper "lock-in" tick on final position
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

// ─── Variant: Compass (cockpit: compass) ────────────────────────────────────
// Horizontal compass dial. Active station sits centered under a fixed vertical
// needle. Stations slide under the needle during drag. Orientation arc below
// shows macro-position across the organism.
//
// Contract honored:
//   - items[i].dim renders quieter (per Dark Until Explored)
//   - prefers-reduced-motion handled at parent level (delegates to renderFlat)
//   - mylane_sound gates audio feedback via the same playTick shared util
//   - max render height 112px (within 120px budget)
//
// Bearings: soft convention mapping common space ids to cardinal degrees.
// mylane/home = 000° (N). East for active work, NW/W for inward/community.
// Falls back to even distribution around the compass if id isn't in the map.
const COMPASS_BEARINGS = {
  home: 0,
  mylane: 0,
  'field-service': 90,
  finance: 45,
  team: 135,
  business: 180,
  'property-pulse': 225,
  'meal-prep': 315,
  frequency: 315,
  discover: 270,
  'dev-lab': 45,
};

function getBearing(id, index, total) {
  if (id && COMPASS_BEARINGS[id] !== undefined) return COMPASS_BEARINGS[id];
  // Fallback: distribute evenly, index 0 at 0°
  if (total <= 1) return 0;
  return Math.round((index / total) * 360) % 360;
}

function padBearing(n) {
  const v = Math.max(0, Math.min(359, Math.round(n)));
  return v.toString().padStart(3, '0');
}

function OrientationArc({ items, currentIndex }) {
  const width = 180;
  const arcHeight = 20;
  // Always show up to 5 dots — compress if more items
  const dotCount = Math.min(Math.max(items.length, 1), 5);
  const pts = [];
  for (let i = 0; i < dotCount; i++) {
    const t = dotCount === 1 ? 0.5 : i / (dotCount - 1);
    const x = 16 + t * (width - 32);
    // Shallow arc — parabola rising slightly in the middle
    const y = arcHeight - Math.sin(t * Math.PI) * (arcHeight - 4);
    pts.push({ x, y });
  }
  const activeDotIdx = items.length <= 1
    ? 0
    : Math.round((currentIndex / (items.length - 1)) * (dotCount - 1));
  const startLabel = items[0]?.label?.toLowerCase() || '';
  const edgeLabel = items[items.length - 1]?.label?.toLowerCase() || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 36, gap: 2 }}>
      <svg width={width} height={arcHeight + 4} viewBox={`0 0 ${width} ${arcHeight + 4}`} style={{ display: 'block' }}>
        <path
          d={`M ${pts[0]?.x ?? 16} ${pts[0]?.y ?? arcHeight} Q ${width / 2} ${-2} ${pts[pts.length - 1]?.x ?? width - 16} ${pts[pts.length - 1]?.y ?? arcHeight}`}
          fill="none"
          stroke="hsl(var(--muted-foreground) / 0.25)"
          strokeWidth={1}
        />
        {pts.map((p, i) => {
          const isActive = i === activeDotIdx;
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={isActive ? 2.5 : 1.5}
              fill={isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.45)'}
            />
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', width, fontSize: 8, color: 'hsl(var(--muted-foreground) / 0.55)', letterSpacing: '0.3px' }}>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60 }}>{startLabel}</span>
        <span style={{ color: 'hsl(var(--primary))', fontWeight: 500 }}>here</span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 60, textAlign: 'right' }}>{edgeLabel}</span>
      </div>
    </div>
  );
}

function renderCompass(items, currentIndex, { containerWidth, onItemClick }) {
  // Station rhythm matches ITEM_WIDTH so drag math (which snaps every ITEM_WIDTH
  // pixels of gesture) visually aligns with stations passing under the needle.
  const STATION_WIDTH = ITEM_WIDTH;
  const center = containerWidth / 2 - STATION_WIDTH / 2;
  const tx = -(currentIndex * STATION_WIDTH) + center;
  const activeItem = items[currentIndex];
  const activeBearing = activeItem ? getBearing(activeItem.id, currentIndex, items.length) : 0;

  return (
    <div
      className="ll-compass"
      style={{ display: 'flex', flexDirection: 'column', height: 112, position: 'relative' }}
    >
      {/* Chrome row — 22px. Framing only: 'bearing' affordance label on the
          left, active degrees on the right. Active station identity lives on
          the strip, not here. Degrees still update live during drag as
          activeBearing is derived from currentIndex. */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', height: 22, flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 9, color: 'hsl(var(--muted-foreground) / 0.55)',
            letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 400,
          }}
        >
          bearing
        </span>
        <span
          className="ll-compass-bearing"
          style={{
            fontSize: 10, color: 'hsl(var(--muted-foreground))',
            letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums',
          }}
        >
          {padBearing(activeBearing)}°
        </span>
      </div>

      {/* Dial strip — 54px */}
      <div
        style={{
          position: 'relative', height: 54, overflow: 'hidden', flexShrink: 0,
        }}
      >
        {/* Sliding track */}
        <div
          className="will-change-transform"
          style={{
            position: 'absolute', top: 0, bottom: 0, left: 0,
            display: 'flex', alignItems: 'center',
            transform: `translateX(${tx}px)`,
            transition: 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {items.map((item, i) => {
            const d = i - currentIndex;
            const absD = Math.abs(d);
            const isCenter = d === 0;
            const isAdjacent = absD === 1;
            const isDimmed = item.dim && !isCenter;
            // Opacity: center 1.0, adjacent 0.45, further 0.2, hidden past 3
            let opacity;
            if (isCenter) opacity = 1;
            else if (isAdjacent) opacity = 0.5;
            else if (absD === 2) opacity = 0.28;
            else opacity = 0.12;
            if (isDimmed) opacity *= 0.5;
            const bearing = getBearing(item.id, i, items.length);
            // Active station stays in place and lights up in accent. Needle
            // passes through its name. Chrome row does not repeat its identity.
            // Inactive stations stay muted; distance-opacity does the fade.
            return (
              <div
                key={item.id}
                onClick={() => onItemClick(i)}
                style={{
                  width: STATION_WIDTH, flexShrink: 0,
                  textAlign: 'center', cursor: 'pointer',
                  opacity, transition: 'opacity 0.3s ease',
                }}
              >
                <div
                  className="ll-compass-station-label"
                  style={{
                    fontSize: isCenter ? 11 : 10,
                    color: isCenter ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                    fontWeight: isCenter ? 500 : 400,
                    letterSpacing: '0.3px', whiteSpace: 'nowrap',
                    transition: 'color 0.2s, font-size 0.2s, font-weight 0.2s',
                  }}
                >
                  {item.label.toLowerCase()}
                </div>
                <div
                  className="ll-compass-bearing"
                  style={{
                    fontSize: 8,
                    // Active bearing ties to the name in accent (at 75% to let
                    // the name lead). Inactive stays muted.
                    color: isCenter ? 'hsl(var(--primary) / 0.75)' : 'hsl(var(--muted-foreground))',
                    marginTop: 3, letterSpacing: '0.08em',
                    fontVariantNumeric: 'tabular-nums',
                    transition: 'color 0.2s',
                  }}
                >
                  {padBearing(bearing)}°
                </div>
              </div>
            );
          })}
        </div>

        {/* Needle — vertical line + arrow heads, fixed in center, fades through the word */}
        <div
          className="pointer-events-none"
          style={{
            position: 'absolute', top: 0, bottom: 0, left: '50%',
            transform: 'translateX(-50%)', width: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}
        >
          {/* Top arrow head */}
          <div
            style={{
              width: 0, height: 0,
              borderLeft: '3px solid transparent',
              borderRight: '3px solid transparent',
              borderTop: '5px solid hsl(var(--primary))',
              flexShrink: 0,
            }}
          />
          {/* Gradient line — transparent at ends, ~40% through center */}
          <div
            style={{
              flex: 1, width: 1,
              background: 'linear-gradient(180deg, hsl(var(--primary) / 0) 0%, hsl(var(--primary) / 0.4) 15%, hsl(var(--primary) / 0.4) 85%, hsl(var(--primary) / 0) 100%)',
            }}
          />
          {/* Bottom arrow head */}
          <div
            style={{
              width: 0, height: 0,
              borderLeft: '3px solid transparent',
              borderRight: '3px solid transparent',
              borderBottom: '5px solid hsl(var(--primary))',
              flexShrink: 0,
            }}
          />
        </div>

        {/* Edge fade — matches other variants' pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, var(--ll-bg-base, hsl(var(--background))) 0%, transparent 14%, transparent 86%, var(--ll-bg-base, hsl(var(--background))) 100%)',
          }}
        />
      </div>

      {/* Orientation arc — 36px */}
      <OrientationArc items={items} currentIndex={currentIndex} />
    </div>
  );
}

// ─── Variant + cockpit maps ────────────────────────────────────────────────
// VARIANT_MAP is the library of render functions. COCKPIT_VARIANT routes a
// cockpit id to a variant. 'spinner' cockpit preserves the original
// theme-driven selection (coverFlow default, drum in fallout). 'compass'
// always uses the compass variant regardless of theme — theme paints the
// colors via CSS variables.
const VARIANT_MAP = { flat: renderFlat, drum: renderDrum, coverFlow: renderCoverFlow, compass: renderCompass };
const THEME_VARIANT = { dark: 'coverFlow', light: 'coverFlow', fallout: 'drum' };

function resolveVariant({ cockpit, theme, reducedMotion, variantProp }) {
  if (reducedMotion) return 'flat';
  if (variantProp) return variantProp;
  if (cockpit === 'compass') return 'compass';
  // spinner cockpit (default) — theme picks the variant
  return THEME_VARIANT[theme] || 'coverFlow';
}

// ─── Core SpaceSpinner ──────────────────────────────────────────────────────
export default function SpaceSpinner({ items = [], currentIndex = 0, onSelect, variant: variantProp }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const theme = useTheme();
  const cockpit = useCockpit();
  const reducedMotion = usePrefersReducedMotion();
  const variant = resolveVariant({ cockpit, theme, reducedMotion, variantProp });
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
    // Convert gesture velocity to items/frame, run friction deceleration.
    // Each boundary crossing calls handleSelect to advance the spinner one step.
    const { mass, friction } = physics;
    const itemsPerFrame = (-velocity * 16) / (ITEM_WIDTH * mass);
    // Track running index via ref so rAF callbacks see latest value
    const runningIdx = { current: currentIndex };

    frictionCancelRef.current = runFriction({
      velocity: itemsPerFrame,
      friction,
      onStep: (delta) => {
        // delta is ±1 for each boundary crossed
        const nextIdx = Math.max(0, Math.min(items.length - 1, runningIdx.current + delta));
        if (nextIdx !== runningIdx.current) {
          runningIdx.current = nextIdx;
          handleSelect(nextIdx);
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

      {/* Dot indicator — orientation layer for spinner cockpit variants.
          Compass cockpit has its own orientation arc (with labeled dots),
          so this row would be a second position indicator doing the same
          job. Skip it for compass. */}
      {variant !== 'compass' && (
        <div className="flex justify-center items-center gap-1" style={{ marginTop: 4, height: 8 }}>
          {items.map((item, i) => (
            <div key={item.id} style={{
              width: i === effectiveIndex ? 6 : 3, height: 3, borderRadius: 2,
              background: i === effectiveIndex ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)',
              transition: 'all 0.2s',
            }} />
          ))}
        </div>
      )}
    </div>
  );
}
