/**
 * FrequencyStation — persistent audio shade overlay (UI shell only).
 * Rolls down like a physical shade over spinner + workspace content.
 * Toggle button always visible. No actual audio playback yet.
 *
 * Props (FrequencyStationButton):
 *   isPlaying — whether audio toggle is on
 *   onTogglePlay — toggle audio on/off (quick toggle, always visible)
 *   onToggleShade — open/close the full shade overlay
 *
 * Props (FrequencyStation):
 *   isOpen — shade is dropped down
 *   onClose — roll the shade back up
 *   isPlaying — audio toggle state
 *   onTogglePlay — toggle audio on/off
 */
import React, { useState, useEffect, useRef } from 'react';
import { Music, Pause, Play, X, Volume2, VolumeX } from 'lucide-react';

export function FrequencyStationButton({ isPlaying, onTogglePlay, onToggleShade }) {
  return (
    <div className="flex items-center gap-1">
      {/* Quick toggle — visible even when shade is closed */}
      <button
        type="button"
        onClick={onTogglePlay}
        className="flex items-center justify-center cursor-pointer"
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: `1.5px solid ${isPlaying ? '#f59e0b' : '#334155'}`,
          background: 'transparent',
          transition: 'border-color 0.2s',
        }}
        title={isPlaying ? 'Mute' : 'Unmute'}
      >
        {isPlaying ? (
          <Volume2 style={{ width: 9, height: 9, color: '#f59e0b' }} strokeWidth={1.5} />
        ) : (
          <VolumeX style={{ width: 9, height: 9, color: '#475569' }} strokeWidth={1.5} />
        )}
      </button>
      {/* Shade toggle */}
      <button
        type="button"
        onClick={onToggleShade}
        className="flex items-center gap-1 text-xs cursor-pointer py-1 px-0"
        style={{ color: '#f59e0b' }}
        title="Frequency Station"
      >
        <Music style={{ width: 12, height: 12 }} strokeWidth={1.5} />
      </button>
    </div>
  );
}

export default function FrequencyStation({ isOpen, onClose, isPlaying, onTogglePlay }) {
  const [progress, setProgress] = useState(35);
  const intervalRef = useRef(null);

  // Fake progress animation when "playing"
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((p) => (p >= 100 ? 0 : p + 0.25));
      }, 350);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying]);

  return (
    <>
      {/* Dimming overlay behind the shade */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: isOpen ? 'rgba(2, 6, 23, 0.65)' : 'transparent',
          transition: 'background 0.4s ease',
        }}
      />

      {/* The shade itself — rolls down from top */}
      <div
        className="absolute left-0 right-0 z-30"
        style={{
          top: 0,
          transform: isOpen ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.4s cubic-bezier(0.22, 0.68, 0, 1)',
          willChange: 'transform',
        }}
      >
        <div
          style={{
            background: '#060b14',
            borderBottom: '1.5px solid #1e293b',
            borderRadius: '0 0 18px 18px',
            padding: '18px 20px 22px',
            boxShadow: isOpen ? '0 8px 32px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {/* Shade header */}
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div className="flex items-center gap-2">
              <Music style={{ width: 14, height: 14, color: '#f59e0b' }} strokeWidth={1.5} />
              <span style={{ fontSize: 13, fontWeight: 500, color: '#f8fafc' }}>
                Frequency Station
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer flex items-center justify-center"
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#111827',
                border: 'none',
              }}
            >
              <X style={{ width: 12, height: 12, color: '#64748b' }} strokeWidth={2} />
            </button>
          </div>

          {/* Now playing */}
          <div
            className="flex items-center gap-3"
            style={{
              background: '#0a0f1a',
              borderRadius: 12,
              padding: '14px 16px',
              border: '1px solid #111827',
            }}
          >
            {/* Play/Pause */}
            <button
              type="button"
              onClick={onTogglePlay}
              className="flex items-center justify-center flex-shrink-0 cursor-pointer"
              style={{
                width: 36,
                height: 36,
                border: '1.5px solid #f59e0b',
                borderRadius: '50%',
                background: 'transparent',
              }}
            >
              {isPlaying ? (
                <Pause style={{ width: 14, height: 14, fill: '#f59e0b', color: '#f59e0b' }} />
              ) : (
                <Play style={{ width: 14, height: 14, fill: '#f59e0b', color: '#f59e0b' }} />
              )}
            </button>

            {/* Track info + progress */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#f8fafc', fontWeight: 500 }}>Circulation</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Three Gardeners</div>
              {/* Progress bar */}
              <div
                style={{
                  height: 3,
                  background: '#1e293b',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: '#f59e0b',
                    borderRadius: 2,
                    transition: 'width 0.35s linear',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Placeholder for future playlist/controls */}
          <div
            style={{
              marginTop: 12,
              padding: '8px 0',
              textAlign: 'center',
              fontSize: 10,
              color: '#334155',
            }}
          >
            Playlist coming soon
          </div>
        </div>

        {/* Pull tab / handle at bottom of shade */}
        <div
          className="flex justify-center cursor-pointer"
          onClick={onClose}
          style={{ padding: '6px 0 2px' }}
        >
          <div
            style={{
              width: 32,
              height: 3,
              borderRadius: 2,
              background: '#334155',
            }}
          />
        </div>
      </div>

      {/* Click-outside to close (only the dimmed area) */}
      {isOpen && (
        <div
          className="absolute inset-0 z-25"
          onClick={onClose}
          style={{ cursor: 'pointer' }}
        />
      )}
    </>
  );
}
