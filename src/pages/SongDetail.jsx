import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Music,
  Play,
  Pause,
  Link2,
  ArrowLeft,
  Send,
  Headphones,
  Share2,
  Loader2,
  AlertCircle,
  Flame,
  Droplets,
  Mountain,
  Wind,
  CloudLightning,
  Sparkles,
  Calendar,
} from 'lucide-react';

// ─── Theme config (duplicated for standalone page — consider extracting later)
const THEMES = [
  { id: 'fire', label: 'Fire', icon: Flame, color: 'text-red-400', bg: 'bg-red-500/20' },
  { id: 'water', label: 'Water', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { id: 'earth', label: 'Earth', icon: Mountain, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  { id: 'air', label: 'Air', icon: Wind, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  { id: 'storm', label: 'Storm', icon: CloudLightning, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { id: 'custom', label: 'Custom', icon: Sparkles, color: 'text-slate-400', bg: 'bg-slate-500/20' },
];
const THEME_MAP = Object.fromEntries(THEMES.map((t) => [t.id, t]));

function ThemePill({ themeId }) {
  const theme = THEME_MAP[themeId];
  if (!theme) return null;
  const Icon = theme.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full text-sm px-3 py-1 ${theme.bg} ${theme.color}`}>
      <Icon className="h-4 w-4" />
      {theme.label}
    </span>
  );
}

// ─── Full Audio Player ───────────────────────────────────────────────────────
function FullAudioPlayer({ audioUrl, onPlay }) {
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoadedMetadata = () => { setDuration(audio.duration); setIsLoading(false); };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);
    const onError = () => { setError(true); setIsLoading(false); };
    const onCanPlay = () => setIsLoading(false);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('canplay', onCanPlay);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('canplay', onCanPlay);
    };
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || error) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => setError(true));
      setIsPlaying(true);
      onPlay?.();
    }
  }, [isPlaying, error, onPlay]);

  const handleProgressClick = useCallback((e) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = fraction * duration;
  }, [duration]);

  const formatTime = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
        <AlertCircle className="h-4 w-4" />
        Audio unavailable
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          disabled={isLoading}
          className="shrink-0 flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-black transition-colors disabled:bg-slate-700 disabled:text-slate-500"
        >
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="w-full h-2 bg-slate-700 rounded-full cursor-pointer"
          >
            <div
              className="bg-amber-500 rounded-full h-full transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-slate-400 tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-xs text-slate-400 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Song Detail Page ────────────────────────────────────────────────────────
export default function SongDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [listenCounted, setListenCounted] = useState(false);

  const { data: song, isLoading, error } = useQuery({
    queryKey: ['frequency-song', slug],
    queryFn: async () => {
      // .filter().list() returns empty on this entity — use .list() + client filter
      const songs = await base44.entities.FrequencySong.list();
      const arr = Array.isArray(songs) ? songs : [];
      const found = arr.find((s) => s.slug === slug && s.status === 'published');
      return found || null;
    },
    enabled: !!slug,
  });

  const handlePlay = useCallback(() => {
    if (!listenCounted && song?.id) {
      setListenCounted(true);
      base44.entities.FrequencySong.update(song.id, {
        listen_count: (song.listen_count || 0) + 1,
      }).catch(() => {});
    }
  }, [listenCounted, song]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/frequency/${song?.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied!');
      if (song?.id) {
        base44.entities.FrequencySong.update(song.id, {
          share_count: (song.share_count || 0) + 1,
        }).catch(() => {});
      }
    }).catch(() => toast.error('Could not copy link'));
  }, [song]);

  // Loading
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Not found
  if (!song) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Music className="h-12 w-12 text-slate-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-100 mb-2">Song not found</h1>
        <p className="text-slate-400 mb-6">This song may have been removed or the link is incorrect.</p>
        <Link
          to="/frequency"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors"
        >
          <Music className="h-4 w-4" />
          Browse all songs
        </Link>
      </div>
    );
  }

  const publishedDate = song.published_at
    ? new Date(song.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        to="/frequency"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-500 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Frequency Station
      </Link>

      {/* Cover image */}
      <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden mb-6 flex items-center justify-center">
        {song.cover_image_url ? (
          <img src={song.cover_image_url} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <Music className="h-16 w-16 text-amber-500/20" />
        )}
      </div>

      {/* Title + meta */}
      <div className="space-y-3 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">{song.title}</h1>
        <p className="text-slate-400">{song.credit_line}</p>
        <div className="flex items-center gap-3 flex-wrap">
          {song.mood_tag && <ThemePill themeId={song.mood_tag} />}
          {song.style_genre && (
            <span className="text-sm text-slate-500">{song.style_genre}</span>
          )}
        </div>
      </div>

      {/* Audio player */}
      {song.audio_url && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
          <FullAudioPlayer audioUrl={song.audio_url} onPlay={handlePlay} />
        </div>
      )}

      {/* Stats + Share */}
      <div className="flex items-center gap-4 mb-8">
        <span className="flex items-center gap-1.5 text-sm text-slate-500">
          <Headphones className="h-4 w-4" />
          {song.listen_count || 0} listens
        </span>
        {publishedDate && (
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <Calendar className="h-4 w-4" />
            {publishedDate}
          </span>
        )}
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 text-sm text-amber-500 hover:text-amber-400 transition-colors ml-auto"
        >
          <Link2 className="h-4 w-4" />
          Share
        </button>
      </div>

      {/* Lyrics */}
      {song.lyrics && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Lyrics</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <p className="text-slate-200 whitespace-pre-wrap leading-relaxed font-serif text-base">
              {song.lyrics}
            </p>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
        <p className="text-slate-400 mb-3">Have something on your heart?</p>
        <Link
          to="/frequency"
          state={{ tab: 'submit' }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors"
        >
          <Send className="h-4 w-4" />
          Submit your own seed
        </Link>
      </div>
    </div>
  );
}
