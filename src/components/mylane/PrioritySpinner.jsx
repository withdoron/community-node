/**
 * PrioritySpinner — vertical gallery-style priority picker with momentum swipe.
 * Used inside HomeFeed for Attention / This week / Spaces tabs.
 * CSS values from MOCKUP-SPINNER-V6-FINAL.html.
 */
import React, { useRef, useCallback, useState } from 'react';

const ITEM_HEIGHT = 57;

// ─── Shared AudioContext (iOS Safari) ───
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

function playVerticalTick(index) {
  if (!isSoundEnabled()) return;
  try { if (navigator.vibrate) navigator.vibrate(8); } catch {}
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
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
  } catch {}
}

const BAR_COLORS = {
  ur: 'var(--ll-bar-urgent, #ef4444)', ac: 'var(--ll-bar-action, #f59e0b)', ev: 'var(--ll-bar-event, #3b82f6)', lf: 'var(--ll-bar-life, #22c55e)',
};

export default function PrioritySpinner({ items = [], currentIndex = 0, onSelect, onOpenSpace }) {
  const dragRef = useRef({ active: false, startY: 0, currentOffset: 0, lastY: 0, lastTime: 0, velocity: 0 });
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleSelect = useCallback((idx) => {
    if (idx < 0 || idx >= items.length) return;
    playVerticalTick(idx);
    onSelect?.(idx);
  }, [items.length, onSelect]);

  const handlePointerDown = useCallback((e) => {
    const d = dragRef.current;
    d.active = true;
    d.startY = e.clientY;
    d.currentOffset = 0;
    d.lastY = e.clientY;
    d.lastTime = Date.now();
    d.velocity = 0;
    setIsDragging(true);
    setDragOffset(0);
  }, []);

  const handlePointerMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dy = e.clientY - d.startY;
    d.currentOffset = dy;
    const now = Date.now();
    const dt = now - d.lastTime;
    if (dt > 0) d.velocity = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastTime = now;
    setDragOffset(dy);
  }, []);

  const handlePointerUp = useCallback(() => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    setIsDragging(false);
    const dy = d.currentOffset;
    if (Math.abs(dy) < 5) { setDragOffset(0); return; }
    const momentumPx = d.velocity * 120;
    const totalDelta = dy + momentumPx;
    const positionsDelta = Math.round(-totalDelta / ITEM_HEIGHT);
    const targetIdx = Math.max(0, Math.min(items.length - 1, currentIndex + positionsDelta));
    setDragOffset(0);
    if (targetIdx !== currentIndex) handleSelect(targetIdx);
  }, [currentIndex, items.length, handleSelect]);

  if (items.length === 0) {
    return <div style={{ textAlign: 'center', padding: '60px 20px', color: '#1e293b', fontSize: 13 }}>All clear</div>;
  }

  const baseY = -(currentIndex * ITEM_HEIGHT) + 90;
  const translateY = isDragging ? baseY + dragOffset : baseY;

  return (
    <div
      className="relative overflow-hidden select-none touch-none cursor-grab active:cursor-grabbing"
      style={{ flex: 1, minHeight: 200 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="will-change-transform"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.32s cubic-bezier(0.22, 0.68, 0, 1)',
          padding: '8px 20px',
        }}
      >
        {items.map((item, i) => {
          const d = i - currentIndex;
          const isCenter = d === 0;
          const isAdjacent = Math.abs(d) === 1;
          const scale = isCenter ? 1 : isAdjacent ? 0.93 : 0.86;
          const opacity = isCenter ? 1 : isAdjacent ? 0.45 : 0.12;
          const barColor = BAR_COLORS[item.barColor] || 'var(--ll-text-ghost, #475569)';

          return (
            <div
              key={i}
              className="flex items-start gap-2.5 cursor-pointer"
              style={{
                padding: '10px 12px', marginBottom: 5, borderRadius: 8,
                background: 'var(--ll-bg-elevated, #0a0f1a)', border: '1px solid var(--ll-border, #111827)',
                transform: `scale(${scale})`, opacity,
                transition: isDragging ? 'opacity 0.1s' : 'all 0.32s cubic-bezier(0.22, 0.68, 0, 1)',
                transformOrigin: 'center',
              }}
              onClick={() => { if (Math.abs(dragRef.current.currentOffset) < 5) handleSelect(i); }}
            >
              <div style={{ width: 3, minHeight: 28, borderRadius: 2, flexShrink: 0, marginTop: 2, background: barColor }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--ll-text-secondary, #e2e8f0)', lineHeight: 1.3 }}>{item.title}</div>
                <div style={{ fontSize: 10, color: 'var(--ll-text-ghost, #475569)', marginTop: 1 }}>{item.subtitle}</div>
                {item.spaceIndex != null && item.spaceName && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenSpace?.(item.spaceIndex); }}
                    style={{ fontSize: 10, color: 'var(--ll-bar-action, #f59e0b)', marginTop: 3, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    Open {item.spaceName.toLowerCase()}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ background: 'linear-gradient(180deg, var(--ll-bg-base, #020617) 0%, transparent 15%, transparent 85%, var(--ll-bg-base, #020617) 100%)' }}
      />
    </div>
  );
}
