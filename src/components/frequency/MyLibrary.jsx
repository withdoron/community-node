/**
 * MyLibrary — personal song library + FrequencyArtist management.
 * Lists all FrequencySong where owner_user_id === me.
 * Each song: title, artist, play button, public/private toggle, delete.
 * Includes "My Artist" section for creating/editing FrequencyArtist.
 */
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { sanitizeText } from '@/utils/sanitize';
import { validateFile } from '@/utils/fileValidation';
import { useFrequency } from '@/contexts/FrequencyContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import BulkUploadModal from './BulkUploadModal';
import {
  Music, Play, Pause, Trash2, Loader2, AlertCircle,
  Eye, EyeOff, User, Pencil, Upload, X, Image, Volume2,
  Plus, Save, ChevronDown, ChevronUp,
} from 'lucide-react';

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg'];

function generateSlug(title) {
  return (title || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

// ── Public/Private Toggle ───────────────────────────────────────────────────
function VisibilityToggle({ song, currentUserId }) {
  const queryClient = useQueryClient();
  const [toggling, setToggling] = useState(false);

  const handleToggle = useCallback(async () => {
    // Client-side ownership check
    if (String(song.owner_user_id) !== String(currentUserId)) {
      toast.error('You can only change visibility of your own songs');
      return;
    }
    setToggling(true);
    try {
      await base44.entities.FrequencySong.update(song.id, {
        is_public: !song.is_public,
      });
      queryClient.invalidateQueries({ queryKey: ['frequency-my-library'] });
      queryClient.invalidateQueries({ queryKey: ['frequency-songs'] });
      toast.success(song.is_public ? 'Song is now private' : 'Song is now public');
    } catch {
      toast.error('Could not update visibility');
    } finally {
      setToggling(false);
    }
  }, [song, currentUserId, queryClient]);

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); handleToggle(); }}
      disabled={toggling}
      className={`flex items-center gap-1 text-xs transition-colors ${
        song.is_public
          ? 'text-emerald-400 hover:text-emerald-300'
          : 'text-muted-foreground hover:text-foreground-soft'
      }`}
      title={song.is_public ? 'Public — visible on Listen tab' : 'Private — only you can see'}
    >
      {toggling ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : song.is_public ? (
        <Eye className="h-3 w-3" />
      ) : (
        <EyeOff className="h-3 w-3" />
      )}
      {song.is_public ? 'Public' : 'Private'}
    </button>
  );
}

// ── Artist Manager ──────────────────────────────────────────────────────────
function ArtistManager({ user }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: artist, isLoading } = useQuery({
    queryKey: ['frequency-my-artist', user?.id],
    queryFn: async () => {
      const all = await base44.entities.FrequencyArtist.list();
      const arr = Array.isArray(all) ? all : [];
      return arr.find((a) => String(a.owner_user_id) === String(user.id)) || null;
    },
    enabled: !!user?.id,
  });

  const startEditing = useCallback(() => {
    setName(artist?.name || '');
    setBio(artist?.bio || '');
    setEditing(true);
  }, [artist]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) { toast.error('Artist name is required'); return; }
    setSaving(true);
    try {
      if (artist) {
        await base44.entities.FrequencyArtist.update(artist.id, {
          name: sanitizeText(name.trim()),
          bio: sanitizeText(bio.trim()),
        });
      } else {
        await base44.entities.FrequencyArtist.create({
          owner_user_id: user.id,
          name: sanitizeText(name.trim()),
          slug: generateSlug(name),
          bio: sanitizeText(bio.trim()),
          avatar_url: '',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['frequency-my-artist'] });
      toast.success(artist ? 'Artist updated' : 'Artist created');
      setEditing(false);
    } catch {
      toast.error('Could not save artist');
    } finally {
      setSaving(false);
    }
  }, [name, bio, artist, user, queryClient]);

  if (isLoading) return null;

  if (!artist && !editing) {
    return (
      <div className="bg-card border border-dashed border-primary/30 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Create your artist identity</p>
            <p className="text-xs text-muted-foreground mt-0.5">Set a name that appears on your songs</p>
          </div>
          <Button
            onClick={() => { setName(''); setBio(''); setEditing(true); }}
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs px-3 py-1 h-auto"
          >
            <Plus className="h-3 w-3 mr-1" /> Create
          </Button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 mb-6 space-y-3">
        <h4 className="text-sm font-medium text-foreground">
          {artist ? 'Edit artist' : 'Create artist'}
        </h4>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Artist name *</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Your artist name..."
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Bio (optional)</label>
          <textarea
            value={bio} onChange={(e) => setBio(e.target.value)} rows={2}
            placeholder="A short bio..."
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm resize-none focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setEditing(false)}
            className="bg-transparent border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent text-xs">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs disabled:bg-surface disabled:text-muted-foreground/70">
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{artist.name}</p>
            {artist.bio && <p className="text-xs text-muted-foreground line-clamp-1">{artist.bio}</p>}
          </div>
        </div>
        <button type="button" onClick={startEditing}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>
    </div>
  );
}

// ── Admin Upload Form ───────────────────────────────────────────────────────
// TEMP: Admin manual upload path. Will be replaced by Frequency Agent (Suno API) when superagent ships.
function AdminUploadForm({ user, artist, isAdmin }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [styleGenre, setStyleGenre] = useState('');
  const [creditLine, setCreditLine] = useState(artist?.name || '');
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const handleAudioSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AUDIO_SIZE) { toast.error('Audio file must be under 25MB'); return; }
    if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) { toast.error('Use MP3, WAV, M4A, or AAC'); return; }
    setAudioFile(file);
    e.target.value = '';
  }, []);

  const handleCoverSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateFile(file);
    if (!validation.valid) { toast.error(validation.error); return; }
    setCoverFile(file);
    e.target.value = '';
  }, []);

  const handleUpload = useCallback(async () => {
    if (!title.trim() || !audioFile) { toast.error('Title and audio file required'); return; }
    setUploading(true);
    try {
      const audioResult = await base44.integrations.Core.UploadFile({ file: audioFile });
      const audioUrl = audioResult?.file_url || audioResult?.url;
      if (!audioUrl) throw new Error('Audio upload failed');

      let coverUrl = '';
      if (coverFile) {
        const coverResult = await base44.integrations.Core.UploadFile({ file: coverFile });
        coverUrl = coverResult?.file_url || coverResult?.url || '';
      }

      await base44.entities.FrequencySong.create({
        title: sanitizeText(title.trim()),
        slug: generateSlug(title),
        lyrics: sanitizeText(lyrics.trim()),
        style_genre: sanitizeText(styleGenre.trim()),
        audio_url: audioUrl,
        cover_image_url: coverUrl,
        credit_line: sanitizeText(creditLine.trim()) || artist?.name || 'Frequency Station',
        artist_id: artist ? String(artist.id) : '',
        owner_user_id: user.id,
        is_public: false,
        listen_count: 0,
        share_count: 0,
        is_featured: false,
        status: 'published',
        published_at: new Date().toISOString(),
      });

      toast.success('Song uploaded to your library!');
      queryClient.invalidateQueries({ queryKey: ['frequency-my-library'] });
      setTitle(''); setLyrics(''); setStyleGenre('');
      setCreditLine(artist?.name || '');
      setAudioFile(null); setCoverFile(null);
      setExpanded(false);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }, [title, lyrics, styleGenre, creditLine, audioFile, coverFile, artist, user, queryClient]);

  if (!expanded) {
    return (
      <button
        type="button" onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-card border border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm mb-6"
      >
        <Upload className="h-4 w-4" /> Upload a song
      </button>
    );
  }

  return (
    // TEMP: Admin manual upload path. Will be replaced by Frequency Agent (Suno API) when superagent ships.
    <div className="bg-card border border-border rounded-lg p-4 mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Upload a song</h4>
        <button type="button" onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song title..."
          className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Lyrics (optional)</label>
        <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={3} placeholder="Lyrics..."
          className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm resize-none focus:outline-none focus:border-primary font-serif" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Style / Genre</label>
        <input type="text" value={styleGenre} onChange={(e) => setStyleGenre(e.target.value)} placeholder="e.g., folk, hip-hop"
          className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Credit line</label>
        <input type="text" value={creditLine} onChange={(e) => setCreditLine(e.target.value)}
          className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary" />
      </div>

      {/* Audio */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Audio file * (max 25MB)</label>
        {audioFile ? (
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
            <Volume2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-foreground-soft truncate flex-1">{audioFile.name}</span>
            <button type="button" onClick={() => setAudioFile(null)} className="text-muted-foreground hover:text-red-400"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => audioInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary border border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm">
            <Upload className="h-4 w-4" /> Choose audio file
          </button>
        )}
        <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioSelect} className="hidden" />
      </div>

      {/* Cover */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Cover image (optional)</label>
        {coverFile ? (
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-2">
            <Image className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-foreground-soft truncate flex-1">{coverFile.name}</span>
            <button type="button" onClick={() => setCoverFile(null)} className="text-muted-foreground hover:text-red-400"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => coverInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary border border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm">
            <Image className="h-4 w-4" /> Choose cover image
          </button>
        )}
        <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverSelect} className="hidden" />
      </div>

      <Button onClick={handleUpload} disabled={!title.trim() || !audioFile || uploading}
        className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold disabled:bg-surface disabled:text-muted-foreground/70">
        {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading...</> : <><Upload className="h-4 w-4 mr-2" />Upload</>}
      </Button>
    </div>
  );
}

// ── Main Library Tab ────────────────────────────────────────────────────────
export default function MyLibrary({ user, isAdmin }) {
  const queryClient = useQueryClient();
  const freq = useFrequency();
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['frequency-my-library', user?.id],
    queryFn: async () => {
      const all = await base44.entities.FrequencySong.list();
      const arr = Array.isArray(all) ? all : [];
      return arr.filter((s) => String(s.owner_user_id) === String(user.id));
    },
    enabled: !!user?.id,
  });

  const { data: artist } = useQuery({
    queryKey: ['frequency-my-artist', user?.id],
    queryFn: async () => {
      const all = await base44.entities.FrequencyArtist.list();
      const arr = Array.isArray(all) ? all : [];
      return arr.find((a) => String(a.owner_user_id) === String(user.id)) || null;
    },
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (songId) => {
      // Client-side ownership check
      const song = songs.find((s) => s.id === songId);
      if (!song || String(song.owner_user_id) !== String(user.id)) {
        throw new Error('Not your song');
      }
      return base44.entities.FrequencySong.delete(songId);
    },
    onSuccess: () => {
      toast.success('Song deleted');
      queryClient.invalidateQueries({ queryKey: ['frequency-my-library'] });
      queryClient.invalidateQueries({ queryKey: ['frequency-songs'] });
    },
    onError: () => toast.error('Could not delete song'),
  });

  const handleDelete = useCallback((id) => {
    if (window.confirm('Delete this song? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  const handlePlay = useCallback((song) => {
    freq?.setSong({
      id: song.id,
      title: song.title || 'Unknown',
      artist: song.credit_line || artist?.name || '',
      audioUrl: song.audio_url,
      coverUrl: song.cover_image_url || '',
      slug: song.slug || '',
    });
  }, [freq, artist]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-8 w-8 text-primary mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Sign in to see your library</h3>
        <p className="text-muted-foreground">Your songs will appear here.</p>
      </div>
    );
  }

  const sorted = useMemo(() =>
    [...songs].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)),
  [songs]);

  return (
    <div className="max-w-xl mx-auto py-6">
      {/* Artist manager */}
      <ArtistManager user={user} />

      {/* Upload buttons (visible to all users who have an artist identity) */}
      {artist && (
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setShowBulkUpload(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-card border border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm"
          >
            <Upload className="h-4 w-4" /> Upload songs
          </button>
        </div>
      )}

      {/* Bulk upload modal */}
      {showBulkUpload && (
        <BulkUploadModal
          user={user}
          artist={artist}
          onClose={() => setShowBulkUpload(false)}
        />
      )}

      {/* Song list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Music className="h-8 w-8 text-muted-foreground/70 mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">No songs yet</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            {artist
              ? 'Upload your first song or submit a seed to get started.'
              : 'Create your artist identity above to start uploading songs.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((song) => {
            const isThisSong = freq?.currentSong?.id === song.id;
            const isPlaying = isThisSong && freq?.isPlaying;
            return (
              <div key={song.id} className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
                {/* Play button */}
                <button
                  type="button" onClick={() => isPlaying ? freq.pause() : handlePlay(song)}
                  className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{song.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{song.credit_line || artist?.name || ''}</p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <VisibilityToggle song={song} currentUserId={user.id} />
                  <button
                    type="button" onClick={() => handleDelete(song.id)}
                    className="text-muted-foreground/50 hover:text-red-400 transition-colors"
                    title="Delete song"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
