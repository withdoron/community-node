import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Camera, X, Trash2, ChevronLeft, ChevronRight, Loader2, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const EVENT_TYPES = [
  { value: '', label: 'No tag' },
  { value: 'game', label: 'Game' },
  { value: 'practice', label: 'Practice' },
  { value: 'hangout', label: 'Hangout' },
  { value: 'other', label: 'Other' },
];

function relativeDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TeamPhotos({ team, members = [], isCoach, currentUserId }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [editingCaption, setEditingCaption] = useState(null);

  const teamId = team?.id;

  // Fetch photos
  const { data: rawPhotos = [], isLoading } = useQuery({
    queryKey: ['team-photos', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      try {
        const list = await base44.entities.TeamPhoto.filter({ team_id: teamId });
        return Array.isArray(list) ? list : [];
      } catch { return []; }
    },
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000,
  });

  // Sort newest first
  const photos = useMemo(
    () => [...rawPhotos].sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()),
    [rawPhotos]
  );

  // Member name lookup
  const memberName = useCallback((userId) => {
    const m = members.find((mem) => mem.user_id === userId);
    return m?.jersey_name || m?.name || 'Team member';
  }, [members]);

  // Upload handler
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';

    const { validateFile } = await import('@/utils/fileValidation');
    const check = validateFile(file);
    if (!check.valid) { toast.error(check.error); return; }

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const url = result?.file_url || result?.url;
      if (!url) { toast.error('Upload failed — no URL returned'); return; }

      await base44.entities.TeamPhoto.create({
        team_id: teamId,
        uploaded_by: currentUserId,
        uploader_name: memberName(currentUserId),
        photo_url: url,
        caption: '',
        event_type: '',
        event_date: '',
      });

      queryClient.invalidateQueries({ queryKey: ['team-photos', teamId] });
      toast.success('Photo shared with the team!');
    } catch (err) {
      toast.error(err?.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (photoId) => base44.entities.TeamPhoto.delete(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-photos', teamId] });
      setLightboxIndex(null);
      toast.success('Photo deleted');
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete'),
  });

  // Caption update mutation
  const captionMutation = useMutation({
    mutationFn: ({ id, caption }) => base44.entities.TeamPhoto.update(id, { caption }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-photos', teamId] });
      setEditingCaption(null);
      toast.success('Caption updated');
    },
    onError: (err) => toast.error(err?.message || 'Failed to update caption'),
  });

  // Lightbox navigation
  const lightboxPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;
  const canGoPrev = lightboxIndex !== null && lightboxIndex > 0;
  const canGoNext = lightboxIndex !== null && lightboxIndex < photos.length - 1;
  const goPrev = () => { if (canGoPrev) setLightboxIndex(lightboxIndex - 1); };
  const goNext = () => { if (canGoNext) setLightboxIndex(lightboxIndex + 1); };

  if (!teamId) return null;

  // ─── Empty state ──────────────────────────
  if (!isLoading && photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Camera className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-1">No photos yet</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs">
          Capture your team's season — game days, practices, team hangouts. Upload the first one!
        </p>
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium min-h-[44px]"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImagePlus className="h-4 w-4 mr-2" />}
            Upload Photo
          </Button>
        </label>
      </div>
    );
  }

  // ─── Loading state ──────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-secondary animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Gallery ──────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            size="sm"
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium min-h-[44px]"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </label>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="aspect-square overflow-hidden rounded bg-secondary hover:opacity-90 transition-opacity focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card"
          >
            <img
              src={photo.photo_url}
              alt={photo.caption || 'Team photo'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* ─── Lightbox ──────────────────────── */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          onClick={(e) => { if (e.target === e.currentTarget) setLightboxIndex(null); }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <span className="text-white/60 text-sm">
              {lightboxIndex + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="text-white/70 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Photo area */}
          <div className="flex-1 flex items-center justify-center relative min-h-0 px-4">
            {/* Prev arrow */}
            {canGoPrev && (
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center z-10"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
            )}
            <img
              src={lightboxPhoto.photo_url}
              alt={lightboxPhoto.caption || 'Team photo'}
              className="max-w-full max-h-full object-contain rounded"
            />
            {/* Next arrow */}
            {canGoNext && (
              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center z-10"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            )}
          </div>

          {/* Bottom info */}
          <div className="px-4 py-3 flex-shrink-0 space-y-2">
            {/* Caption */}
            {editingCaption === lightboxPhoto.id ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  placeholder="Add a caption..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/40 min-h-[44px]"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') captionMutation.mutate({ id: lightboxPhoto.id, caption: captionDraft.trim() }); }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => captionMutation.mutate({ id: lightboxPhoto.id, caption: captionDraft.trim() })}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground min-h-[44px]"
                  disabled={captionMutation.isPending}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingCaption(null)}
                  className="border-white/20 text-white/70 hover:text-white hover:bg-transparent min-h-[44px]"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  {lightboxPhoto.caption ? (
                    <p className="text-white text-sm">{lightboxPhoto.caption}</p>
                  ) : lightboxPhoto.uploaded_by === currentUserId ? (
                    <button
                      type="button"
                      onClick={() => { setCaptionDraft(''); setEditingCaption(lightboxPhoto.id); }}
                      className="text-white/40 text-sm hover:text-white/60 transition-colors"
                    >
                      Add a caption...
                    </button>
                  ) : null}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-white/50 text-xs">{lightboxPhoto.uploader_name || 'Team member'}</span>
                    <span className="text-white/30 text-xs">&middot;</span>
                    <span className="text-white/50 text-xs">{relativeDate(lightboxPhoto.created_date)}</span>
                    {lightboxPhoto.event_type && (
                      <>
                        <span className="text-white/30 text-xs">&middot;</span>
                        <span className="text-white/50 text-xs capitalize">{lightboxPhoto.event_type}</span>
                      </>
                    )}
                  </div>
                </div>
                {/* Edit caption button (uploader only) */}
                {lightboxPhoto.uploaded_by === currentUserId && lightboxPhoto.caption && (
                  <button
                    type="button"
                    onClick={() => { setCaptionDraft(lightboxPhoto.caption || ''); setEditingCaption(lightboxPhoto.id); }}
                    className="text-white/40 text-xs hover:text-white/60 transition-colors flex-shrink-0"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}

            {/* Delete button (uploader only) */}
            {lightboxPhoto.uploaded_by === currentUserId && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(lightboxPhoto)}
                  className="text-red-400/70 hover:text-red-400 text-xs flex items-center gap-1 transition-colors min-h-[44px]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}
        title="Delete this photo?"
        description="This photo will be removed from the team gallery. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
      />
    </div>
  );
}
