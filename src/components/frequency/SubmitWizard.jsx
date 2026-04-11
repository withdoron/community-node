/**
 * SubmitWizard — multi-step submission wizard for Frequency Station.
 * Collects: title, seed/lyrics, mood (dynamic from FrequencyMood), style_genre,
 * vocal_style, tempo_feel, reference_artist, dedication.
 * Creates FSFrequencySubmission with all fields.
 */
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { sanitizeText } from '@/utils/sanitize';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Send, ArrowLeft, ArrowRight, Music, Loader2, AlertCircle,
  Mic, Guitar, Zap, Heart, ChevronDown,
} from 'lucide-react';

const STEPS = ['seed', 'style', 'details'];
const STEP_LABELS = { seed: 'Your Words', style: 'The Sound', details: 'Final Details' };

const VOCAL_OPTIONS = ['', 'male', 'female', 'duet', 'choir', 'spoken word', 'whisper', 'rap'];
const TEMPO_OPTIONS = ['', 'slow', 'medium', 'fast', 'building', 'freeform'];

export default function SubmitWizard({ user, onSubmitSuccess }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  // Form state
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [moodId, setMoodId] = useState('');
  const [styleGenre, setStyleGenre] = useState('');
  const [vocalStyle, setVocalStyle] = useState('');
  const [tempoFeel, setTempoFeel] = useState('');
  const [referenceArtist, setReferenceArtist] = useState('');
  const [dedication, setDedication] = useState('');

  // Load dynamic moods from FrequencyMood entity
  const { data: moods = [] } = useQuery({
    queryKey: ['frequency-moods'],
    queryFn: async () => {
      try {
        const all = await base44.entities.FrequencyMood.list();
        return (Array.isArray(all) ? all : []).filter((m) => m.is_active !== false);
      } catch { return []; }
    },
    staleTime: 5 * 60 * 1000,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user.id,
        raw_text: sanitizeText(rawText.trim()),
        title: sanitizeText(title.trim()) || '',
        mood_id: moodId || '',
        style_genre: sanitizeText(styleGenre.trim()) || '',
        vocal_style: vocalStyle || '',
        tempo_feel: tempoFeel || '',
        reference_artist: sanitizeText(referenceArtist.trim()) || '',
        dedication: sanitizeText(dedication.trim()) || '',
        status: 'submitted',
        admin_seen: false,
        // Keep legacy fields for backward compat
        theme: 'custom',
        is_anonymous: false,
        title_suggestion: sanitizeText(title.trim()) || '',
      };
      return base44.entities.FSFrequencySubmission.create(payload);
    },
    onSuccess: () => {
      toast.success("Seed planted! We'll nurture it into music.");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['frequency-my-seeds'] });
      queryClient.invalidateQueries({ queryKey: ['frequency-queue'] });
      queryClient.invalidateQueries({ queryKey: ['frequency-unseen-count'] });
      onSubmitSuccess?.();
    },
    onError: () => toast.error('Could not submit. Please try again.'),
  });

  const resetForm = () => {
    setStep(0);
    setTitle('');
    setRawText('');
    setMoodId('');
    setStyleGenre('');
    setVocalStyle('');
    setTempoFeel('');
    setReferenceArtist('');
    setDedication('');
  };

  const canAdvance = () => {
    if (step === 0) return rawText.trim().length > 0;
    return true; // steps 1 and 2 are all optional
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    submitMutation.mutate();
  };

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
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto py-6 space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
                i <= step ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i <= step ? 'text-primary' : 'text-muted-foreground'}`}>
              {STEP_LABELS[s]}
            </span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Your Words */}
      {step === 0 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-1">Plant a seed</h3>
            <p className="text-sm text-muted-foreground">Write what's on your heart. We turn it into music.</p>
          </div>

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

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Your words *</label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="A poem, a feeling, a letter, a rant, a prayer... anything real."
              rows={8}
              className="w-full px-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm resize-none focus:outline-none focus:border-primary font-serif"
              required
            />
            <p className="text-xs text-muted-foreground/50 mt-1 text-right">
              {rawText.length > 0 ? `${rawText.length} characters` : ''}
            </p>
          </div>

          {/* Mood selector (dynamic from FrequencyMood) */}
          {moods.length > 0 && (
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Mood (optional)</label>
              <div className="flex flex-wrap gap-2">
                {moods.map((m) => {
                  const selected = moodId === String(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMoodId(selected ? '' : String(m.id))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        selected
                          ? 'bg-primary/20 text-primary border-primary/40'
                          : 'bg-card text-muted-foreground border-border hover:border-border'
                      }`}
                    >
                      {m.icon && <span>{m.icon}</span>}
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: The Sound */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-1">Shape the sound</h3>
            <p className="text-sm text-muted-foreground">These help us transform your words. All optional.</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              <Guitar className="h-3.5 w-3.5 inline mr-1" />
              Style / Genre
            </label>
            <input
              type="text"
              value={styleGenre}
              onChange={(e) => setStyleGenre(e.target.value)}
              placeholder='e.g., "folk acoustic", "trip-hop", "indie pop", "hip-hop"'
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              <Mic className="h-3.5 w-3.5 inline mr-1" />
              Vocal style
            </label>
            <div className="flex flex-wrap gap-2">
              {VOCAL_OPTIONS.filter(Boolean).map((v) => (
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

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              <Zap className="h-3.5 w-3.5 inline mr-1" />
              Tempo
            </label>
            <div className="flex flex-wrap gap-2">
              {TEMPO_OPTIONS.filter(Boolean).map((t) => (
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

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              <Heart className="h-3.5 w-3.5 inline mr-1" />
              Sounds like... (reference artist)
            </label>
            <input
              type="text"
              value={referenceArtist}
              onChange={(e) => setReferenceArtist(e.target.value)}
              placeholder='e.g., "Bon Iver", "Kendrick Lamar", "Billie Eilish"'
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* Step 3: Final Details */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-1">Almost there</h3>
            <p className="text-sm text-muted-foreground">Any last details before we plant this seed.</p>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Dedication (optional)</label>
            <input
              type="text"
              value={dedication}
              onChange={(e) => setDedication(e.target.value)}
              placeholder="For my daughter, for Eugene, for anyone who's been there..."
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground placeholder-muted-foreground/70 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* Review summary */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-foreground">Review your seed</h4>
            {title && <p className="text-sm text-primary font-medium">{title}</p>}
            <p className="text-sm text-foreground-soft whitespace-pre-wrap line-clamp-6 font-serif">{rawText}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {styleGenre && <span className="bg-secondary px-2 py-0.5 rounded">{styleGenre}</span>}
              {vocalStyle && <span className="bg-secondary px-2 py-0.5 rounded">{vocalStyle} vocal</span>}
              {tempoFeel && <span className="bg-secondary px-2 py-0.5 rounded">{tempoFeel} tempo</span>}
              {referenceArtist && <span className="bg-secondary px-2 py-0.5 rounded">like {referenceArtist}</span>}
            </div>
            {dedication && (
              <p className="text-xs text-muted-foreground italic">For: {dedication}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground/70 text-center">
            Your words will be transformed into music, not published as written.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="bg-transparent border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
        <div className="flex-1" />
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance()}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold disabled:bg-surface disabled:text-muted-foreground/70"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!rawText.trim() || submitMutation.isPending}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold disabled:bg-surface disabled:text-muted-foreground/70"
          >
            {submitMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Planting...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />Plant this seed</>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
