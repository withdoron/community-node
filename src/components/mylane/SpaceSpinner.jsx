/**
 * SpaceSpinner — 3D space picker with variant rendering.
 * Always visible, even when drilled into a space.
 *
 * Architecture: shared core (state, events, audio) + variant render functions.
 * Theme determines variant: Fallout → drum, Gold Standard/Cloud → coverFlow.
 * Variants are pure functions: (items, currentIndex, opts) → JSX.
 *
 * Props:
 *   items        — [{id, label, icon: LucideIcon, dim?: boolean}]
 *   currentIndex — active position
 *   onSelect(index) — callback when user taps or swipes to a position
 *   variant      — override variant ('drum' | 'coverFlow' | 'flat'). Auto-detected from theme if omitted.
 */
import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';

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

// ─── Variant: Flat (fallback / reduced motion) ──────────────────────────────
const ITEM_WIDTH = 74;

function renderFlat(items, currentIndex, { containerWidth, translateX, isDragging, onItemClick }) {
  return (
    <div
      className="flex items-center justify-center relative overflow-hidden"
      style={{ height: 68 }}
    >
      <div
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
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="flex flex-col items-center justify-center flex-shrink-0 cursor-pointer"
              style={{
                width: ITEM_WIDTH,
                opacity: (isFar || isDimmed) ? 0.15 : 1,
                transition: isDragging ? 'opacity 0.1s' : 'all 0.32s cubic-bezier(0.22, 0.68, 0, 1)',
              }}
              onClick={() => onItemClick(i)}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: boxSize, height: boxSize,
                  border: `1.5px solid ${isCenter ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                  borderRadius: isCenter ? 10 : 6,
                  background: isCenter ? 'var(--ll-bg-active, hsl(var(--secondary)))' : 'hsl(var(--card))',
                  transition: isDragging ? 'none' : 'all 0.32s',
                }}
              >
                <Icon
                  style={{
                    width: iconSize, height: iconSize,
                    color: isCenter ? 'hsl(var(--primary))' : isAdjacent ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground) / 0.5)',
                    transition: isDragging ? 'none' : 'all 0.32s',
                  }}
                  strokeWidth={1.5}
                />
              </div>
              <span style={{
                fontSize: isCenter ? 10 : 8,
                color: isCenter ? 'hsl(var(--primary))' : isAdjacent ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground) / 0.5)',
                fontWeight: isCenter ? 500 : 400,
                marginTop: isCenter ? 3 : 2,
                whiteSpace: 'nowrap', letterSpacing: '0.3px',
                transition: isDragging ? 'none' : 'all 0.32s',
              }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Fade edges */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(90deg, var(--ll-bg-base, hsl(var(--background))) 0%, transparent 18%, transparent 82%, var(--ll-bg-base, hsl(var(--background))) 100%)',
      }} />
    </div>
  );
}

// ─── Variant: Drum (Fallout) ────────────────────────────────────────────────
function renderDrum(items, currentIndex, { containerWidth, isDragging, dragAngleOffset, onItemClick }) {
  const count = items.length;
  const angleStep = 360 / Math.max(count, 6); // min 6 slots to keep spacing
  const radius = 120; // px — depth of the cylinder

  return (
    <div className="flex items-center justify-center relative overflow-hidden" style={{ height: 80 }}>
      <div style={{
        perspective: 600,
        perspectiveOrigin: '50% 50%',
        width: '100%', height: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          transformStyle: 'preserve-3d',
          transform: `rotateY(${-currentIndex * angleStep + dragAngleOffset}deg)`,
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.22, 0.68, 0, 1.1)',
          width: 0, height: 0,
          position: 'relative',
        }}>
          {items.map((item, i) => {
            const angle = i * angleStep;
            const Icon = item.icon;
            // Compute relative angle to front
            const relAngle = ((i - currentIndex) * angleStep + dragAngleOffset + 360 * 5) % 360;
            const isFront = relAngle < 50 || relAngle > 310;
            const isNear = relAngle < 90 || relAngle > 270;
            const isDimmed = item.dim && i !== currentIndex;

            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  left: '50%', top: '50%',
                  transform: `rotateY(${angle}deg) translateZ(${radius}px) translate(-50%, -50%)`,
                  backfaceVisibility: 'hidden',
                  opacity: isDimmed ? 0.1 : isNear ? 1 : 0,
                  transition: isDragging ? 'opacity 0.1s' : 'opacity 0.3s',
                  cursor: 'pointer',
                }}
                onClick={() => onItemClick(i)}
              >
                <div className="flex flex-col items-center" style={{ width: 64 }}>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: isFront ? 44 : 32,
                      height: isFront ? 44 : 32,
                      border: `1.5px solid ${i === currentIndex ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                      borderRadius: i === currentIndex ? 10 : 6,
                      background: i === currentIndex ? 'hsl(var(--card))' : 'hsl(var(--secondary))',
                      transition: isDragging ? 'none' : 'all 0.3s',
                    }}
                  >
                    <Icon
                      style={{
                        width: isFront ? 18 : 13, height: isFront ? 18 : 13,
                        color: i === currentIndex ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                        transition: isDragging ? 'none' : 'all 0.3s',
                      }}
                      strokeWidth={1.5}
                    />
                  </div>
                  {isFront && (
                    <span style={{
                      fontSize: i === currentIndex ? 10 : 8,
                      color: i === currentIndex ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                      fontWeight: i === currentIndex ? 500 : 400,
                      marginTop: 3, whiteSpace: 'nowrap', letterSpacing: '0.3px',
                      textAlign: 'center',
                    }}>
                      {item.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Fade edges */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(90deg, var(--ll-bg-base, hsl(var(--background))) 0%, transparent 25%, transparent 75%, var(--ll-bg-base, hsl(var(--background))) 100%)',
      }} />
    </div>
  );
}

// ─── Variant: Cover Flow (Gold Standard / Cloud) ────────────────────────────
function renderCoverFlow(items, currentIndex, { containerWidth, isDragging, dragOffset, onItemClick }) {
  const CARD_WIDTH = 56;
  const SPREAD = 60; // px between adjacent cards
  const ROTATE_ANGLE = 40; // degrees for angled cards
  const CENTER_Z = 40; // how far center card pops forward
  const SIDE_SCALE = 0.72;
  const VISIBLE_SIDES = 2;
  const centerX = containerWidth / 2;

  return (
    <div
      className="flex items-center justify-center relative overflow-hidden"
      style={{ height: 80, perspective: 500, perspectiveOrigin: '50% 50%' }}
    >
      {items.map((item, i) => {
        const d = i - currentIndex;
        const rawD = d + (isDragging ? dragOffset / SPREAD : 0);
        const absD = Math.abs(rawD);
        const isCenter = d === 0 && !isDragging;
        const isDimmed = item.dim && !isCenter;
        const Icon = item.icon;

        // Hide items beyond visible range
        if (absD > VISIBLE_SIDES + 1) return null;

        // Calculate transforms
        let tx, rotY, z, scale, opacity;
        if (absD < 0.1 && !isDragging) {
          // Center
          tx = 0; rotY = 0; z = CENTER_Z; scale = 1; opacity = 1;
        } else {
          // Side cards
          const sign = rawD > 0 ? 1 : -1;
          tx = sign * (CARD_WIDTH / 2 + SPREAD * Math.min(absD, VISIBLE_SIDES + 0.5));
          rotY = -sign * ROTATE_ANGLE;
          z = 0;
          scale = SIDE_SCALE - (absD - 1) * 0.08;
          opacity = Math.max(0, 1 - (absD - 1) * 0.4);
        }

        if (isDimmed) opacity *= 0.15;
        const boxSize = isCenter ? 44 : 34;
        const iconSize = isCenter ? 18 : 13;

        return (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              left: centerX - CARD_WIDTH / 2,
              top: '50%',
              width: CARD_WIDTH,
              transform: `translateX(${tx}px) translateY(-50%) translateZ(${z}px) rotateY(${rotY}deg) scale(${scale})`,
              transformStyle: 'preserve-3d',
              zIndex: 100 - Math.round(absD * 10),
              opacity,
              transition: isDragging ? 'opacity 0.1s' : 'all 0.38s cubic-bezier(0.22, 0.68, 0, 1.05)',
              cursor: 'pointer',
            }}
            onClick={() => onItemClick(i)}
          >
            <div className="flex flex-col items-center">
              <div
                className="flex items-center justify-center"
                style={{
                  width: boxSize, height: boxSize,
                  border: `1.5px solid ${isCenter ? 'hsl(var(--primary))' : 'hsl(var(--border))'}`,
                  borderRadius: isCenter ? 12 : 8,
                  background: isCenter ? 'var(--ll-bg-active, hsl(var(--secondary)))' : 'hsl(var(--card))',
                  boxShadow: isCenter ? '0 4px 20px hsl(var(--primary) / 0.15)' : 'none',
                  transition: isDragging ? 'none' : 'all 0.38s',
                }}
              >
                <Icon
                  style={{
                    width: iconSize, height: iconSize,
                    color: isCenter ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    transition: isDragging ? 'none' : 'all 0.38s',
                  }}
                  strokeWidth={1.5}
                />
              </div>
              <span style={{
                fontSize: isCenter ? 10 : 8,
                color: isCenter ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.7)',
                fontWeight: isCenter ? 500 : 400,
                marginTop: 3, whiteSpace: 'nowrap', letterSpacing: '0.3px',
                textAlign: 'center',
                transition: isDragging ? 'none' : 'all 0.38s',
              }}>
                {item.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Variant map ────────────────────────────────────────────────────────────
const VARIANT_MAP = {
  flat: renderFlat,
  drum: renderDrum,
  coverFlow: renderCoverFlow,
};

const THEME_VARIANT = {
  dark: 'coverFlow',    // Gold Standard
  light: 'coverFlow',   // Cloud
  fallout: 'drum',      // Fallout
};

// ─── Core SpaceSpinner ──────────────────────────────────────────────────────
export default function SpaceSpinner({ items = [], currentIndex = 0, onSelect, variant: variantProp }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const theme = useTheme();
  const reducedMotion = usePrefersReducedMotion();
  const variant = reducedMotion ? 'flat' : (variantProp || THEME_VARIANT[theme] || 'coverFlow');
  const renderVariant = VARIANT_MAP[variant] || renderCoverFlow;

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

  // ─── Drag / momentum state ───
  const dragRef = useRef({
    active: false, startX: 0, currentOffset: 0,
    lastX: 0, lastTime: 0, velocity: 0,
  });
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const animFrameRef = useRef(null);

  const handleSelect = useCallback((idx) => {
    if (idx < 0 || idx >= items.length) return;
    playTick(idx);
    onSelect?.(idx);
  }, [items.length, onSelect]);

  // Trackpad / pointer conflict prevention
  const wheelActiveRef = useRef(false);
  const wheelCooldownRef = useRef(null);

  // ─── Pointer handlers ───
  const handlePointerDown = useCallback((e) => {
    if (wheelActiveRef.current) return;
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
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
    const momentumPx = velocity * 120;
    const totalDelta = dx + momentumPx;
    const positionsDelta = Math.round(-totalDelta / ITEM_WIDTH);
    const targetIdx = Math.max(0, Math.min(items.length - 1, currentIndex + positionsDelta));
    setDragOffset(0);
    if (targetIdx !== currentIndex) {
      const step = targetIdx > currentIndex ? 1 : -1;
      let tickIdx = currentIndex;
      const iv = setInterval(() => {
        tickIdx += step;
        if ((step > 0 && tickIdx > targetIdx) || (step < 0 && tickIdx < targetIdx)) { clearInterval(iv); return; }
        playTick(tickIdx);
      }, 50);
      handleSelect(targetIdx);
    }
  }, [currentIndex, items.length, handleSelect]);

  // ─── Wheel handler ───
  const wheelTimerRef = useRef(null);
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    wheelActiveRef.current = true;
    clearTimeout(wheelCooldownRef.current);
    wheelCooldownRef.current = setTimeout(() => { wheelActiveRef.current = false; }, 300);
    if (wheelTimerRef.current) return;
    wheelTimerRef.current = setTimeout(() => { wheelTimerRef.current = null; }, 120);
    if (e.deltaY > 0 || e.deltaX > 0) {
      if (currentIndex < items.length - 1) handleSelect(currentIndex + 1);
    } else if (e.deltaY < 0 || e.deltaX < 0) {
      if (currentIndex > 0) handleSelect(currentIndex - 1);
    }
  }, [currentIndex, items.length, handleSelect]);

  // ─── Click handler for items (only if not dragging) ───
  const onItemClick = useCallback((i) => {
    if (Math.abs(dragRef.current.currentOffset) < 5) handleSelect(i);
  }, [handleSelect]);

  // ─── Computed values for variants ───
  const getOffsetForIndex = useCallback((idx) => {
    return -(idx * ITEM_WIDTH) + containerWidth / 2 - ITEM_WIDTH / 2;
  }, [containerWidth]);

  const baseOffset = getOffsetForIndex(currentIndex);
  const translateX = isDragging ? baseOffset + dragOffset : baseOffset;

  // Drum variant needs angle offset instead of pixel offset
  const angleStep = 360 / Math.max(items.length, 6);
  const dragAngleOffset = isDragging ? (dragOffset / ITEM_WIDTH) * angleStep : 0;

  // ─── Loading state ───
  if (containerWidth === 0) {
    return <div ref={containerRef} style={{ padding: '14px 0 6px', height: 94 }} />;
  }

  // ─── Render ───
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
        containerWidth,
        translateX,
        isDragging,
        dragOffset,
        dragAngleOffset,
        onItemClick,
      })}

      {/* Dot indicator */}
      <div className="flex justify-center items-center gap-1" style={{ marginTop: 4, height: 8 }}>
        {items.map((item, i) => (
          <div
            key={item.id}
            style={{
              width: i === currentIndex ? 6 : 3,
              height: 3,
              borderRadius: 2,
              background: i === currentIndex ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
