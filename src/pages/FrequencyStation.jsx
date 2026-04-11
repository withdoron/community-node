// Frequency Station — Build 2: Studio, Library, Ownership Model.
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { sanitizeText } from '@/utils/sanitize';
import { validateFile } from '@/utils/fileValidation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useFrequency } from '@/contexts/FrequencyContext';
import SubmitWizard from '@/components/frequency/SubmitWizard';
import AdminWorkbench from '@/components/frequency/AdminWorkbench';
import MyLibrary from '@/components/frequency/MyLibrary';
import NotificationBell from '@/components/frequency/NotificationBell';
import SongRow from '@/components/frequency/SongRow';
import { useFrequencyFavorites } from '@/hooks/useFrequencyFavorites';
import { useFrequencyQueue } from '@/hooks/useFrequencyQueue';
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
  ChevronUp,
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
  LibraryBig,
} from 'lucide-react';

// ─── Constants ──────────────────────────────────────────────────────────────
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg'];

// ─── Theme config ────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'fire', label: 'Fire', icon: Flame, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/40', selectedBg: 'bg-red-500/30' },
  { id: 'water', label: 'Water', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/40', selectedBg: 'bg-blue-500/30' },
  { id: 'earth', label: 'Earth', icon: Mountain, color: 'text-primary-hover', bg: 'bg-primary/20', border: 'border-primary/40', selectedBg: 'bg-primary/30' },
  { id: 'air', label: 'Air', icon: Wind, color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', selectedBg: 'bg-cyan-500/30' },
  { id: 'storm', label: 'Storm', icon: CloudLightning, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40', selectedBg: 'bg-purple-500/30' },
  { id: 'custom', label: 'Custom', icon: Sparkles, color: 'text-muted-foreground', bg: 'bg-muted-foreground/20', border: 'border-muted-foreground/40', selectedBg: 'bg-muted-foreground/30' },
];

const THEME_MAP = Object.fromEntries(THEMES.map((t) => [t.id, t]));

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  submitted: { label: 'Submitted', color: 'text-primary-hover', bg: 'bg-primary/20' },
  in_progress: { label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  released: { label: 'Released', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  archived: { label: 'Archived', color: 'text-muted-foreground', bg: 'bg-muted-foreground/20' },
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
// Pure UI — reads state from FrequencyContext, no local <audio> element.
// Calls context methods (setSong, play, pause, seek) for all playback control.
function AudioPlayer({ song, audioUrl, variant = 'compact', onPlay }) {
  const progressRef = useRef(null);
  const freq = useFrequency();
  const masterEnabled = freq?.isEnabled ?? true;

  // Is THIS song the one currently playing in the global context?
  const isThisSong = freq?.currentSong?.audioUrl === audioUrl;
  const isPlaying = isThisSong && freq?.isPlaying;
  const currentTime = isThisSong ? (freq?.currentTime ?? 0) : 0;
  const duration = isThisSong ? (freq?.duration ?? 0) : 0;

  const togglePlay = useCallback(
    (e) => {
      e?.stopPropagation?.();
      if (!masterEnabled) {
        toast('Frequency Station is off', { description: 'Turn it on from the header toggle.' });
        return;
      }
      if (isThisSong && isPlaying) {
        freq.pause();
      } else if (isThisSong) {
        freq.play();
      } else {
        // Switch to this song in the global context
        freq.setSong({
          id: song?.id,
          title: song?.title || 'Unknown',
          artist: song?.credit_line || '',
          audioUrl: audioUrl,
          coverUrl: song?.cover_image_url || '',
          slug: song?.slug || '',
        });
        onPlay?.();
      }
    },
    [isThisSong, isPlaying, masterEnabled, freq, audioUrl, song, onPlay]
  );

  const handleProgressClick = useCallback((e) => {
    if (!isThisSong || !duration) return;
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    freq.seek(fraction * duration);
  }, [isThisSong, duration, freq]);

  const formatTime = (s) => {
    if (!s || !isFinite(s)) return '0:00';
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isCompact = variant === 'compact';

  return (
    <div className={`flex items-center gap-3 ${isCompact ? '' : 'w-full'}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={togglePlay}
        className={`shrink-0 flex items-center justify-center rounded-full bg-primary hover:bg-primary-hover text-primary-foreground transition-colors ${
          isCompact ? 'w-8 h-8' : 'w-12 h-12'
        }`}
      >
        {isPlaying ? (
          <Pause className={isCompact ? 'h-4 w-4' : 'h-5 w-5'} />
        ) : (
          <Play className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'} ml-0.5`} />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className={`w-full bg-surface rounded-full cursor-pointer ${isCompact ? 'h-1' : 'h-1.5'}`}
        >
          <div
            className="bg-primary rounded-full h-full transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        {!isCompact && (
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">{formatTime(currentTime)}</span>
            <span className="text-xs text-muted-foreground">{formatTime(duration)}</span>
          </div>
        )}
      </div>
      {isCompact && (
        <span className="text-xs text-muted-foreground/70 shrink-0 tabular-nums">{formatTime(duration)}</span>
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
      className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-border transition-colors group"
    >
      {/* Cover image or placeholder */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-secondary to-card flex items-center justify-center overflow-hidden">
        {song.cover_image_url ? (
          <img
            src={song.cover_image_url}
            alt={song.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Music className="h-10 w-10 text-primary/30" />
          </div>
        )}
      </div>
      {/* Card body */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">
            {song.title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{song.credit_line}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {song.mood_tag && <ThemePill themeId={song.mood_tag} />}
          {song.style_genre && (
            <span className="text-xs text-muted-foreground/70">{song.style_genre}</span>
          )}
        </div>
        {/* Audio player */}
        {song.audio_url && (
          <AudioPlayer song={song} audioUrl={song.audio_url} variant="compact" onPlay={handlePlay} />
        )}
        {/* Footer: listen count + share */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
            <Headphones className="h-3 w-3" />
            {song.listen_count || 0}
          </div>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Link2 className="h-3 w-3" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab 1: Explore (was Listen) ────────────────────────────────────────────
function ListenTab({ favoriteIds, toggleFavorite, addToQueue, ownedIds }) {
  const queryClient = useQueryClient();
  const freq = useFrequency();

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['frequency-songs'],
    queryFn: async () => {
      // .filter().list() returns empty on this entity — use .list() + client filter
      const all = await base44.entities.FrequencySong.list();
      const arr = Array.isArray(all) ? all : [];
      return arr.filter((s) => s.status === 'published' && s.is_public !== false);
    },
  });

  // Set global playlist when songs load so next/prev work.
  // Depend on a stable fingerprint of the song IDs, not `freq` (which changes
  // on every setPlaylist call and would cause an infinite render loop).
  const setPlaylist = freq?.setPlaylist;
  const songFingerprint = useMemo(
    () => songs.filter((s) => s.audio_url).map((s) => s.id).join(','),
    [songs]
  );
  useEffect(() => {
    if (!songFingerprint || !setPlaylist) return;
    const playlist = songs
      .filter((s) => s.audio_url)
      .map((s) => ({
        id: s.id,
        title: s.title || 'Unknown',
        artist: s.credit_line || '',
        audioUrl: s.audio_url,
        coverUrl: s.cover_image_url || '',
        slug: s.slug || '',
      }));
    setPlaylist(playlist);
  }, [songFingerprint, setPlaylist]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
          <Music className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">No songs yet</h3>
        <p className="text-muted-foreground max-w-sm">
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
      {/* Featured song — keep the hero card for the top song */}
      {featured && (
        <FeaturedSongCard song={featured} onListenCounted={handleListenCounted} />
      )}

      {/* Song list — one-line rows with heart + queue buttons */}
      {rest.length > 0 && (
        <div className="space-y-1.5">
          {rest.map((song) => (
            <SongRow
              key={song.id}
              song={song}
              context="explore"
              isFavorited={favoriteIds?.has(String(song.id))}
              isOwned={ownedIds?.has(String(song.id))}
              onHeart={toggleFavorite}
              onAddToQueue={addToQueue}
            />
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
      className="bg-card border border-primary/30 rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
    >
      <div className="p-1">
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
          <Sparkles className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium text-primary">Featured</span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 p-4 pt-2">
        {/* Cover */}
        <div className="sm:w-40 sm:h-40 aspect-square bg-gradient-to-br from-secondary to-card rounded-lg flex items-center justify-center overflow-hidden shrink-0">
          {song.cover_image_url ? (
            <img src={song.cover_image_url} alt={song.title} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <Music className="h-12 w-12 text-primary/30" />
          )}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">{song.title}</h3>
            <p className="text-sm text-muted-foreground">{song.credit_line}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {song.mood_tag && <ThemePill themeId={song.mood_tag} size="md" />}
            {song.style_genre && <span className="text-xs text-muted-foreground/70">{song.style_genre}</span>}
          </div>
          {song.audio_url && (
            <AudioPlayer song={song} audioUrl={song.audio_url} variant="full" onPlay={handlePlay} />
          )}
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
              <Headphones className="h-3 w-3" /> {song.listen_count || 0} listens
            </span>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Link2 className="h-3 w-3" /> Share
            </button>
          </div>
        </div>
      </div>
    </div>
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
    <div className="bg-secondary border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Edit seed</h4>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm resize-none focus:outline-none focus:border-primary"
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
                  : 'bg-card text-muted-foreground border-border'
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
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm focus:outline-none focus:border-primary"
        />
      )}
      <div
        className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2 cursor-pointer"
        onClick={() => setIsAnonymous(!isAnonymous)}
      >
        <span className="text-sm text-foreground-soft">Stay anonymous</span>
        <div className={`w-9 h-5 rounded-full relative transition-colors ${isAnonymous ? 'bg-primary' : 'bg-surface'}`}>
          <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-slate-100 transition-transform ${isAnonymous ? 'left-4' : 'left-0.5'}`} />
        </div>
      </div>
      <input
        type="text"
        value={dedication}
        onChange={(e) => setDedication(e.target.value)}
        placeholder="Dedication (optional)"
        className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm focus:outline-none focus:border-primary"
      />
      <input
        type="text"
        value={titleSuggestion}
        onChange={(e) => setTitleSuggestion(e.target.value)}
        placeholder="Title suggestion (optional)"
        className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm focus:outline-none focus:border-primary"
      />
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={onCancel}
          className="bg-transparent border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent"
        >
          Cancel
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!rawText.trim() || saveMutation.isPending}
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold disabled:bg-surface disabled:text-muted-foreground/70"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

// ─── My Submissions (was My Seeds) ──────────────────────────────────────────
function MySeedsTab({ user, onEditDraft }) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [expandedSeedId, setExpandedSeedId] = useState(null);

  const { data: seeds = [], isLoading } = useQuery({
    queryKey: ['frequency-my-seeds', user?.id],
    queryFn: () => base44.entities.FSFrequencySubmission.filter({ user_id: user.id }),
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
        <AlertCircle className="h-8 w-8 text-primary mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Sign in to view your submissions</h3>
        <p className="text-muted-foreground">You need to be a member to see your submissions.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (seeds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Music className="h-8 w-8 text-muted-foreground/70 mb-4" />
        <h3 className="text-lg font-bold text-foreground mb-2">No submissions yet</h3>
        <p className="text-muted-foreground max-w-sm">
          Submit a piece of writing to see it here.
        </p>
      </div>
    );
  }

  // Sort by title alphabetically
  const sorted = [...seeds].sort((a, b) => {
    const titleA = (a.title || a.title_suggestion || a.raw_text || '').toLowerCase();
    const titleB = (b.title || b.title_suggestion || b.raw_text || '').toLowerCase();
    return titleA.localeCompare(titleB);
  });

  return (
    <div className="max-w-xl mx-auto py-6 space-y-1.5">
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
        const displayTitle = seed.title || seed.title_suggestion || seed.raw_text?.slice(0, 60) || 'Untitled';
        const isExpandable = seed.id === expandedSeedId;
        return (
          <div key={seed.id} className="bg-card border border-border rounded-lg overflow-hidden">
            {/* Collapsed row */}
            <div className="flex items-center gap-3 p-3">
              <button
                type="button"
                onClick={() => setExpandedSeedId(isExpandable ? null : seed.id)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{displayTitle}</p>
                  <StatusBadge status={seed.status} />
                </div>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                {(seed.status === 'draft') && onEditDraft && (
                  <button type="button" onClick={() => onEditDraft(seed)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors font-medium px-1">
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                )}
                {seed.status === 'submitted' && (
                  <button type="button" onClick={() => setEditingId(seed.id)}
                    className="p-1 text-muted-foreground/40 hover:text-primary transition-colors">
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
                {(seed.status === 'submitted' || seed.status === 'draft') && (
                  <button type="button" onClick={() => handleWithdraw(seed.id)}
                    className="p-1 text-muted-foreground/30 hover:text-red-400 transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                <button type="button" onClick={() => setExpandedSeedId(isExpandable ? null : seed.id)}
                  className="p-1 text-muted-foreground/30 hover:text-foreground transition-colors">
                  {isExpandable ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            {/* Expanded details */}
            {isExpandable && (
              <div className="px-3 pb-3 border-t border-border space-y-2 mt-0">
                <p className="text-xs text-foreground-soft whitespace-pre-wrap line-clamp-6 font-serif mt-2">{seed.raw_text}</p>
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  {seed.style_genre && <span className="bg-secondary px-2 py-0.5 rounded">{seed.style_genre}</span>}
                  {seed.vocal_style && <span className="bg-secondary px-2 py-0.5 rounded">{seed.vocal_style} vocal</span>}
                  {seed.tempo_feel && <span className="bg-secondary px-2 py-0.5 rounded">{seed.tempo_feel} tempo</span>}
                  {seed.reference_artist && <span className="bg-secondary px-2 py-0.5 rounded">like {seed.reference_artist}</span>}
                  {seed.dedication && <span className="italic">For: {seed.dedication}</span>}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'library', label: 'My Library', icon: LibraryBig },
  { id: 'explore', label: 'Explore', icon: Music },
  { id: 'submit', label: 'Submit', icon: Send },
  { id: 'my-submissions', label: 'My Submissions', icon: Sparkles },
];

const ADMIN_TABS = [
  ...TABS,
  { id: 'queue', label: 'Workbench', icon: Filter },
];

export default function FrequencyStation() {
  const { user, isAuthenticated, isLoadingAuth: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState(null); // null = not yet resolved
  const [editingDraft, setEditingDraft] = useState(null); // draft being edited in wizard

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    enabled: isAuthenticated,
  });

  const isAdmin = currentUser?.role === 'admin';
  const tabs = isAdmin ? ADMIN_TABS : TABS;

  // Check if user owns any songs (for default-active tab logic)
  const { data: ownedSongCount = 0 } = useQuery({
    queryKey: ['frequency-owned-count', currentUser?.id],
    queryFn: async () => {
      const all = await base44.entities.FrequencySong.list();
      return (Array.isArray(all) ? all : []).filter(
        (s) => String(s.owner_user_id) === String(currentUser.id)
      ).length;
    },
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Resolve default-active tab on first load
  useEffect(() => {
    if (activeTab === null && currentUser?.id) {
      setActiveTab(ownedSongCount > 0 ? 'library' : 'explore');
    }
  }, [activeTab, currentUser?.id, ownedSongCount]);

  // Favorites + queue hooks — single owner, passed to all children
  const { favoriteIds, toggleFavorite } = useFrequencyFavorites(currentUser?.id);
  const freq = useFrequency();
  const { trackIds: queueTrackIds, queueIds, addToQueue, removeFromQueue, reorderQueue, clearQueue } = useFrequencyQueue(currentUser?.id, freq);

  // Owned song IDs for the "yours" badge on Explore
  const { data: ownedIds } = useQuery({
    queryKey: ['frequency-owned-ids', currentUser?.id],
    queryFn: async () => {
      const all = await base44.entities.FrequencySong.list();
      const ids = (Array.isArray(all) ? all : [])
        .filter((s) => String(s.owner_user_id) === String(currentUser.id))
        .map((s) => String(s.id));
      return new Set(ids);
    },
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Unseen count for admin queue badge
  const { data: unseenCount = 0 } = useQuery({
    queryKey: ['frequency-unseen-count'],
    queryFn: async () => {
      const all = await base44.entities.FSFrequencySubmission.list();
      return (Array.isArray(all) ? all : []).filter((s) => !s.admin_seen).length;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  // Auth gate — community spaces are discovered through the organism
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <Music className="h-10 w-10 text-primary/60 mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Sign in to hear the frequency</h1>
          <p className="text-muted-foreground text-sm">
            The community's radio station. Sign in to listen, contribute, and discover.
          </p>
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="mt-4 bg-primary hover:bg-primary-hover text-primary-foreground font-bold px-6 py-3 rounded-xl transition-colors"
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
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
          <Music className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Frequency Station</h1>
          <p className="text-sm text-muted-foreground">The community's radio station</p>
        </div>
        {/* Notification bell */}
        <NotificationBell userId={currentUser?.id} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1 mb-6 overflow-x-auto">
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
                  ? 'bg-secondary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'queue' && unseenCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {unseenCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'explore' && (
        <ListenTab
          favoriteIds={favoriteIds}
          toggleFavorite={toggleFavorite}
          addToQueue={addToQueue}
          ownedIds={ownedIds}
        />
      )}
      {activeTab === 'submit' && (
        <SubmitWizard
          user={currentUser}
          editingDraft={editingDraft}
          onSubmitSuccess={() => {
            setEditingDraft(null);
            setActiveTab('my-submissions');
          }}
          onDraftSaved={() => {
            setEditingDraft(null);
            setActiveTab('my-submissions');
          }}
        />
      )}
      {activeTab === 'library' && (
        <MyLibrary
          user={currentUser}
          isAdmin={isAdmin}
          favoriteIds={favoriteIds}
          toggleFavorite={toggleFavorite}
          queueTrackIds={queueTrackIds}
          queueIds={queueIds}
          addToQueue={addToQueue}
          removeFromQueue={removeFromQueue}
          reorderQueue={reorderQueue}
          clearQueue={clearQueue}
        />
      )}
      {activeTab === 'my-submissions' && (
        <MySeedsTab
          user={currentUser}
          onEditDraft={(draft) => {
            setEditingDraft(draft);
            setActiveTab('submit');
          }}
        />
      )}
      {activeTab === 'queue' && isAdmin && <AdminWorkbench />}
    </div>
  );
}
