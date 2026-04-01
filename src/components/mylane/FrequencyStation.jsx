/**
 * FrequencyStation — persistent audio player bar (UI shell only).
 * No actual audio integration yet. Expands/collapses below header.
 * CSS values from MOCKUP-SPINNER-V6-FINAL.html.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Music, Pause, Play } from 'lucide-react';

export function FrequencyStationButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-xs cursor-pointer py-1 px-0"
      style={{ color: '#f59e0b' }}
      title="Frequency Station"
    >
      <Music style={{ width: 12, height: 12 }} strokeWidth={1.5} />
    </button>
  );
}

export default function FrequencyStation({ isOpen }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(35);
  const intervalRef = useRef(null);

  // Fake progress animation when "playing"
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setProgress((p) => (p >= 100 ? 0 : p + 0.25));
      }, 350);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing]);

  if (!isOpen) return null;

  return (
    <div
      className="flex items-center gap-2.5"
      style={{
        background: '#060b14',
        borderBottom: '1px solid #111827',
        padding: '8px 20px',
      }}
    >
      {/* Play/Pause button */}
      <button
        type="button"
        onClick={() => setPlaying(!playing)}
        className="flex items-center justify-center flex-shrink-0 cursor-pointer"
        style={{
          width: 22,
          height: 22,
          border: '1.5px solid #f59e0b',
          borderRadius: '50%',
          background: 'transparent',
        }}
      >
        {playing ? (
          <Pause style={{ width: 8, height: 8, fill: '#f59e0b', color: '#f59e0b' }} />
        ) : (
          <Play style={{ width: 8, height: 8, fill: '#f59e0b', color: '#f59e0b' }} />
        )}
      </button>

      {/* Track info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: '#e2e8f0' }}>Circulation</div>
        <div style={{ fontSize: 10, color: '#475569' }}>Three Gardeners</div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          flex: 2,
          height: 2,
          background: '#111827',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: '#f59e0b',
            borderRadius: 1,
            transition: 'width 0.35s linear',
          }}
        />
      </div>
    </div>
  );
}
