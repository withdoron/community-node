// Frequency Station — Phase 2 live. Base44 connection restored 2026-03-25.
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { sanitizeText } from '@/utils/sanitize';
import { validateFile, MAX_PHOTO_SIZE, ACCEPTED_IMAGE_TYPES } from '@/utils/fileValidation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Music,
  Send,
  Eye,
  Pencil,
  Trash2,
  Filter,
  Flame,
  Droplets,
  Mountain,
  Wind,
  CloudLightning,
  Sparkles,
  Clock,
  CheckCircle,
  Archive,
  AlertCircle,
  Loader2,
  ChevronDown,
  X,
  Play,
  Pause,
  Plus,
  Upload,
  Link2,
  Share2,
  Image,
  Headphones,
  Volume2,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg'];

// ─── Theme config ────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'fire', label: 'Fire', icon: Flame, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/40', selectedBg: 'bg-red-500/30' },
  { id: 'water', label: 'Water', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/40', selectedBg: 'bg-blue-500/30' },
  { id: 'earth', label: 'Earth', icon: Mountain, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', selectedBg: 'bg-amber-500/30' },
  { id: 'air', label: 'Air', icon: Wind, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', selectedBg: 'bg-cyan-500/30' },
  { id: 'storm', label: 'Storm', icon: CloudLightning, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40', selectedBg: 'bg-purple-500/30' },
  { id: 'custom', label: 'Custom', icon: Sparkles, color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/40', selectedBg: 'bg-slate-500/30' },
];

const THEME_MAP = Object.fromEntries(THEMES.map((t) => [t.id, t]));

const STATUS_CONFIG = {
  submitted: { label: 'Submitted', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  in_progress: { label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  released: { label: 'Released', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  archived: { label: 'Archived', color: 'text-slate-400', bg: 'bg-slate-500/20' },
};

// ─── Slug generation ─────────────────────────────────────────────────────────
function generateSlug(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// ─── ThemePill (reused in multiple tabs) ─────────────────────────────────────
function ThemePill({ themeId, size = 'sm' }) {
  const theme = THEME_MAP[themeId];
  if (!theme) return null;
  const Icon = theme.icon;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${theme.bg} ${theme.color} ${sizeClass}`}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {theme.label}
    </span>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full text-xs px-2 py-0.5 ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── Audio Player ────────────────────────────────────────────────────────────
function AudioPlayer({ audioUrl, variant = 'compact', onPlay }) {
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

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      setError(true);
      setIsLoading(false);
    };
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

  const togglePlay = useCallback(
    (e) => {
      e?.stopPropagation?.();
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
    },
    [isPlaying, error, onPlay]
  );

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
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <AlertCircle className="h-3 w-3" />
        Audio unavailable
      </div>
    );
  }

  const isCompact = variant === 'compact';

  return (
    <div className={`flex items-center gap-3 ${isCompact ? '' : 'w-full'}`} onClick={(e) => e.stopPropagation()}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading}
        className={`shrink-0 flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-400 text-black transition-colors disabled:bg-slate-700 disabled:text-slate-500 ${
          isCompact ? 'w-8 h-8' : 'w-12 h-12'
        }`}
      >
        {isLoading ? (
          <Loader2 className={`animate-spin ${isCompact ? 'h-4 w-4' : 'h-5 w-5'}`} />
        ) : isPlaying ? (
          <Pause className={isCompact ? 'h-4 w-4' : 'h-5 w-5'} />
        ) : (
          <Play className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'} ml-0.5`} />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className={`w-full bg-slate-700 rounded-full cursor-pointer ${isCompact ? 'h-1' : 'h-1.5'}`}
        >
          <div
            className="bg-amber-500 rounded-full h-full transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        {!isCompact && (
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-400">{formatTime(currentTime)}</span>
            <span className="text-xs text-slate-400">{formatTime(duration)}</span>
          </div>
        )}
      </div>
      {isCompact && (
        <span className="text-xs text-slate-500 shrink-0 tabular-nums">{formatTime(duration)}</span>
      )}
    </div>
  );
}

// ─── Song Card ───────────────────────────────────────────────────────────────
function SongCard({ song, onListenCounted }) {
  const navigate = useNavigate();
  const [counted, setCounted] = useState(false);

  const handlePlay = useCallback(() => {
    if (!counted && song?.id) {
      setCounted(true);
      onListenCounted?.(song.id);
    }
  }, [counted, song?.id, onListenCounted]);

  const handleShare = useCallback(
    (e) => {
      e.stopPropagation();
      const url = `${window.location.origin}/frequency/${song.slug}`;
      navigator.clipboard.writeText(url).then(() => {
        toast.success('Link copied!');
        // Increment share count
        base44.entities.FrequencySong.update(song.id, {
          share_count: (song.share_count || 0) + 1,
        }).catch(() => {});
      }).catch(() => toast.error('Could not copy link'));
    },
    [song]
  );

  const handleCardClick = useCallback(() => {
    navigate(`/frequency/${song.slug}`);
  }, [navigate, song.slug]);

  return (
    <div
      onClick={handleCardClick}
      className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:border-slate-700 transition-colors group"
    >
      {/* Cover image or placeholder */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
        {song.cover_image_url ? (
          <img
            src={song.cover_image_url}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Music className="h-10 w-10 text-amber-500/30" />
          </div>
        )}
      </div>
      {/* Card body */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-slate-100 text-sm group-hover:text-amber-500 transition-colors line-clamp-1">
            {song.title}
          </h3>
          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{song.credit_line}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {song.mood_tag && <ThemePill themeId={song.mood_tag} />}
          {song.style_genre && (
            <span className="text-xs text-slate-500">{song.style_genre}</span>
          )}
        </div>
        {/* Audio player */}
        {song.audio_url && (
          <AudioPlayer audioUrl={song.audio_url} variant="compact" onPlay={handlePlay} />
        )}
        {/* Footer: listen count + share */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Headphones className="h-3 w-3" />
            {song.listen_count || 0}
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 transition-colors"
          >
            <Link2 className="h-3 w-3" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 1: Listen ───────────────────────────────────────────────────────────
function ListenTab() {
  const queryClient = useQueryClient();

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['frequency-songs'],
    queryFn: async () => {
      // .filter().list() returns empty on this entity — use .list() + client filter
      const all = await base44.entities.FrequencySong.list();
      const arr = Array.isArray(all) ? all : [];
      return arr.filter((s) => s.status === 'published');
    },
  });

  const handleListenCounted = useCallback(
    (songId) => {
      const song = songs.find((s) => s.id === songId);
      if (!song) return;
      base44.entities.FrequencySong.update(songId, {
        listen_count: (song.listen_count || 0) + 1,
      }).catch(() => {});
    },
    [songs]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
          <Music className="h-8 w-8 text-amber-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-100 mb-2">No songs yet</h3>
        <p className="text-slate-400 max-w-sm">
          When community seeds become songs, they'll appear here. Submit your writing and we'll turn it into music.
        </p>
      </div>
    );
  }

  // Sort: featured first, then by published_at desc
  const sorted = [...songs].sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;
    return new Date(b.published_at || b.created_date || 0) - new Date(a.published_at || a.created_date || 0);
  });

  const featured = sorted.find((s) => s.is_featured);
  const rest = featured ? sorted.filter((s) => s.id !== featured.id) : sorted;

  return (
    <div className="py-6 space-y-6">
      {/* Featured song */}
      {featured && (
        <FeaturedSongCard song={featured} onListenCounted={handleListenCounted} />
      )}

      {/* Song grid */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rest.map((song) => (
            <SongCard key={song.id} song={song} onListenCounted={handleListenCounted} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Featured Song Card (larger, with full player) ───────────────────────────
function FeaturedSongCard({ song, onListenCounted }) {
  const navigate = useNavigate();
  const [counted, setCounted] = useState(false);

  const handlePlay = useCallback(() => {
    if (!counted && song?.id) {
      setCounted(true);
      onListenCounted?.(song.id);
    }
  }, [counted, song?.id, onListenCounted]);

  const handleShare = useCallback((e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/frequency/${song.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied!');
      base44.entities.FrequencySong.update(song.id, {
        share_count: (song.share_count || 0) + 1,
      }).catch(() => {});
    }).catch(() => toast.error('Could not copy link'));
  }, [song]);

  return (
    <div
      onClick={() => navigate(`/frequency/${song.slug}`)}
      className="bg-slate-900 border border-amber-500/30 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition-colors"
    >
      <div className="p-1">
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span className="text-xs font-medium text-amber-500">Featured</span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 p-4 pt-2">
        {/* Cover */}
        <div className="sm:w-40 sm:h-40 aspect-square bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
          {song.cover_image_url ? (
            <img src={song.cover_image_url} alt={song.title} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <Music className="h-12 w-12 text-amber-500/30" />
          )}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <h3 className="text-lg font-bold text-slate-100">{song.title}</h3>
            <p className="text-sm text-slate-400">{song.credit_line}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {song.mood_tag && <ThemePill themeId={song.mood_tag} size="md" />}
            {song.style_genre && <span className="text-xs text-slate-500">{song.style_genre}</span>}
          </div>
          {song.audio_url && (
            <AudioPlayer audioUrl={song.audio_url} variant="full" onPlay={handlePlay} />
          )}
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Headphones className="h-3 w-3" /> {song.listen_count || 0} listens
            </span>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 transition-colors"
            >
              <Link2 className="h-3 w-3" /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: Submit ───────────────────────────────────────────────────────────
function SubmitTab({ user, onSubmitSuccess }) {
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState('');
  const [theme, setTheme] = useState('');
  const [customTheme, setCustomTheme] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [dedication, setDedication] = useState('');
  const [titleSuggestion, setTitleSuggestion] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: isAnonymous ? null : user.id,
        raw_text: sanitizeText(rawText.trim()),
        theme: theme || 'custom',
        custom_theme: theme === 'custom' ? sanitizeText(customTheme.trim()) : '',
        is_anonymous: isAnonymous,
        dedication: sanitizeText(dedication.trim()) || '',
        title_suggestion: sanitizeText(titleSuggestion.trim()) || '',
        status: 'submitted',
        admin_seen: false,
      };
      return base44.entities.FSFrequencySubmission.create(payload);
    },
    onSuccess: () => {
      toast.success("Seed planted! We'll nurture it into music.");
      setRawText('');
      setTheme('');
      setCustomTheme('');
      setIsAnonymous(true);
      setDedication('');
      setTitleSuggestion('');
      queryClient.invalidateQueries(['frequency-my-seeds']);
      queryClient.invalidateQueries(['frequency-queue']);
      queryClient.invalidateQueries(['frequency-unseen-count']);
      onSubmitSuccess?.();
    },
    onError: () => {
      toast.error('Could not submit. Please try again.');
    },
  });

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!rawText.trim()) return;
      submitMutation.mutate();
    },
    [rawText, submitMutation]
  );

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-8 w-8 text-amber-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-100 mb-2">Sign in to submit</h3>
        <p className="text-slate-400">You need to be a member to plant a seed.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6 py-6">
      <div>
        <h3 className="text-lg font-bold text-slate-100 mb-1">Plant a seed</h3>
        <p className="text-sm text-slate-400">Write what's on your heart. We turn it into music.</p>
      </div>

      {/* Raw text */}
      <div>
        <label className="text-sm text-slate-400 mb-1.5 block">Your words *</label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="A poem, a feeling, a letter, a rant, a prayer... anything real."
          rows={6}
          className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-amber-500"
          required
        />
      </div>

      {/* Theme selector */}
      <div>
        <label className="text-sm text-slate-400 mb-2 block">Theme (optional)</label>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const selected = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(selected ? '' : t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selected
                    ? `${t.selectedBg} ${t.color} ${t.border}`
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
        {theme === 'custom' && (
          <input
            type="text"
            value={customTheme}
            onChange={(e) => setCustomTheme(e.target.value)}
            placeholder="Describe your theme..."
            className="mt-2 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
          />
        )}
      </div>

      {/* Anonymous toggle */}
      <div>
        <div
          className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 cursor-pointer"
          onClick={() => setIsAnonymous(!isAnonymous)}
        >
          <div>
            <p className="text-sm font-medium text-slate-100">Stay anonymous</p>
            <p className="text-xs text-slate-500">Your name won't appear on the song</p>
          </div>
          <div
            className={`w-10 h-6 rounded-full relative transition-colors ${
              isAnonymous ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`absolute top-1 h-4 w-4 rounded-full bg-slate-100 transition-transform ${
                isAnonymous ? 'left-5' : 'left-1'
              }`}
            />
          </div>
        </div>
        {isAnonymous && (
          <p className="text-xs text-slate-500 mt-1.5 ml-1">
            Anonymous seeds won't appear in My Seeds after submission.
          </p>
        )}
      </div>

      {/* Dedication */}
      <div>
        <label className="text-sm text-slate-400 mb-1.5 block">Dedication (optional)</label>
        <input
          type="text"
          value={dedication}
          onChange={(e) => setDedication(e.target.value)}
          placeholder="For my daughter, for Eugene, for anyone who's been there..."
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Title suggestion */}
      <div>
        <label className="text-sm text-slate-400 mb-1.5 block">Title suggestion (optional)</label>
        <input
          type="text"
          value={titleSuggestion}
          onChange={(e) => setTitleSuggestion(e.target.value)}
          placeholder="If you have a title in mind..."
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Consent + Submit */}
      <div className="space-y-3">
        <p className="text-xs text-slate-500 text-center">
          Your words will be transformed into music, not published as written.
        </p>
        <Button
          type="submit"
          disabled={!rawText.trim() || submitMutation.isPending}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-lg transition-colors disabled:bg-slate-700 disabled:text-slate-500"
        >
          {submitMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {submitMutation.isPending ? 'Planting...' : 'Plant this seed \u{1F331}'}
        </Button>
      </div>
    </form>
  );
}

// ─── Edit Seed Form (inline) ─────────────────────────────────────────────────
function EditSeedForm({ seed, onCancel, onSaved }) {
  const queryClient = useQueryClient();
  const [rawText, setRawText] = useState(seed.raw_text || '');
  const [theme, setTheme] = useState(seed.theme || '');
  const [customTheme, setCustomTheme] = useState(seed.custom_theme || '');
  const [isAnonymous, setIsAnonymous] = useState(seed.is_anonymous ?? true);
  const [dedication, setDedication] = useState(seed.dedication || '');
  const [titleSuggestion, setTitleSuggestion] = useState(seed.title_suggestion || '');

  const saveMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.FSFrequencySubmission.update(seed.id, {
        raw_text: rawText.trim(),
        theme: theme || 'custom',
        custom_theme: theme === 'custom' ? customTheme.trim() : '',
        is_anonymous: isAnonymous,
        dedication: dedication.trim() || '',
        title_suggestion: titleSuggestion.trim() || '',
      });
    },
    onSuccess: () => {
      toast.success('Seed updated');
      queryClient.invalidateQueries(['frequency-my-seeds']);
      queryClient.invalidateQueries(['frequency-queue']);
      onSaved?.();
    },
    onError: () => toast.error('Could not save changes'),
  });

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-100">Edit seed</h4>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-amber-500"
      />
      <div className="flex flex-wrap gap-2">
        {THEMES.map((t) => {
          const Icon = t.icon;
          const selected = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(selected ? '' : t.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
                selected
                  ? `${t.selectedBg} ${t.color} ${t.border}`
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              <Icon className="h-3 w-3" />
              {t.label}
            </button>
          );
        })}
      </div>
      {theme === 'custom' && (
        <input
          type="text"
          value={customTheme}
          onChange={(e) => setCustomTheme(e.target.value)}
          placeholder="Describe your theme..."
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
        />
      )}
      <div
        className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 cursor-pointer"
        onClick={() => setIsAnonymous(!isAnonymous)}
      >
        <span className="text-sm text-slate-300">Stay anonymous</span>
        <div className={`w-9 h-5 rounded-full relative transition-colors ${isAnonymous ? 'bg-amber-500' : 'bg-slate-700'}`}>
          <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-slate-100 transition-transform ${isAnonymous ? 'left-4' : 'left-0.5'}`} />
        </div>
      </div>
      <input
        type="text"
        value={dedication}
        onChange={(e) => setDedication(e.target.value)}
        placeholder="Dedication (optional)"
        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
      />
      <input
        type="text"
        value={titleSuggestion}
        onChange={(e) => setTitleSuggestion(e.target.value)}
        placeholder="Title suggestion (optional)"
        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
      />
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={onCancel}
          className="bg-transparent border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent"
        >
          Cancel
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!rawText.trim() || saveMutation.isPending}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:bg-slate-700 disabled:text-slate-500"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// ─── Tab 3: My Seeds ─────────────────────────────────────────────────────────
function MySeedsTab({ user }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);

  const { data: seeds = [], isLoading } = useQuery({
    queryKey: ['frequency-my-seeds', user?.id],
    queryFn: () => base44.entities.FSFrequencySubmission.filter({ user_id: user.id }).list(),
    enabled: !!user?.id,
  });

  const withdrawMutation = useMutation({
    mutationFn: (id) => base44.entities.FSFrequencySubmission.delete(id),
    onSuccess: () => {
      toast.success('Seed withdrawn');
      queryClient.invalidateQueries(['frequency-my-seeds']);
      queryClient.invalidateQueries(['frequency-queue']);
      queryClient.invalidateQueries(['frequency-unseen-count']);
    },
    onError: () => toast.error('Could not withdraw seed'),
  });

  const handleWithdraw = useCallback(
    (id) => {
      if (window.confirm('Withdraw this seed? This cannot be undone.')) {
        withdrawMutation.mutate(id);
      }
    },
    [withdrawMutation]
  );

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-8 w-8 text-amber-500 mb-4" />
        <h3 className="text-xl font-bold text-slate-100 mb-2">Sign in to view your seeds</h3>
        <p className="text-slate-400">You need to be a member to see your submissions.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (seeds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Music className="h-8 w-8 text-slate-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-100 mb-2">No seeds yet</h3>
        <p className="text-slate-400 max-w-sm">
          Submit a piece of writing to see it here. Anonymous seeds won't appear — they're truly private.
        </p>
      </div>
    );
  }

  const sorted = [...seeds].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

  return (
    <div className="max-w-xl mx-auto py-6 space-y-4">
      {sorted.map((seed) => {
        if (editingId === seed.id) {
          return (
            <EditSeedForm
              key={seed.id}
              seed={seed}
              onCancel={() => setEditingId(null)}
              onSaved={() => setEditingId(null)}
            />
          );
        }
        return (
          <div key={seed.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <StatusBadge status={seed.status} />
                {seed.theme && <ThemePill themeId={seed.theme} />}
              </div>
              <span className="text-xs text-slate-500">
                {seed.created_date ? new Date(seed.created_date).toLocaleDateString() : ''}
              </span>
            </div>
            <p className="text-sm text-slate-300 whitespace-pre-wrap mb-3 line-clamp-4">{seed.raw_text}</p>
            {seed.title_suggestion && (
              <p className="text-xs text-slate-500 mb-2">Title idea: {seed.title_suggestion}</p>
            )}
            {seed.dedication && (
              <p className="text-xs text-slate-500 italic mb-2">For: {seed.dedication}</p>
            )}
            {seed.status === 'submitted' && (
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingId(seed.id)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleWithdraw(seed.id)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Withdraw
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Song Creation Form (Admin — modal from Queue) ───────────────────────────
function SongCreationForm({ submission, onClose, onPublished }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(submission?.title_suggestion || '');
  const [lyrics, setLyrics] = useState('');
  const [styleGenre, setStyleGenre] = useState('');
  const [moodTag, setMoodTag] = useState(submission?.theme || '');
  const [creditLine, setCreditLine] = useState(
    submission?.is_anonymous
      ? 'Inspired by a community seed'
      : 'Inspired by a community seed'
  );
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [coverUrl, setCoverUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const slug = useMemo(() => generateSlug(title), [title]);

  const handleAudioSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AUDIO_SIZE) {
      toast.error('Audio file must be under 25MB');
      e.target.value = '';
      return;
    }
    if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
      toast.error('Use MP3, WAV, M4A, or AAC format');
      e.target.value = '';
      return;
    }
    setAudioFile(file);
    e.target.value = '';
  }, []);

  const handleCoverSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      e.target.value = '';
      return;
    }
    setCoverFile(file);
    e.target.value = '';
  }, []);

  const handlePublish = useCallback(async () => {
    if (!title.trim() || !audioFile) {
      toast.error('Title and audio file are required');
      return;
    }

    setPublishing(true);
    try {
      // Upload audio
      setUploading(true);
      const audioResult = await base44.integrations.Core.UploadFile({ file: audioFile });
      const uploadedAudioUrl = audioResult?.file_url || audioResult?.url;
      if (!uploadedAudioUrl) throw new Error('Audio upload failed');

      // Upload cover image if present
      let uploadedCoverUrl = '';
      if (coverFile) {
        const coverResult = await base44.integrations.Core.UploadFile({ file: coverFile });
        uploadedCoverUrl = coverResult?.file_url || coverResult?.url || '';
      }
      setUploading(false);

      // Create song record
      const songPayload = {
        title: sanitizeText(title.trim()),
        slug: slug || generateSlug(title),
        lyrics: sanitizeText(lyrics.trim()),
        style_genre: sanitizeText(styleGenre.trim()),
        mood_tag: moodTag || 'custom',
        audio_url: uploadedAudioUrl,
        cover_image_url: uploadedCoverUrl,
        credit_line: sanitizeText(creditLine.trim()) || 'Inspired by a community seed',
        submission_ids: submission ? JSON.stringify([submission.id]) : '[]',
        listen_count: 0,
        share_count: 0,
        is_featured: false,
        status: 'published',
        published_at: new Date().toISOString(),
      };

      await base44.entities.FrequencySong.create(songPayload);

      // Mark linked submission as released
      if (submission) {
        await base44.entities.FSFrequencySubmission.update(submission.id, {
          status: 'released',
          admin_seen: true,
        });
      }

      toast.success('Song published!');
      queryClient.invalidateQueries(['frequency-songs']);
      queryClient.invalidateQueries(['frequency-queue']);
      queryClient.invalidateQueries(['frequency-my-seeds']);
      onPublished?.();
    } catch (err) {
      console.error('Song publish error:', err);
      toast.error('Failed to publish song. Please try again.');
    } finally {
      setUploading(false);
      setPublishing(false);
    }
  }, [title, slug, lyrics, styleGenre, moodTag, audioFile, coverFile, creditLine, submission, queryClient, onPublished]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100">Create Song</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Linked submission preview */}
        {submission && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Inspired by submission:</p>
            <p className="text-sm text-slate-300 line-clamp-3 whitespace-pre-wrap">{submission.raw_text}</p>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Song title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The song title..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
          />
          {slug && (
            <p className="text-xs text-slate-500 mt-1">locallane.app/frequency/{slug}</p>
          )}
        </div>

        {/* Lyrics */}
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Lyrics</label>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="The transformed lyrics..."
            rows={6}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-amber-500 font-serif"
          />
        </div>

        {/* Style/Genre */}
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Style / Genre</label>
          <input
            type="text"
            value={styleGenre}
            onChange={(e) => setStyleGenre(e.target.value)}
            placeholder='e.g., "trip-hop", "folk acoustic", "hip-hop"'
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Mood / Theme */}
        <div>
          <label className="text-sm text-slate-400 mb-2 block">Mood</label>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => {
              const Icon = t.icon;
              const selected = moodTag === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMoodTag(selected ? '' : t.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
                    selected
                      ? `${t.selectedBg} ${t.color} ${t.border}`
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio upload */}
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Audio file * (MP3, WAV, M4A, AAC — max 25MB)</label>
          {audioFile ? (
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
              <Volume2 className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm text-slate-300 truncate flex-1">{audioFile.name}</span>
              <button
                type="button"
                onClick={() => setAudioFile(null)}
                className="text-slate-400 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-slate-800 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-amber-500 hover:text-amber-500 transition-colors text-sm"
            >
              <Upload className="h-4 w-4" />
              Choose audio file
            </button>
          )}
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioSelect}
            className="hidden"
          />
        </div>

        {/* Cover image upload */}
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Cover image (optional)</label>
          {coverFile ? (
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
              <Image className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm text-slate-300 truncate flex-1">{coverFile.name}</span>
              <button
                type="button"
                onClick={() => setCoverFile(null)}
                className="text-slate-400 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-amber-500 hover:text-amber-500 transition-colors text-sm"
            >
              <Image className="h-4 w-4" />
              Choose cover image
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCoverSelect}
            className="hidden"
          />
        </div>

        {/* Credit line */}
        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Credit line</label>
          <input
            type="text"
            value={creditLine}
            onChange={(e) => setCreditLine(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 bg-transparent border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePublish}
            disabled={!title.trim() || !audioFile || publishing}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:bg-slate-700 disabled:text-slate-500"
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading...</>
            ) : publishing ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Publishing...</>
            ) : (
              <><Music className="h-4 w-4 mr-2" />Publish Song</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 4: Queue (Admin) ────────────────────────────────────────────────────
function QueueTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [creatingSongFrom, setCreatingSongFrom] = useState(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['frequency-queue'],
    queryFn: () => base44.entities.FSFrequencySubmission.list(),
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FSFrequencySubmission.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['frequency-queue']);
      queryClient.invalidateQueries(['frequency-my-seeds']);
      queryClient.invalidateQueries(['frequency-unseen-count']);
    },
    onError: () => toast.error('Action failed'),
  });

  const markSeen = useCallback(
    (id) => updateMutation.mutate({ id, data: { admin_seen: true } }),
    [updateMutation]
  );
  const startProcessing = useCallback(
    (id) => {
      updateMutation.mutate({ id, data: { status: 'in_progress', admin_seen: true } });
      toast.success('Moved to In Progress');
    },
    [updateMutation]
  );
  const markReleased = useCallback(
    (id) => {
      updateMutation.mutate({ id, data: { status: 'released', admin_seen: true } });
      toast.success('Marked as released');
    },
    [updateMutation]
  );
  const archiveSubmission = useCallback(
    (id) => {
      updateMutation.mutate({ id, data: { status: 'archived', admin_seen: true } });
      toast.success('Archived');
    },
    [updateMutation]
  );

  const filtered = useMemo(() => {
    const sorted = [...submissions].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
    if (statusFilter === 'all') return sorted;
    return sorted.filter((s) => s.status === statusFilter);
  }, [submissions, statusFilter]);

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'submitted', label: 'Submitted' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'released', label: 'Released' },
    { id: 'archived', label: 'Archived' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="py-6 space-y-4">
      {/* Song creation modal */}
      {creatingSongFrom && (
        <SongCreationForm
          submission={creatingSongFrom}
          onClose={() => setCreatingSongFrom(null)}
          onPublished={() => setCreatingSongFrom(null)}
        />
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setStatusFilter(opt.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === opt.id
                ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600'
            }`}
          >
            {opt.label}
            {opt.id !== 'all' && (
              <span className="ml-1 text-slate-500">
                ({submissions.filter((s) => s.status === opt.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Filter className="h-6 w-6 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No submissions match this filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              className={`bg-slate-900 border rounded-lg p-4 ${
                !sub.admin_seen ? 'border-amber-500/40' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={sub.status} />
                  {sub.theme && <ThemePill themeId={sub.theme} />}
                  {!sub.admin_seen && (
                    <span className="inline-flex items-center gap-1 rounded-full text-xs px-2 py-0.5 bg-amber-500/20 text-amber-500">
                      New
                    </span>
                  )}
                  {sub.is_anonymous && (
                    <span className="text-xs text-slate-500">Anonymous</span>
                  )}
                </div>
                <span className="text-xs text-slate-500 shrink-0">
                  {sub.created_date ? new Date(sub.created_date).toLocaleDateString() : ''}
                </span>
              </div>

              <p className="text-sm text-slate-300 whitespace-pre-wrap mb-3">{sub.raw_text}</p>

              {sub.title_suggestion && (
                <p className="text-xs text-slate-500 mb-1">Title idea: {sub.title_suggestion}</p>
              )}
              {sub.dedication && (
                <p className="text-xs text-slate-500 italic mb-1">For: {sub.dedication}</p>
              )}
              {sub.custom_theme && sub.theme === 'custom' && (
                <p className="text-xs text-slate-500 mb-1">Custom theme: {sub.custom_theme}</p>
              )}

              {/* Admin actions */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-800 mt-3">
                {!sub.admin_seen && (
                  <button
                    type="button"
                    onClick={() => markSeen(sub.id)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 transition-colors"
                  >
                    <Eye className="h-3 w-3" />
                    Mark seen
                  </button>
                )}
                {sub.status === 'submitted' && (
                  <button
                    type="button"
                    onClick={() => startProcessing(sub.id)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition-colors"
                  >
                    <Clock className="h-3 w-3" />
                    Start processing
                  </button>
                )}
                {(sub.status === 'submitted' || sub.status === 'in_progress') && (
                  <button
                    type="button"
                    onClick={() => setCreatingSongFrom(sub)}
                    className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 transition-colors font-medium"
                  >
                    <Music className="h-3 w-3" />
                    Create Song
                  </button>
                )}
                {sub.status === 'in_progress' && (
                  <button
                    type="button"
                    onClick={() => markReleased(sub.id)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Mark released
                  </button>
                )}
                {sub.status !== 'archived' && sub.status !== 'released' && (
                  <button
                    type="button"
                    onClick={() => archiveSubmission(sub.id)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    <Archive className="h-3 w-3" />
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'listen', label: 'Listen', icon: Music },
  { id: 'submit', label: 'Submit', icon: Send },
  { id: 'my-seeds', label: 'My Seeds', icon: Sparkles },
];

const ADMIN_TABS = [
  ...TABS,
  { id: 'queue', label: 'Queue', icon: Filter },
];

export default function FrequencyStation() {
  const { user, isAuthenticated, isLoadingAuth: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('listen');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  const isAdmin = currentUser?.role === 'admin';
  const tabs = isAdmin ? ADMIN_TABS : TABS;

  // Unseen count for admin queue badge
  const { data: unseenCount = 0 } = useQuery({
    queryKey: ['frequency-unseen-count'],
    queryFn: async () => {
      const all = await base44.entities.FSFrequencySubmission.filter({ admin_seen: false }).list();
      return Array.isArray(all) ? all.length : 0;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  // Auth gate — community spaces are discovered through the organism
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <Music className="h-10 w-10 text-amber-500/60 mx-auto" />
          <h1 className="text-xl font-bold text-white">Sign in to hear the frequency</h1>
          <p className="text-slate-400 text-sm">
            The community's radio station. Sign in to listen, contribute, and discover.
          </p>
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="mt-4 bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Music className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Frequency Station</h1>
          <p className="text-sm text-slate-400">The community's radio station</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap relative ${
                isActive
                  ? 'bg-slate-800 text-amber-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'queue' && unseenCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-black text-xs font-bold">
                  {unseenCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'listen' && <ListenTab />}
      {activeTab === 'submit' && (
        <SubmitTab user={currentUser} onSubmitSuccess={() => setActiveTab('my-seeds')} />
      )}
      {activeTab === 'my-seeds' && <MySeedsTab user={currentUser} />}
      {activeTab === 'queue' && isAdmin && <QueueTab />}
    </div>
  );
}
