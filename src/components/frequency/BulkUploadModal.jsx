/**
 * BulkUploadModal — batch import audio files into My Library.
 * Auto-extracts title from filename (handles Suno export format)
 * and embedded ID3 cover art from MP3 files.
 * All uploads land as private, owned by the current user.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { sanitizeText } from '@/utils/sanitize';
import { toast } from 'sonner';
import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';
import {
  X, Upload, Loader2, Music, CheckCircle, AlertCircle, FolderUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

// ── Filename → title parser ─────────────────────────────────────────────────
export function parseFilenameToTitle(filename) {
  let name = filename;
  // Strip file extension
  name = name.replace(/\.[^.]+$/, '');
  // Strip leading "Title_ " or "Title_" (Suno export prefix)
  name = name.replace(/^Title_\s*/, '');
  // Strip trailing version markers — order matters for cases like "(1) 2"
  // First strip trailing bare number " 2", " 3" (Suno version suffix)
  name = name.replace(/\s+\d+$/, '');
  // Then strip trailing " (N)" patterns e.g. " (1)", " (2)"
  name = name.replace(/\s*\(\d+\)\s*$/, '');
  // Replace underscores with spaces
  name = name.replace(/_/g, ' ');
  // Collapse multiple spaces and trim
  name = name.replace(/\s+/g, ' ').trim();
  return name;
}

// ── ID3 cover art extractor ─────────────────────────────────────────────────
function extractCoverArt(file) {
  return new Promise((resolve) => {
    // jsmediatags only handles ID3 (MP3). For other formats, skip silently.
    const isMp3 = file.type === 'audio/mpeg' || file.name?.toLowerCase().endsWith('.mp3');
    if (!isMp3) { resolve(null); return; }

    jsmediatags.read(file, {
      onSuccess: (tag) => {
        try {
          const pic = tag?.tags?.picture;
          if (!pic || !pic.data || !pic.data.length) { resolve(null); return; }
          const byteArray = new Uint8Array(pic.data);
          const mime = pic.format || 'image/jpeg';
          resolve(new Blob([byteArray], { type: mime }));
        } catch { resolve(null); }
      },
      onError: () => resolve(null),
    });
  });
}

// ── Slug generation (same pattern as elsewhere) ─────────────────────────────
function generateSlug(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// ── Row status display ──────────────────────────────────────────────────────
function StatusIcon({ status }) {
  if (status === 'uploading') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (status === 'done') return <CheckCircle className="h-4 w-4 text-emerald-400" />;
  if (status === 'error') return <AlertCircle className="h-4 w-4 text-red-400" />;
  return <Music className="h-4 w-4 text-muted-foreground/50" />;
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BulkUploadModal({ user, artist, onClose }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const uploadingRef = useRef(false);

  const [files, setFiles] = useState([]); // [{ id, file, title, coverBlob, coverPreview, status, error }]
  const [batchGenre, setBatchGenre] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showDefaults, setShowDefaults] = useState(false);

  // Process selected files — parse titles and extract covers
  const handleFilesSelected = useCallback(async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const newFiles = await Promise.all(
      selected.map(async (file, i) => {
        const title = parseFilenameToTitle(file.name);
        let coverBlob = null;
        let coverPreview = null;
        try {
          coverBlob = await extractCoverArt(file);
          if (coverBlob) coverPreview = URL.createObjectURL(coverBlob);
        } catch {}
        return {
          id: `${Date.now()}-${i}`,
          file,
          title,
          coverBlob,
          coverPreview,
          status: 'pending', // pending | uploading | done | error
          error: null,
        };
      })
    );

    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  }, []);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => { if (f.coverPreview) URL.revokeObjectURL(f.coverPreview); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFile = (id, updates) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFile = (id) => {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.coverPreview) URL.revokeObjectURL(removed.coverPreview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleUploadAll = useCallback(async () => {
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    setIsUploading(true);

    const pending = files.filter((f) => f.status === 'pending');
    let doneCount = 0;

    for (const item of pending) {
      updateFile(item.id, { status: 'uploading' });
      try {
        // Check size
        if (item.file.size > MAX_AUDIO_SIZE) {
          throw new Error('File too large (max 25MB)');
        }

        // Upload audio
        const audioResult = await base44.integrations.Core.UploadFile({ file: item.file });
        const audioUrl = audioResult?.file_url || audioResult?.url;
        if (!audioUrl) throw new Error('Audio upload failed');

        // Upload cover art if extracted
        let coverUrl = '';
        if (item.coverBlob) {
          try {
            const coverFile = new File([item.coverBlob], 'cover.jpg', { type: item.coverBlob.type || 'image/jpeg' });
            const coverResult = await base44.integrations.Core.UploadFile({ file: coverFile });
            coverUrl = coverResult?.file_url || coverResult?.url || '';
          } catch {
            // Cover upload failed — continue without it
          }
        }

        // Create FrequencySong
        await base44.entities.FrequencySong.create({
          title: sanitizeText(item.title.trim()) || 'Untitled',
          slug: generateSlug(item.title),
          audio_url: audioUrl,
          cover_image_url: coverUrl,
          style_genre: sanitizeText(batchGenre.trim()) || '',
          owner_user_id: user.id,
          artist_id: artist ? String(artist.id) : '',
          credit_line: artist?.name || '',
          is_public: false,
          lyrics: '',
          listen_count: 0,
          share_count: 0,
          is_featured: false,
          status: 'published',
          published_at: new Date().toISOString(),
        });

        updateFile(item.id, { status: 'done' });
        doneCount++;
      } catch (err) {
        updateFile(item.id, { status: 'error', error: err.message || 'Upload failed' });
      }
    }

    // Refresh library
    queryClient.invalidateQueries({ queryKey: ['frequency-my-library'] });
    queryClient.invalidateQueries({ queryKey: ['frequency-owned-count'] });

    toast.success(`Uploaded ${doneCount} of ${pending.length} songs`);
    uploadingRef.current = false;
    setIsUploading(false);
  }, [files, batchGenre, user, artist, queryClient]);

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const allDone = files.length > 0 && pendingCount === 0 && !isUploading;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Upload songs</h3>
          {!isUploading && (
            <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Batch defaults (collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setShowDefaults(!showDefaults)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDefaults ? 'Hide' : 'Show'} batch defaults
          </button>
          {showDefaults && (
            <div className="mt-2">
              <label className="text-xs text-muted-foreground mb-1 block">
                Style / genre (applies to all songs in this batch)
              </label>
              <input
                type="text"
                value={batchGenre}
                onChange={(e) => setBatchGenre(e.target.value)}
                placeholder='e.g., "indie pop", "hip-hop"'
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm focus:outline-none focus:border-primary"
                disabled={isUploading}
              />
            </div>
          )}
        </div>

        {/* File picker */}
        {!allDone && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-6 bg-secondary border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            <FolderUp className="h-5 w-5" />
            <span className="text-sm font-medium">Select audio files</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*"
          onChange={handleFilesSelected}
          className="hidden"
        />

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {files.map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-secondary border border-border rounded-lg p-2.5">
                {/* Cover thumbnail or status icon */}
                <div className="shrink-0 w-10 h-10 rounded bg-card border border-border flex items-center justify-center overflow-hidden">
                  {item.status === 'uploading' || item.status === 'done' || item.status === 'error' ? (
                    <StatusIcon status={item.status} />
                  ) : item.coverPreview ? (
                    <img src={item.coverPreview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music className="h-4 w-4 text-muted-foreground/30" />
                  )}
                </div>

                {/* Title (editable when pending) */}
                <div className="flex-1 min-w-0">
                  {item.status === 'pending' ? (
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateFile(item.id, { title: e.target.value })}
                      className="w-full bg-transparent text-sm text-foreground focus:outline-none border-b border-transparent focus:border-primary"
                    />
                  ) : (
                    <p className="text-sm text-foreground truncate">{item.title}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground/50">{formatSize(item.file.size)}</span>
                    {item.error && <span className="text-[10px] text-red-400">{item.error}</span>}
                  </div>
                </div>

                {/* Remove button (only when pending) */}
                {item.status === 'pending' && !isUploading && (
                  <button type="button" onClick={() => removeFile(item.id)}
                    className="shrink-0 text-muted-foreground/50 hover:text-red-400 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          {allDone ? (
            <Button onClick={onClose} className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground font-bold">
              Done
            </Button>
          ) : (
            <>
              {!isUploading && (
                <Button variant="outline" onClick={onClose}
                  className="bg-transparent border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent">
                  Cancel
                </Button>
              )}
              <Button
                onClick={handleUploadAll}
                disabled={pendingCount === 0 || isUploading}
                className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground font-bold disabled:bg-surface disabled:text-muted-foreground/70"
              >
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Upload {pendingCount} {pendingCount === 1 ? 'song' : 'songs'}</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
