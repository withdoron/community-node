import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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
} from 'lucide-react';

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

// ─── Tab 1: Listen ───────────────────────────────────────────────────────────
function ListenTab() {
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
        user_id: user.id,
        raw_text: rawText.trim(),
        theme: theme || 'custom',
        custom_theme: theme === 'custom' ? customTheme.trim() : '',
        is_anonymous: isAnonymous,
        dedication: dedication.trim() || '',
        title_suggestion: titleSuggestion.trim() || '',
        status: 'submitted',
        admin_seen: false,
      };
      return base44.entities.FSFrequencySubmission.create(payload);
    },
    onSuccess: () => {
      toast.success('Seed planted! We'll nurture it into music.');
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

      {/* Submit */}
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
        <p className="text-slate-400">Submit your first piece of writing to see it here.</p>
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

// ─── Tab 4: Queue (Admin) ────────────────────────────────────────────────────
function QueueTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');

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
              <div className="flex gap-2 pt-3 border-t border-slate-800 mt-3">
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
                {sub.status !== 'archived' && (
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
  const { user, isAuthenticated } = useAuth();
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
