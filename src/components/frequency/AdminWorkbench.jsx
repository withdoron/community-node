/**
 * AdminWorkbench — enhanced admin queue for Frequency Station.
 * Shows submissions with two Suno-ready copy-paste boxes (Lyrics + Styles).
 * "Deliver to submitter" creates a FrequencySong owned by the submitter,
 * notifies them, and marks the submission released.
 *
 * // TEMP: Admin manual upload path. Will be replaced by Frequency Agent (Suno API) when superagent ships.
 */
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { sanitizeText } from '@/utils/sanitize';
import { validateFile } from '@/utils/fileValidation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Filter, Eye, Clock, CheckCircle, Archive, Music, Loader2,
  Copy, Upload, X, Volume2, Image, ChevronDown, ChevronUp,
  Send, User,
} from 'lucide-react';

const STATUS_CONFIG = {
  submitted: { label: 'Submitted', color: 'text-primary-hover', bg: 'bg-primary/20' },
  in_progress: { label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  released: { label: 'Released', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  archived: { label: 'Archived', color: 'text-muted-foreground', bg: 'bg-muted-foreground/20' },
};

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg'];

function generateSlug(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full text-xs px-2 py-0.5 ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── Suno Copy Boxes ─────────────────────────────────────────────────────────
function SunoCopyBox({ label, content }) {
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(
      () => toast.success(`${label} copied!`),
      () => toast.error('Could not copy')
    );
  }, [content, label]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
        >
          <Copy className="h-3 w-3" />
          Copy
        </button>
      </div>
      <pre className="bg-secondary border border-border rounded-lg p-3 text-sm text-foreground-soft whitespace-pre-wrap font-serif max-h-48 overflow-y-auto">
        {content}
      </pre>
    </div>
  );
}

// ── Build Suno-ready strings from submission fields ─────────────────────────
function buildLyricsBox(sub) {
  const title = sub.title || sub.title_suggestion || '';
  const body = sub.raw_text || '';
  if (title) return `${title}\n\n${body}`;
  return body;
}

function buildStylesBox(sub) {
  const parts = [];
  if (sub.style_genre) parts.push(sub.style_genre);
  if (sub.vocal_style) parts.push(`${sub.vocal_style} vocal`);
  if (sub.tempo_feel) parts.push(`${sub.tempo_feel} tempo`);
  if (sub.reference_artist) parts.push(`like ${sub.reference_artist}`);
  return parts.join(', ') || 'No style preferences specified';
}

// ── Delivery Form (inline per-submission) ───────────────────────────────────
// TEMP: Admin manual upload path. Will be replaced by Frequency Agent (Suno API) when superagent ships.
function DeliveryForm({ submission, onDelivered, onCancel }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(submission.title || submission.title_suggestion || '');
  const [lyrics, setLyrics] = useState(submission.raw_text || '');
  const [styleGenre, setStyleGenre] = useState(submission.style_genre || '');
  const [creditLine, setCreditLine] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [delivering, setDelivering] = useState(false);
  const deliveringRef = useRef(false); // sync guard against double-click
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

  const handleDeliver = useCallback(async () => {
    if (!title.trim() || !audioFile) {
      toast.error('Title and audio file are required');
      return;
    }
    // Synchronous ref guard — prevents double-invocation from fast double-click
    // (React state update is async; disabled prop lags one render behind)
    if (deliveringRef.current) return;
    deliveringRef.current = true;
    setDelivering(true);
    try {
      // Upload audio
      const audioResult = await base44.integrations.Core.UploadFile({ file: audioFile });
      const audioUrl = audioResult?.file_url || audioResult?.url;
      if (!audioUrl) throw new Error('Audio upload failed');

      // Upload cover if present
      let coverUrl = '';
      if (coverFile) {
        const coverResult = await base44.integrations.Core.UploadFile({ file: coverFile });
        coverUrl = coverResult?.file_url || coverResult?.url || '';
      }

      // Create FrequencySong owned by submitter
      const slug = generateSlug(title);
      const submitterUserId = submission.user_id || submission.created_by || '';

      // Look up submitter's FrequencyArtist for artist_id (if they have one)
      let artistId = '';
      if (submitterUserId) {
        try {
          const allArtists = await base44.entities.FrequencyArtist.list();
          const submitterArtist = (Array.isArray(allArtists) ? allArtists : [])
            .find((a) => String(a.owner_user_id) === String(submitterUserId));
          if (submitterArtist) artistId = String(submitterArtist.id);
        } catch {}
      }

      await base44.entities.FrequencySong.create({
        title: sanitizeText(title.trim()),
        slug,
        lyrics: sanitizeText(lyrics.trim()),
        style_genre: sanitizeText(styleGenre.trim()),
        mood_tag: submission.theme || '',
        artist_id: artistId,
        audio_url: audioUrl,
        cover_image_url: coverUrl,
        credit_line: sanitizeText(creditLine.trim()) || 'Frequency Station',
        owner_user_id: submitterUserId,
        source_submission_id: String(submission.id),
        is_public: false,
        listen_count: 0,
        share_count: 0,
        is_featured: false,
        status: 'published',
        published_at: new Date().toISOString(),
      });

      // Create notification for submitter
      if (submitterUserId) {
        try {
          await base44.entities.FrequencyNotification.create({
            user_id: submitterUserId,
            type: 'song_delivered',
            title: 'Your song is ready!',
            body: `"${title}" has been created from your seed.`,
            link: `/frequency/${slug}`,
            is_read: false,
          });
        } catch (err) {
          console.warn('Notification creation failed (non-blocking):', err);
        }
      }

      // Mark submission released
      await base44.entities.FSFrequencySubmission.update(submission.id, {
        status: 'released',
        admin_seen: true,
      });

      toast.success('Song delivered to submitter!');
      queryClient.invalidateQueries({ queryKey: ['frequency-queue'] });
      queryClient.invalidateQueries({ queryKey: ['frequency-songs'] });
      queryClient.invalidateQueries({ queryKey: ['frequency-my-seeds'] });
      queryClient.invalidateQueries({ queryKey: ['frequency-my-library'] });
      onDelivered?.();
    } catch (err) {
      console.error('Delivery error:', err);
      toast.error('Failed to deliver song');
    } finally {
      deliveringRef.current = false;
      setDelivering(false);
    }
  }, [title, lyrics, styleGenre, creditLine, audioFile, coverFile, submission, queryClient, onDelivered]);

  return (
    <div className="bg-secondary border border-primary/20 rounded-lg p-4 space-y-4 mt-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-primary">Deliver song to submitter</h4>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Song title *</label>
        <input
          type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Lyrics</label>
        <textarea
          value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={4}
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm resize-none focus:outline-none focus:border-primary font-serif"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Style / Genre</label>
        <input
          type="text" value={styleGenre} onChange={(e) => setStyleGenre(e.target.value)}
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Credit line</label>
        <input
          type="text" value={creditLine} onChange={(e) => setCreditLine(e.target.value)}
          placeholder="Artist name or credit..."
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary"
        />
      </div>

      {/* Audio upload */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Audio file * (max 25MB)</label>
        {audioFile ? (
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <Volume2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-foreground-soft truncate flex-1">{audioFile.name}</span>
            <button type="button" onClick={() => setAudioFile(null)} className="text-muted-foreground hover:text-red-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => audioInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-card border border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm"
          >
            <Upload className="h-4 w-4" /> Choose audio file
          </button>
        )}
        <input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioSelect} className="hidden" />
      </div>

      {/* Cover image */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Cover image (optional)</label>
        {coverFile ? (
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
            <Image className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-foreground-soft truncate flex-1">{coverFile.name}</span>
            <button type="button" onClick={() => setCoverFile(null)} className="text-muted-foreground hover:text-red-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => coverInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-card border border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm"
          >
            <Image className="h-4 w-4" /> Choose cover image
          </button>
        )}
        <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverSelect} className="hidden" />
      </div>

      <Button
        onClick={handleDeliver}
        disabled={!title.trim() || !audioFile || delivering}
        className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold disabled:bg-surface disabled:text-muted-foreground/70"
      >
        {delivering ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Delivering...</>
        ) : (
          <><Send className="h-4 w-4 mr-2" />Deliver to submitter</>
        )}
      </Button>
    </div>
  );
}

// ── Main Queue/Workbench ────────────────────────────────────────────────────
export default function AdminWorkbench() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [deliveringId, setDeliveringId] = useState(null);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['frequency-queue'],
    queryFn: () => base44.entities.FSFrequencySubmission.list(),
    refetchInterval: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FSFrequencySubmission.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frequency-queue'] });
      queryClient.invalidateQueries({ queryKey: ['frequency-my-seeds'] });
      queryClient.invalidateQueries({ queryKey: ['frequency-unseen-count'] });
    },
    onError: () => toast.error('Action failed'),
  });

  const markSeen = useCallback((id) => updateMutation.mutate({ id, data: { admin_seen: true } }), [updateMutation]);
  const startProcessing = useCallback((id) => {
    updateMutation.mutate({ id, data: { status: 'in_progress', admin_seen: true } });
    toast.success('Moved to In Progress');
  }, [updateMutation]);
  const archiveSubmission = useCallback((id) => {
    updateMutation.mutate({ id, data: { status: 'archived', admin_seen: true } });
    toast.success('Archived');
  }, [updateMutation]);

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
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="py-6 space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.id} type="button" onClick={() => setStatusFilter(opt.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              statusFilter === opt.id
                ? 'bg-primary/20 text-primary border-primary/40'
                : 'bg-card text-muted-foreground border-border'
            }`}
          >
            {opt.label}
            {opt.id !== 'all' && (
              <span className="ml-1 text-muted-foreground/70">
                ({submissions.filter((s) => s.status === opt.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Filter className="h-6 w-6 text-muted-foreground/70 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No submissions match this filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const isExpanded = expandedId === sub.id;
            return (
              <div
                key={sub.id}
                className={`bg-card border rounded-lg p-4 ${!sub.admin_seen ? 'border-primary/40' : 'border-border'}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={sub.status} />
                    {!sub.admin_seen && (
                      <span className="inline-flex items-center gap-1 rounded-full text-xs px-2 py-0.5 bg-primary/20 text-primary">New</span>
                    )}
                    {sub.is_anonymous && <span className="text-xs text-muted-foreground/70">Anonymous</span>}
                    {sub.user_id && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                        <User className="h-3 w-3" /> {sub.created_by || sub.user_id}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground/70 shrink-0">
                    {sub.created_date ? new Date(sub.created_date).toLocaleDateString() : ''}
                  </span>
                </div>

                {/* Title + preview */}
                {(sub.title || sub.title_suggestion) && (
                  <p className="text-sm font-medium text-primary mb-1">{sub.title || sub.title_suggestion}</p>
                )}
                <p className="text-sm text-foreground-soft whitespace-pre-wrap mb-2 line-clamp-3">{sub.raw_text}</p>

                {/* Submission metadata */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-2">
                  {sub.style_genre && <span className="bg-secondary px-2 py-0.5 rounded">{sub.style_genre}</span>}
                  {sub.vocal_style && <span className="bg-secondary px-2 py-0.5 rounded">{sub.vocal_style} vocal</span>}
                  {sub.tempo_feel && <span className="bg-secondary px-2 py-0.5 rounded">{sub.tempo_feel} tempo</span>}
                  {sub.reference_artist && <span className="bg-secondary px-2 py-0.5 rounded">like {sub.reference_artist}</span>}
                  {sub.dedication && <span className="bg-secondary px-2 py-0.5 rounded italic">For: {sub.dedication}</span>}
                </div>

                {/* Expand/collapse Suno boxes */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors mb-2"
                >
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {isExpanded ? 'Hide' : 'Show'} Suno boxes
                </button>

                {isExpanded && (
                  <div className="space-y-3 mb-3">
                    <SunoCopyBox label="Lyrics" content={buildLyricsBox(sub)} />
                    <SunoCopyBox label="Styles" content={buildStylesBox(sub)} />
                  </div>
                )}

                {/* Delivery form */}
                {deliveringId === sub.id && (
                  <DeliveryForm
                    submission={sub}
                    onDelivered={() => setDeliveringId(null)}
                    onCancel={() => setDeliveringId(null)}
                  />
                )}

                {/* Admin actions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-border mt-3">
                  {!sub.admin_seen && (
                    <button type="button" onClick={() => markSeen(sub.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <Eye className="h-3 w-3" /> Mark seen
                    </button>
                  )}
                  {sub.status === 'submitted' && (
                    <button type="button" onClick={() => startProcessing(sub.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-blue-400 transition-colors">
                      <Clock className="h-3 w-3" /> Start processing
                    </button>
                  )}
                  {(sub.status === 'submitted' || sub.status === 'in_progress') && deliveringId !== sub.id && (
                    <button type="button" onClick={() => setDeliveringId(sub.id)}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors font-medium">
                      <Music className="h-3 w-3" /> Deliver song
                    </button>
                  )}
                  {sub.status !== 'archived' && sub.status !== 'released' && (
                    <button type="button" onClick={() => archiveSubmission(sub.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground-soft transition-colors">
                      <Archive className="h-3 w-3" /> Archive
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
