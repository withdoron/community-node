/**
 * MyLibrary — three-section personal library for Frequency Station.
 * Section A: My Songs (owned, with publish/delete)
 * Section B: My Favorites (hearted songs, deduped against owned)
 * Section C: My Queue (ordered, reorderable, playable)
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { sanitizeText } from '@/utils/sanitize';
import { useFrequency } from '@/contexts/FrequencyContext';
import { useFrequencyFavorites } from '@/hooks/useFrequencyFavorites';
import { useFrequencyQueue } from '@/hooks/useFrequencyQueue';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import SongRow from './SongRow';
import BulkUploadModal from './BulkUploadModal';
import {
  Music, Loader2, AlertCircle, User, Pencil, Plus, Save, Upload,
  Play, Heart, ListMusic, Trash2,
} from 'lucide-react';

function generateSlug(title) {
  return (title || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

// ── Artist Manager (unchanged from before) ──────────────────────────────────
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
          <Button onClick={() => { setName(''); setBio(''); setEditing(true); }}
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs px-3 py-1 h-auto">
            <Plus className="h-3 w-3 mr-1" /> Create
          </Button>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 mb-6 space-y-3">
        <h4 className="text-sm font-medium text-foreground">{artist ? 'Edit artist' : 'Create artist'}</h4>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Artist name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your artist name..."
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Bio (optional)</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} placeholder="A short bio..."
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm resize-none focus:outline-none focus:border-primary" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setEditing(false)}
            className="bg-transparent border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent text-xs">Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}
            className="bg-primary hover:bg-primary-hover text-primary-foreground text-xs disabled:bg-surface disabled:text-muted-foreground/70">
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />} Save
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

// ── Section header ──────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, count, children }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
      </div>
      {children}
    </div>
  );
}

// ── Main Library Tab ────────────────────────────────────────────────────────
export default function MyLibrary({ user, isAdmin }) {
  const queryClient = useQueryClient();
  const freq = useFrequency();
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // All songs (for resolving favorites + queue)
  const { data: allSongs = [], isLoading: songsLoading } = useQuery({
    queryKey: ['frequency-all-songs'],
    queryFn: async () => {
      const all = await base44.entities.FrequencySong.list();
      return Array.isArray(all) ? all : [];
    },
  });

  // Owned songs
  const ownedSongs = useMemo(() =>
    allSongs.filter((s) => String(s.owner_user_id) === String(user?.id))
      .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)),
  [allSongs, user?.id]);

  const ownedIds = useMemo(() => new Set(ownedSongs.map((s) => String(s.id))), [ownedSongs]);

  // Artist
  const { data: artist } = useQuery({
    queryKey: ['frequency-my-artist', user?.id],
    queryFn: async () => {
      const all = await base44.entities.FrequencyArtist.list();
      const arr = Array.isArray(all) ? all : [];
      return arr.find((a) => String(a.owner_user_id) === String(user.id)) || null;
    },
    enabled: !!user?.id,
  });

  // Favorites + Queue hooks
  const { favoriteIds, toggleFavorite } = useFrequencyFavorites(user?.id);
  const { trackIds: queueTrackIds, queueIds, addToQueue, removeFromQueue, reorderQueue, clearQueue } = useFrequencyQueue(user?.id, freq);

  // Resolve favorite songs (excluding owned — dedupe rule)
  const favoriteSongs = useMemo(() => {
    const songMap = new Map(allSongs.map((s) => [String(s.id), s]));
    return [...favoriteIds]
      .filter((id) => !ownedIds.has(id)) // dedupe: owned songs show in My Songs with filled heart
      .map((id) => songMap.get(id))
      .filter(Boolean);
  }, [allSongs, favoriteIds, ownedIds]);

  // Resolve queue songs (in order)
  const queueSongs = useMemo(() => {
    const songMap = new Map(allSongs.map((s) => [String(s.id), s]));
    return queueTrackIds
      .map((id) => songMap.get(String(id)))
      .filter(Boolean);
  }, [allSongs, queueTrackIds]);

  // Song actions
  const deleteMutation = useMutation({
    mutationFn: async (songId) => {
      const song = ownedSongs.find((s) => s.id === songId);
      if (!song || String(song.owner_user_id) !== String(user.id)) throw new Error('Not your song');
      return base44.entities.FrequencySong.delete(songId);
    },
    onSuccess: () => {
      toast.success('Song deleted');
      queryClient.invalidateQueries({ queryKey: ['frequency-all-songs'] });
      queryClient.invalidateQueries({ queryKey: ['frequency-my-library'] });
      queryClient.invalidateQueries({ queryKey: ['frequency-songs'] });
    },
    onError: () => toast.error('Could not delete song'),
  });

  const handleDelete = useCallback((id) => {
    if (window.confirm('Delete this song? This cannot be undone.')) deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleTogglePublic = useCallback(async (song) => {
    if (String(song.owner_user_id) !== String(user.id)) return;
    try {
      await base44.entities.FrequencySong.update(song.id, { is_public: !song.is_public });
      queryClient.invalidateQueries({ queryKey: ['frequency-all-songs'] });
      queryClient.invalidateQueries({ queryKey: ['frequency-songs'] });
      toast.success(song.is_public ? 'Song is now private' : 'Song is now public');
    } catch { toast.error('Could not update visibility'); }
  }, [user?.id, queryClient]);

  const handlePlayQueue = useCallback(() => {
    if (!freq || queueSongs.length === 0) return;
    const playlist = queueSongs.map((s) => ({
      id: s.id, title: s.title || 'Unknown', artist: s.credit_line || '',
      audioUrl: s.audio_url, coverUrl: s.cover_image_url || '', slug: s.slug || '',
    }));
    freq.setPlaylist(playlist);
    freq.setSong(playlist[0]);
  }, [freq, queueSongs]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-8 w-8 text-primary mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Sign in to see your library</h3>
        <p className="text-muted-foreground">Your songs will appear here.</p>
      </div>
    );
  }

  if (songsLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-xl mx-auto py-6 space-y-8">
      {/* Artist manager */}
      <ArtistManager user={user} />

      {/* ── Section A: My Songs ──────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Music} title="Your songs" count={ownedSongs.length}>
          {artist && (
            <button type="button" onClick={() => setShowBulkUpload(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <Upload className="h-3 w-3" /> Upload
            </button>
          )}
        </SectionHeader>

        {ownedSongs.length === 0 ? (
          <div className="text-center py-8">
            <Music className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              {artist ? 'Upload your first song or wait for a seed to bloom.' : 'Create your artist identity above to start.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {ownedSongs.map((song) => (
              <SongRow
                key={song.id}
                song={song}
                context="owned"
                isFavorited={favoriteIds.has(String(song.id))}
                isOwned={true}
                onHeart={toggleFavorite}
                onAddToQueue={addToQueue}
                onTogglePublic={handleTogglePublic}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Section B: My Favorites ──────────────────────────────────────── */}
      <div>
        <SectionHeader icon={Heart} title="Favorites" count={favoriteSongs.length} />

        {favoriteSongs.length === 0 ? (
          <div className="text-center py-8">
            <Heart className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Heart songs from Explore to keep them close.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {favoriteSongs.map((song) => (
              <SongRow
                key={song.id}
                song={song}
                context="favorite"
                isFavorited={true}
                isOwned={ownedIds.has(String(song.id))}
                onHeart={toggleFavorite}
                onAddToQueue={addToQueue}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Section C: My Queue ──────────────────────────────────────────── */}
      <div>
        <SectionHeader icon={ListMusic} title="Queue" count={queueSongs.length}>
          {queueSongs.length > 0 && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={handlePlayQueue}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors font-medium">
                <Play className="h-3 w-3" /> Play
              </button>
              <button type="button" onClick={clearQueue}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            </div>
          )}
        </SectionHeader>

        {queueSongs.length === 0 ? (
          <div className="text-center py-8">
            <ListMusic className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Add songs to your queue from anywhere in Frequency Station.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {queueSongs.map((song, idx) => (
              <SongRow
                key={song.id}
                song={song}
                context="queue"
                isFavorited={favoriteIds.has(String(song.id))}
                isOwned={ownedIds.has(String(song.id))}
                onHeart={toggleFavorite}
                onRemoveFromQueue={removeFromQueue}
                showQueueControls={true}
                onMoveUp={idx > 0 ? () => reorderQueue(idx, idx - 1) : null}
                onMoveDown={idx < queueSongs.length - 1 ? () => reorderQueue(idx, idx + 1) : null}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk upload modal */}
      {showBulkUpload && (
        <BulkUploadModal user={user} artist={artist} onClose={() => setShowBulkUpload(false)} />
      )}
    </div>
  );
}
