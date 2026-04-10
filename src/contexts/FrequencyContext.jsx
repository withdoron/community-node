/**
 * FrequencyContext — global audio state for Frequency Station (Pip-Boy Radio).
 *
 * The single <audio> element lives here at app root (never unmounts).
 * All playback goes through this context — page components are pure UI.
 *
 * Provides:
 *   isPlaying      — boolean, audio is actively playing
 *   isEnabled      — boolean, master power switch (ON/OFF toggle)
 *   currentSong    — { id, title, artist, audioUrl, coverUrl, slug } | null
 *   currentTime    — number, seconds
 *   duration       — number, seconds
 *   playlist       — array of songs
 *   toggle()       — flip master power switch
 *   play()         — resume or start current song
 *   pause()        — pause audio
 *   setSong(song)  — switch to a specific song and play
 *   setPlaylist(songs) — set the playlist
 *   next()         — advance to next song
 *   prev()         — go to previous song
 *   seek(seconds)  — seek to position
 */
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const FrequencyContext = createContext(null);

export function useFrequency() {
  return useContext(FrequencyContext);
}

// ── localStorage helpers (debounced position save) ──────────────────────────
const LS_KEYS = {
  enabled: 'freq_playing',
  song: 'freq_current_song',
  position: 'freq_position',
};

function lsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}
function lsGetJSON(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function lsSetJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── MediaSession wiring ─────────────────────────────────────────────────────
function updateMediaSession(song) {
  if (!('mediaSession' in navigator) || !song) return;
  const artwork = song.coverUrl
    ? [{ src: song.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
    : [];
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title || 'Unknown',
    artist: song.artist || 'Frequency Station',
    album: 'Frequency Station',
    artwork,
  });
}

function setMediaSessionState(state) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = state; // 'playing' | 'paused' | 'none'
}

export function FrequencyProvider({ children }) {
  const audioRef = useRef(null);
  const positionSaveTimer = useRef(null);

  // Master power switch — persists to localStorage
  const [isEnabled, setIsEnabled] = useState(() => lsGet(LS_KEYS.enabled) === '1');

  // Restore last song from localStorage (don't auto-play — just have it ready)
  const [currentSong, setCurrentSong] = useState(() => lsGetJSON(LS_KEYS.song));
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // On first mount, restore audio source (without playing)
  useEffect(() => {
    const audio = audioRef.current;
    const saved = currentSong;
    if (audio && saved?.audioUrl && !audio.src) {
      audio.src = saved.audioUrl;
      const savedPos = parseFloat(lsGet(LS_KEYS.position) || '0');
      if (savedPos > 0) {
        const onLoaded = () => {
          audio.currentTime = savedPos;
          audio.removeEventListener('loadedmetadata', onLoaded);
        };
        audio.addEventListener('loadedmetadata', onLoaded);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wire audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Debounced position save — every 3 seconds
      if (!positionSaveTimer.current) {
        positionSaveTimer.current = setTimeout(() => {
          lsSet(LS_KEYS.position, String(audio.currentTime));
          positionSaveTimer.current = null;
        }, 3000);
      }
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      // Auto-advance to next song if enabled
      if (isEnabled && playlist.length > 0 && currentSong) {
        const idx = playlist.findIndex((s) => s.id === currentSong.id);
        const nextIdx = (idx + 1) % playlist.length;
        if (nextIdx !== idx || playlist.length === 1) {
          const nextSong = playlist[nextIdx];
          setCurrentSong(nextSong);
          lsSetJSON(LS_KEYS.song, nextSong);
          audio.src = nextSong.audioUrl || '';
          audio.play().catch(() => {});
          updateMediaSession(nextSong);
        } else {
          setIsPlaying(false);
          setMediaSessionState('paused');
        }
      } else {
        setIsPlaying(false);
        setMediaSessionState('paused');
      }
    };
    const onPlay = () => {
      setIsPlaying(true);
      setMediaSessionState('playing');
    };
    const onPause = () => {
      setIsPlaying(false);
      setMediaSessionState('paused');
      // Save position immediately on pause
      lsSet(LS_KEYS.position, String(audio.currentTime));
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      if (positionSaveTimer.current) {
        clearTimeout(positionSaveTimer.current);
        positionSaveTimer.current = null;
      }
    };
  }, [isEnabled, playlist, currentSong]);

  // ── MediaSession action handlers ──────────────────────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const handlers = {
      play: () => { if (audioRef.current && currentSong?.audioUrl) audioRef.current.play().catch(() => {}); },
      pause: () => { if (audioRef.current) audioRef.current.pause(); },
      previoustrack: () => {
        if (!playlist.length || !currentSong) return;
        const idx = playlist.findIndex((s) => s.id === currentSong.id);
        const prevSong = playlist[(idx - 1 + playlist.length) % playlist.length];
        setSongInternal(prevSong);
      },
      nexttrack: () => {
        if (!playlist.length || !currentSong) return;
        const idx = playlist.findIndex((s) => s.id === currentSong.id);
        const nextSong = playlist[(idx + 1) % playlist.length];
        setSongInternal(nextSong);
      },
      seekto: (details) => {
        if (audioRef.current && details.seekTime != null) {
          audioRef.current.currentTime = details.seekTime;
        }
      },
    };
    for (const [action, handler] of Object.entries(handlers)) {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch {}
    }
    return () => {
      for (const action of Object.keys(handlers)) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist, currentSong]);

  // Internal setSong (used by MediaSession handlers and public API)
  const setSongInternal = useCallback((song) => {
    setCurrentSong(song);
    lsSetJSON(LS_KEYS.song, song);
    lsSet(LS_KEYS.position, '0');
    if (audioRef.current && song?.audioUrl) {
      audioRef.current.src = song.audioUrl;
      updateMediaSession(song);
      if (isEnabled) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [isEnabled]);

  // Master toggle
  const toggle = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      lsSet(LS_KEYS.enabled, next ? '1' : '0');
      if (!next && audioRef.current) {
        audioRef.current.pause();
      } else if (next && audioRef.current && currentSong?.audioUrl) {
        audioRef.current.play().catch(() => {});
      }
      return next;
    });
  }, [currentSong]);

  const play = useCallback(() => {
    if (audioRef.current && currentSong?.audioUrl) {
      audioRef.current.play().catch(() => {});
    }
  }, [currentSong]);

  const pause = useCallback(() => {
    if (audioRef.current) audioRef.current.pause();
  }, []);

  const setSong = useCallback((song) => {
    setSongInternal(song);
  }, [setSongInternal]);

  const next = useCallback(() => {
    if (!playlist.length || !currentSong) return;
    const idx = playlist.findIndex((s) => s.id === currentSong.id);
    const nextSong = playlist[(idx + 1) % playlist.length];
    setSongInternal(nextSong);
  }, [playlist, currentSong, setSongInternal]);

  const prev = useCallback(() => {
    if (!playlist.length || !currentSong) return;
    const idx = playlist.findIndex((s) => s.id === currentSong.id);
    const prevSong = playlist[(idx - 1 + playlist.length) % playlist.length];
    setSongInternal(prevSong);
  }, [playlist, currentSong, setSongInternal]);

  const seek = useCallback((seconds) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);

  const value = {
    isPlaying,
    isEnabled,
    currentSong,
    currentTime,
    duration,
    playlist,
    toggle,
    play,
    pause,
    setSong,
    setPlaylist,
    next,
    prev,
    seek,
  };

  return (
    <FrequencyContext.Provider value={value}>
      {/* Single persistent audio element — never unmounts. playsinline for iOS. */}
      <audio ref={audioRef} preload="metadata" playsInline style={{ display: 'none' }} />
      {children}
    </FrequencyContext.Provider>
  );
}
