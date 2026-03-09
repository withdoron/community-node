/**
 * IdeasBoard — DEC-066
 * Community workspace for submitting, voting on, and tracking ideas.
 *
 * PREREQUISITE: Two entities must exist in the Base44 dashboard:
 *   - Idea:     title, description, author_id, author_name, status,
 *               vote_count, admin_note, created_at, status_updated_at
 *   - IdeaVote: idea_id, user_id, created_at
 *
 * No src/api/entities.js file exists — Base44 SDK provides dynamic access
 * via base44.entities.Idea and base44.entities.IdeaVote automatically
 * once the entities are created in the dashboard.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRole } from '@/hooks/useRole';
import { ChevronUp, Settings2, Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ─── Constants ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  proposed:  { label: 'Proposed',  className: 'bg-slate-700 text-slate-300' },
  reviewing: { label: 'Reviewing', className: 'bg-amber-500/20 text-amber-500' },
  building:  { label: 'Building',  className: 'bg-blue-500/20 text-blue-400' },
  shipped:   { label: 'Shipped',   className: 'bg-green-500/20 text-green-400' },
  deferred:  { label: 'Deferred',  className: 'bg-slate-700 text-slate-500' },
};

const STATUSES = Object.keys(STATUS_CONFIG);

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'proposed', label: 'Proposed' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'building', label: 'Building' },
  { value: 'shipped', label: 'Shipped' },
];

// ─── Helpers ────────────────────────────────────────────────────

function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function getDisplayName(user) {
  return (
    user?.display_name ||
    user?.data?.display_name ||
    user?.full_name ||
    user?.email?.split('@')[0] ||
    'Community Member'
  );
}

// ─── StatusBadge ────────────────────────────────────────────────

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.proposed;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.className}`}>
      {config.label}
    </span>
  );
}

// ─── VoteButton ─────────────────────────────────────────────────

function VoteButton({ count, voted, onToggle, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex flex-col items-center justify-center w-12 min-h-[56px] rounded-lg transition-colors shrink-0 ${
        voted
          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500'
          : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-slate-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className="text-sm font-bold leading-none">{count}</span>
      <ChevronUp className="h-4 w-4 mt-0.5" />
    </button>
  );
}

// ─── IdeaSubmitForm ─────────────────────────────────────────────

function IdeaSubmitForm({ currentUser }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Idea.create({
        title: title.trim(),
        description: description.trim(),
        author_id: currentUser.id,
        author_name: getDisplayName(currentUser),
        status: 'proposed',
        vote_count: 0,
        admin_note: '',
        created_at: new Date().toISOString(),
        status_updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas-board'] });
      setTitle('');
      setDescription('');
      setExpanded(false);
      toast.success('Idea submitted!');
    },
    onError: () => {
      toast.error('Failed to submit idea');
    },
  });

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full text-left px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-500 hover:border-slate-600 transition-colors"
      >
        What would make LocalLane better?
      </button>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 100))}
        placeholder="Your idea in a few words"
        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 transition-colors"
        autoFocus
        maxLength={100}
      />
      <div className="relative">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          placeholder="Why does this matter?"
          rows={3}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-amber-500 transition-colors"
          maxLength={500}
        />
        <span className="absolute bottom-2 right-3 text-xs text-slate-600">
          {description.length}/500
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => submitMutation.mutate()}
          disabled={!title.trim() || submitMutation.isPending}
          className="bg-amber-500 hover:bg-amber-400 text-black font-medium text-sm px-4 py-2 min-h-[36px]"
        >
          {submitMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Submit'
          )}
        </Button>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setTitle('');
            setDescription('');
          }}
          className="text-sm text-slate-500 hover:text-slate-400 transition-colors px-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── AdminPanel ─────────────────────────────────────────────────

function AdminPanel({ idea, onSave, onClose }) {
  const [status, setStatus] = useState(idea.status || 'proposed');
  const [note, setNote] = useState(idea.admin_note || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(idea.id, {
        status,
        admin_note: note,
        status_updated_at: new Date().toISOString(),
      });
      onClose();
    } catch {
      toast.error('Failed to update idea');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500 shrink-0">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="flex-1 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 focus:outline-none focus:border-amber-500"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_CONFIG[s].label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500 block mb-1">Steward note</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note visible to everyone"
          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-400 text-black font-medium text-xs px-3 py-1.5 min-h-[32px]"
          size="sm"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── AuthorEditPanel ────────────────────────────────────────────

function AuthorEditPanel({ idea, onSave, onClose }) {
  const [title, setTitle] = useState(idea.title || '');
  const [description, setDescription] = useState(idea.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave(idea.id, {
        title: title.trim(),
        description: description.trim(),
      });
      onClose();
    } catch {
      toast.error('Failed to update idea');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 100))}
        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-100 focus:outline-none focus:border-amber-500"
        maxLength={100}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value.slice(0, 500))}
        rows={2}
        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-100 resize-none focus:outline-none focus:border-amber-500"
        maxLength={500}
      />
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="bg-amber-500 hover:bg-amber-400 text-black font-medium text-xs px-3 py-1.5 min-h-[32px]"
          size="sm"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function IdeasBoard({ currentUser }) {
  const queryClient = useQueryClient();
  const { isAppAdmin } = useRole();
  const [activeFilter, setActiveFilter] = useState('all');
  const [adminEditId, setAdminEditId] = useState(null);
  const [authorEditId, setAuthorEditId] = useState(null);

  // Fetch all ideas
  const { data: ideas = [], isLoading: ideasLoading } = useQuery({
    queryKey: ['ideas-board'],
    queryFn: async () => {
      try {
        const result = await base44.entities.Idea.filter({});
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch current user's votes
  const { data: userVotes = [] } = useQuery({
    queryKey: ['idea-votes', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      try {
        const result = await base44.entities.IdeaVote.filter({
          user_id: currentUser.id,
        });
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    },
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Map of idea_id → vote record for quick lookup
  const votesMap = useMemo(() => {
    const m = new Map();
    for (const v of userVotes) {
      if (v.idea_id) m.set(v.idea_id, v);
    }
    return m;
  }, [userVotes]);

  // Filtered and sorted ideas
  const filteredIdeas = useMemo(() => {
    let list = ideas;
    if (activeFilter !== 'all') {
      list = list.filter((i) => i.status === activeFilter);
    }
    return [...list].sort((a, b) => {
      const diff = (b.vote_count || 0) - (a.vote_count || 0);
      if (diff !== 0) return diff;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  }, [ideas, activeFilter]);

  // Vote mutation with optimistic UI
  const voteMutation = useMutation({
    mutationFn: async ({ ideaId, isUnvote, voteRecord, serverCount }) => {
      if (isUnvote && voteRecord) {
        await base44.entities.IdeaVote.delete(voteRecord.id);
        await base44.entities.Idea.update(ideaId, {
          vote_count: Math.max(0, (serverCount || 1) - 1),
        });
      } else {
        await base44.entities.IdeaVote.create({
          idea_id: ideaId,
          user_id: currentUser.id,
          created_at: new Date().toISOString(),
        });
        await base44.entities.Idea.update(ideaId, {
          vote_count: (serverCount || 0) + 1,
        });
      }
    },
    onMutate: async ({ ideaId, isUnvote }) => {
      await queryClient.cancelQueries({ queryKey: ['ideas-board'] });
      await queryClient.cancelQueries({
        queryKey: ['idea-votes', currentUser?.id],
      });

      const prevIdeas = queryClient.getQueryData(['ideas-board']);
      const prevVotes = queryClient.getQueryData([
        'idea-votes',
        currentUser?.id,
      ]);

      queryClient.setQueryData(['ideas-board'], (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((idea) =>
          idea.id === ideaId
            ? {
                ...idea,
                vote_count: Math.max(
                  0,
                  (idea.vote_count || 0) + (isUnvote ? -1 : 1)
                ),
              }
            : idea
        );
      });

      if (isUnvote) {
        queryClient.setQueryData(
          ['idea-votes', currentUser?.id],
          (old) =>
            Array.isArray(old)
              ? old.filter((v) => v.idea_id !== ideaId)
              : []
        );
      } else {
        queryClient.setQueryData(
          ['idea-votes', currentUser?.id],
          (old) => {
            const arr = Array.isArray(old) ? old : [];
            return [
              ...arr,
              {
                idea_id: ideaId,
                user_id: currentUser.id,
                id: `optimistic-${ideaId}`,
              },
            ];
          }
        );
      }

      return { prevIdeas, prevVotes };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevIdeas)
        queryClient.setQueryData(['ideas-board'], context.prevIdeas);
      if (context?.prevVotes)
        queryClient.setQueryData(
          ['idea-votes', currentUser?.id],
          context.prevVotes
        );
      toast.error('Vote failed — please try again');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas-board'] });
      queryClient.invalidateQueries({
        queryKey: ['idea-votes', currentUser?.id],
      });
    },
  });

  const handleVote = useCallback(
    (idea) => {
      if (!currentUser?.id) return;
      const existing = votesMap.get(idea.id);
      voteMutation.mutate({
        ideaId: idea.id,
        isUnvote: !!existing,
        voteRecord: existing || null,
        serverCount: idea.vote_count || 0,
      });
    },
    [currentUser?.id, votesMap, voteMutation]
  );

  const handleAdminUpdate = useCallback(
    async (ideaId, updates) => {
      await base44.entities.Idea.update(ideaId, updates);
      queryClient.invalidateQueries({ queryKey: ['ideas-board'] });
      toast.success('Idea updated');
    },
    [queryClient]
  );

  const handleAuthorUpdate = useCallback(
    async (ideaId, updates) => {
      await base44.entities.Idea.update(ideaId, updates);
      queryClient.invalidateQueries({ queryKey: ['ideas-board'] });
      toast.success('Idea updated');
    },
    [queryClient]
  );

  if (!currentUser) return null;

  return (
    <div className="space-y-4">
      {/* Section heading */}
      <div>
        <h2 className="text-xl font-bold text-slate-100">Ideas</h2>
        <p className="text-slate-400 text-sm mt-1">
          Shape what LocalLane becomes. Submit ideas, vote on what matters.
        </p>
      </div>

      {/* Submit form */}
      <IdeaSubmitForm currentUser={currentUser} />

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setActiveFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap transition-colors ${
              activeFilter === opt.value
                ? 'bg-amber-500/20 text-amber-500 border-amber-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Ideas list */}
      {ideasLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
        </div>
      ) : filteredIdeas.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">
            {ideas.length === 0
              ? 'No ideas yet. Be the first to shape what LocalLane becomes.'
              : 'No ideas match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredIdeas.map((idea) => {
            const voted = votesMap.has(idea.id);
            const isAuthor = currentUser.id === idea.author_id;
            const canAuthorEdit = isAuthor && idea.status === 'proposed';

            return (
              <div
                key={idea.id}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4"
              >
                <div className="flex gap-3">
                  {/* Vote button */}
                  <VoteButton
                    count={idea.vote_count || 0}
                    voted={voted}
                    onToggle={() => handleVote(idea)}
                    disabled={voteMutation.isPending}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-100 text-sm">
                        {idea.title}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusBadge status={idea.status} />
                        {isAppAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              setAdminEditId(
                                adminEditId === idea.id ? null : idea.id
                              )
                            }
                            className="p-1 text-slate-500 hover:text-amber-500 transition-colors"
                            title="Manage idea"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canAuthorEdit && (
                          <button
                            type="button"
                            onClick={() =>
                              setAuthorEditId(
                                authorEditId === idea.id ? null : idea.id
                              )
                            }
                            className="p-1 text-slate-500 hover:text-amber-500 transition-colors"
                            title="Edit idea"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {idea.description && (
                      <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                        {idea.description}
                      </p>
                    )}

                    {idea.admin_note && (
                      <p className="text-amber-500/80 text-sm italic mt-1.5">
                        {idea.admin_note}
                      </p>
                    )}

                    <p className="text-slate-500 text-xs mt-2">
                      {idea.author_name || 'Someone'} ·{' '}
                      {relativeTime(idea.created_at)}
                    </p>

                    {/* Admin edit panel */}
                    {isAppAdmin && adminEditId === idea.id && (
                      <AdminPanel
                        idea={idea}
                        onSave={handleAdminUpdate}
                        onClose={() => setAdminEditId(null)}
                      />
                    )}

                    {/* Author edit panel */}
                    {canAuthorEdit && authorEditId === idea.id && (
                      <AuthorEditPanel
                        idea={idea}
                        onSave={handleAuthorUpdate}
                        onClose={() => setAuthorEditId(null)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
