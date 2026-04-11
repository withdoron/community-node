/**
 * SubmitWizard — single-page submission form for Frequency Station.
 * All fields visible at once. Two actions: Save as Draft or Submit.
 * If editing an existing draft, updates instead of creating.
 */
import React, { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { sanitizeText } from '@/utils/sanitize';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Send, Loader2, AlertCircle, Mic, Guitar, Zap, Heart, Save,
} from 'lucide-react';

const VOCAL_OPTIONS = ['masculine', 'feminine', 'neutral', 'duet', 'instrumental'];
const TEMPO_OPTIONS = ['slow', 'medium', 'fast', 'building'];

export default function SubmitWizard({ user, onSubmitSuccess, editingDraft, onDraftSaved }) {
  const queryClient = useQueryClient();
  const savingRef = useRef(false); // sync guard against double-click

  // Form state — pre-fill from draft if editing
  const [title, setTitle] = useState(editingDraft?.title || editingDraft?.title_suggestion || '');
  const [rawText, setRawText] = useState(editingDraft?.raw_text || '');
  const [styleGenre, setStyleGenre] = useState(editingDraft?.style_genre || '');
  const [vocalStyle, setVocalStyle] = useState(editingDraft?.vocal_style || '');
  const [tempoFeel, setTempoFeel] = useState(editingDraft?.tempo_feel || '');
  const [referenceArtist, setReferenceArtist] = useState(editingDraft?.reference_artist || '');
  const [dedication, setDedication] = useState(editingDraft?.dedication || '');

  const buildPayload = (status) => ({
    user_id: user.id,
    raw_text: sanitizeText(rawText.trim()),
    title: sanitizeText(title.trim()) || '',
    style_genre: sanitizeText(styleGenre.trim()) || '',
    vocal_style: vocalStyle || '',
    tempo_feel: tempoFeel || '',
    reference_artist: sanitizeText(referenceArtist.trim()) || '',
    dedication: sanitizeText(dedication.trim()) || '',
    status,
    admin_seen: false,
    // Legacy fields for backward compat (MySeedsTab, EditSeedForm)
    theme: 'custom',
    is_anonymous: false,
    title_suggestion: sanitizeText(title.trim()) || '',
    mood_id: '',
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['frequency-my-seeds'] });
    queryClient.invalidateQueries({ queryKey: ['frequency-queue'] });
    queryClient.invalidateQueries({ queryKey: ['frequency-unseen-count'] });
  };

  const resetForm = () => {
    setTitle(''); setRawText(''); setStyleGenre('');
    setVocalStyle(''); setTempoFeel('');
    setReferenceArtist(''); setDedication('');
  };

  // Submit mutation — creates new or promotes draft to submitted
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (savingRef.current) return;
      savingRef.current = true;
      try {
        if (editingDraft) {
          // Promote draft to submitted
          return base44.entities.FSFrequencySubmission.update(editingDraft.id, {
            ...buildPayload('submitted'),
          });
        }
        return base44.entities.FSFrequencySubmission.create(buildPayload('submitted'));
      } finally {
        savingRef.current = false;
      }
    },
    onSuccess: () => {
      toast.success("Seed planted! We'll nurture it into music.");
      resetForm();
      invalidateAll();
      onSubmitSuccess?.();
    },
    onError: () => toast.error('Could not submit. Please try again.'),
  });

  // Draft mutation — creates new draft or updates existing
  const draftMutation = useMutation({
    mutationFn: async () => {
      if (savingRef.current) return;
      savingRef.current = true;
      try {
        if (editingDraft) {
          return base44.entities.FSFrequencySubmission.update(editingDraft.id, {
            ...buildPayload('draft'),
          });
        }
        return base44.entities.FSFrequencySubmission.create(buildPayload('draft'));
      } finally {
        savingRef.current = false;
      }
    },
    onSuccess: () => {
      toast.success('Draft saved.');
      invalidateAll();
      if (editingDraft) {
        onDraftSaved?.();
      } else {
        resetForm();
        onSubmitSuccess?.();
      }
    },
    onError: () => toast.error('Could not save draft.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    submitMutation.mutate();
  };

  const handleSaveDraft = (e) => {
    e.preventDefault();
    draftMutation.mutate();
  };

  const isSaving = submitMutation.isPending || draftMutation.isPending;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-8 w-8 text-primary mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Sign in to submit</h3>
        <p className="text-muted-foreground">You need to be a member to plant a seed.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto py-6 space-y-5">
      <div>
        <h3 className="text-lg font-bold text-foreground mb-1">
          {editingDraft ? 'Edit draft' : 'Plant a seed'}
        </h3>
        <p className="text-sm text-muted-foreground">
          Write what's on your heart. We turn it into music.
        </p>
      </div>

      {/* Title */}
      <div>
        <label className="text-sm text-muted-foreground mb-1.5 block">Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="If you have a title in mind..."
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm focus:outline-none focus:border-primary"
        />
      </div>

      {/* Your words */}
      <div>
        <label className="text-sm text-muted-foreground mb-1.5 block">Your words *</label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="A poem, a feeling, a letter, a rant, a prayer... anything real."
          rows={8}
          className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm resize-none focus:outline-none focus:border-primary font-serif"
        />
      </div>

      {/* Style / Genre */}
      <div>
        <label className="text-sm text-muted-foreground mb-1.5 block">
          <Guitar className="h-3.5 w-3.5 inline mr-1" />
          Style / Genre (optional)
        </label>
        <input
          type="text"
          value={styleGenre}
          onChange={(e) => setStyleGenre(e.target.value)}
          placeholder='e.g., "Billy Joel piano rock", "folk acoustic", "trip-hop"'
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm focus:outline-none focus:border-primary"
        />
      </div>

      {/* Vocal style */}
      <div>
        <label className="text-sm text-muted-foreground mb-1.5 block">
          <Mic className="h-3.5 w-3.5 inline mr-1" />
          Vocal style (optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {VOCAL_OPTIONS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVocalStyle(vocalStyle === v ? '' : v)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors capitalize ${
                vocalStyle === v
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : 'bg-card text-muted-foreground border-border'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Tempo */}
      <div>
        <label className="text-sm text-muted-foreground mb-1.5 block">
          <Zap className="h-3.5 w-3.5 inline mr-1" />
          Tempo (optional)
        </label>
        <div className="flex flex-wrap gap-2">
          {TEMPO_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTempoFeel(tempoFeel === t ? '' : t)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors capitalize ${
                tempoFeel === t
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : 'bg-card text-muted-foreground border-border'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Reference artist */}
      <div>
        <label className="text-sm text-muted-foreground mb-1.5 block">
          <Heart className="h-3.5 w-3.5 inline mr-1" />
          Sounds like... (optional)
        </label>
        <input
          type="text"
          value={referenceArtist}
          onChange={(e) => setReferenceArtist(e.target.value)}
          placeholder='e.g., "Bon Iver", "Kendrick Lamar", "Billie Eilish"'
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm focus:outline-none focus:border-primary"
        />
      </div>

      {/* Dedication */}
      <div>
        <label className="text-sm text-muted-foreground mb-1.5 block">Dedication (optional)</label>
        <textarea
          value={dedication}
          onChange={(e) => setDedication(e.target.value)}
          placeholder="For my daughter, for Eugene, for anyone who's been there..."
          rows={2}
          className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm resize-none focus:outline-none focus:border-primary"
        />
      </div>

      {/* Consent */}
      <p className="text-xs text-muted-foreground/70 text-center">
        Your words will be transformed into music, not published as written.
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSaving}
          className="bg-transparent border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent"
        >
          {draftMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save as Draft
        </Button>
        <Button
          type="submit"
          disabled={!rawText.trim() || isSaving}
          className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground font-bold disabled:bg-surface disabled:text-muted-foreground/70"
        >
          {submitMutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Planting...</>
          ) : (
            <><Send className="h-4 w-4 mr-2" />Plant this seed</>
          )}
        </Button>
      </div>
    </form>
  );
}
