/**
 * FrequencyMiniPlayer — persistent floating bar at the bottom of every screen.
 * Visible whenever a song is loaded in the global FrequencyContext.
 * Shows: song title, credit line, play/pause, thin progress bar.
 * Tap title area → navigate to /frequency/:slug.
 * Respects iOS safe-area insets.
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { useFrequency } from '@/contexts/FrequencyContext';

export default function FrequencyMiniPlayer() {
  const freq = useFrequency();
  const navigate = useNavigate();

  const handleTap = useCallback(() => {
    if (freq?.currentSong?.slug) {
      navigate(`/frequency/${freq.currentSong.slug}`);
    } else {
      navigate('/frequency');
    }
  }, [freq?.currentSong?.slug, navigate]);

  const togglePlay = useCallback((e) => {
    e.stopPropagation();
    if (!freq) return;
    if (freq.isPlaying) {
      freq.pause();
    } else {
      freq.play();
    }
  }, [freq]);

  const handlePrev = useCallback((e) => {
    e.stopPropagation();
    freq?.prev();
  }, [freq]);

  const handleNext = useCallback((e) => {
    e.stopPropagation();
    freq?.next();
  }, [freq]);

  // Don't render if no song loaded or station is off
  if (!freq?.currentSong || !freq?.isEnabled) return null;

  const { title, artist } = freq.currentSong;
  const progress = freq.duration > 0 ? (freq.currentTime / freq.duration) * 100 : 0;
  const hasPlaylist = freq.playlist.length > 1;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        pointerEvents: 'auto',
      }}
    >
      {/* Progress bar — thin line at the very top of the mini-player */}
      <div style={{ height: 2, background: 'var(--ll-border-hover, rgba(255,255,255,0.08))' }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'var(--ll-accent, #f59e0b)',
            transition: 'width 0.3s linear',
          }}
        />
      </div>

      {/* Mini-player body */}
      <div
        onClick={handleTap}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          background: 'var(--ll-bg-surface, #1e1b2e)',
          borderTop: '1px solid var(--ll-border-hover, rgba(255,255,255,0.08))',
          cursor: 'pointer',
          minHeight: 52,
        }}
      >
        {/* Song info — tap to navigate */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ll-text-primary, #fff)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </div>
          {artist && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--ll-text-dim, rgba(255,255,255,0.5))',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 1,
              }}
            >
              {artist}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {hasPlaylist && (
            <button
              type="button"
              onClick={handlePrev}
              style={{
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--ll-text-dim, rgba(255,255,255,0.5))',
                padding: 0,
              }}
            >
              <SkipBack style={{ width: 16, height: 16 }} />
            </button>
          )}
          <button
            type="button"
            onClick={togglePlay}
            style={{
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--ll-accent-bg, rgba(245,158,11,0.15))',
              border: 'none', borderRadius: '50%', cursor: 'pointer',
              color: 'var(--ll-accent, #f59e0b)',
              padding: 0,
            }}
          >
            {freq.isPlaying ? (
              <Pause style={{ width: 18, height: 18 }} />
            ) : (
              <Play style={{ width: 18, height: 18, marginLeft: 2 }} />
            )}
          </button>
          {hasPlaylist && (
            <button
              type="button"
              onClick={handleNext}
              style={{
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--ll-text-dim, rgba(255,255,255,0.5))',
                padding: 0,
              }}
            >
              <SkipForward style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
