/**
 * FrequencyContext — global audio state for Frequency Station.
 * The audio element lives here (never unmounts). Toggle, playlist,
 * and playback state persist across spinner navigation and overlay close.
 *
 * Provides:
 *   isPlaying      — boolean, audio is actively playing
 *   isEnabled      — boolean, master power switch (ON/OFF toggle)
 *   currentSong    — { id, title, artist, audioUrl, coverUrl } | null
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

export function FrequencyProvider({ children }) {
  const audioRef = useRef(null);

  // Master power switch — persists to localStorage
  const [isEnabled, setIsEnabled] = useState(() => {
    try { return localStorage.getItem('freq_playing') === '1'; } catch { return false; }
  });

  const [currentSong, setCurrentSong] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Wire audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      // Auto-advance to next song if enabled
      if (isEnabled && playlist.length > 0 && currentSong) {
        const idx = playlist.findIndex((s) => s.id === currentSong.id);
        const nextIdx = (idx + 1) % playlist.length;
        if (nextIdx !== idx || playlist.length === 1) {
          const nextSong = playlist[nextIdx];
          setCurrentSong(nextSong);
          audio.src = nextSong.audioUrl || '';
          audio.play().catch(() => {});
        } else {
          setIsPlaying(false);
        }
      } else {
        setIsPlaying(false);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

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
    };
  }, [isEnabled, playlist, currentSong]);

  // Master toggle
  const toggle = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem('freq_playing', next ? '1' : '0'); } catch {}
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
    setCurrentSong(song);
    if (audioRef.current && song?.audioUrl) {
      audioRef.current.src = song.audioUrl;
      if (isEnabled) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [isEnabled]);

  const next = useCallback(() => {
    if (!playlist.length || !currentSong) return;
    const idx = playlist.findIndex((s) => s.id === currentSong.id);
    const nextSong = playlist[(idx + 1) % playlist.length];
    setSong(nextSong);
  }, [playlist, currentSong, setSong]);

  const prev = useCallback(() => {
    if (!playlist.length || !currentSong) return;
    const idx = playlist.findIndex((s) => s.id === currentSong.id);
    const prevSong = playlist[(idx - 1 + playlist.length) % playlist.length];
    setSong(prevSong);
  }, [playlist, currentSong, setSong]);

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
      {/* Persistent audio element — never unmounts */}
      <audio ref={audioRef} preload="metadata" style={{ display: 'none' }} />
      {children}
    </FrequencyContext.Provider>
  );
}
