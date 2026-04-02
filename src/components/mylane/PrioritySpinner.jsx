/**
 * PrioritySpinner — scrollable vertical priority list with depth effect.
 * Uses IntersectionObserver for scale/opacity based on scroll position.
 * Native scroll — doesn't fight the page's vertical scroll direction.
 *
 * Props:
 *   items     — [{title, subtitle, barColor, spaceIndex?, spaceName?}]
 *   onOpenSpace(spaceIndex) — callback when "Open [space]" tapped
 */
import { useRef, useEffect, useState, useCallback } from 'react';

const BAR_COLORS = {
  ur: 'var(--ll-bar-urgent, #ef4444)',
  ac: 'var(--ll-bar-action, #f59e0b)',
  ev: 'var(--ll-bar-event, #3b82f6)',
  lf: 'var(--ll-bar-life, #22c55e)',
};

export default function PrioritySpinner({ items = [], onOpenSpace }) {
  const containerRef = useRef(null);
  const [depths, setDepths] = useState({}); // index → 0-1 visibility ratio

  // IntersectionObserver for depth effect
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cards = container.querySelectorAll('[data-priority-item]');
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const updates = {};
        entries.forEach((entry) => {
          const idx = entry.target.dataset.priorityItem;
          updates[idx] = entry.intersectionRatio;
        });
        setDepths((prev) => ({ ...prev, ...updates }));
      },
      {
        root: container,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ll-text-faint)', fontSize: 13 }}>
        All clear
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto"
      style={{ flex: 1, minHeight: 160, padding: '8px 20px', position: 'relative' }}
    >
      {/* Top fade */}
      <div
        className="sticky top-0 left-0 right-0 pointer-events-none"
        style={{
          height: 24, marginBottom: -24, zIndex: 5,
          background: 'linear-gradient(180deg, var(--ll-bg-base, #020617) 0%, transparent 100%)',
        }}
      />

      {items.map((item, i) => {
        const ratio = depths[i] ?? 1;
        // Depth effect: fully visible items at scale 1, fading items shrink/dim
        const scale = 0.88 + ratio * 0.12; // 0.88 → 1.0
        const opacity = 0.15 + ratio * 0.85; // 0.15 → 1.0
        const barColor = BAR_COLORS[item.barColor] || 'var(--ll-text-ghost)';

        return (
          <div
            key={i}
            data-priority-item={i}
            className="flex items-start gap-2.5"
            style={{
              padding: '10px 12px', marginBottom: 5, borderRadius: 8,
              background: 'var(--ll-bg-elevated)',
              border: '1px solid var(--ll-border)',
              transform: `scale(${scale})`,
              opacity,
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              transformOrigin: 'center',
            }}
          >
            <div style={{ width: 3, minHeight: 28, borderRadius: 2, flexShrink: 0, marginTop: 2, background: barColor }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--ll-text-secondary)', lineHeight: 1.3 }}>{item.title}</div>
              <div style={{ fontSize: 10, color: 'var(--ll-text-ghost)', marginTop: 1 }}>{item.subtitle}</div>
              {item.spaceIndex != null && item.spaceName && (
                <button
                  type="button"
                  onClick={() => onOpenSpace?.(item.spaceIndex)}
                  style={{ fontSize: 10, color: 'var(--ll-accent)', marginTop: 3, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  Open {item.spaceName.toLowerCase()}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Bottom fade */}
      <div
        className="sticky bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: 24, marginTop: -24, zIndex: 5,
          background: 'linear-gradient(0deg, var(--ll-bg-base, #020617) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
