import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Check, X } from 'lucide-react';

const DAY_MS = 86400000;

function relativeDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  const now = Date.now();
  const diff = d.getTime() - now;
  const days = Math.ceil(diff / DAY_MS);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function urgencyClass(dateStr) {
  if (!dateStr) return 'text-muted-foreground';
  const d = new Date(dateStr + 'T12:00:00');
  const days = Math.ceil((d.getTime() - Date.now()) / DAY_MS);
  if (days < 0) return 'text-red-400'; // overdue
  if (days <= 1) return 'text-primary'; // today/tomorrow
  if (days <= 3) return 'text-primary/70'; // soon
  return 'text-muted-foreground';
}

const SOURCE_LABELS = {
  team: 'Team',
  'field-service': 'Field Service',
  finance: 'Finance',
  'property-pulse': 'Property',
};

/**
 * RemindersCard — shows active MylaneNote records in the Home feed.
 * Renders nothing if there are no active notes (keeps feed clean).
 */
export default function RemindersCard({ userId }) {
  const queryClient = useQueryClient();

  // Read via agentScopedQuery (asServiceRole) so agent-created records are visible.
  // MylaneNote has Creator Only RLS — .list() misses records created by agentScopedWrite.
  // This is the DEC-140/DEC-144 pattern: read via service role, scope by user_id.
  const { data: notes = [] } = useQuery({
    queryKey: ['mylane-notes', userId],
    queryFn: async () => {
      if (!userId) return [];
      try {
        const res = await base44.functions.invoke('agentScopedQuery', {
          action: 'query',
          user_id: userId,
          workspace: 'platform',
          entity: 'MylaneNote',
        });
        // Axios wrapper: result.data is the JSON body, result.data.data is the records
        const records = res?.data?.data || res?.data || [];
        return Array.isArray(records) ? records : [];
      } catch { return []; }
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30s — reminders should appear quickly after agent writes
  });

  const activeNotes = useMemo(
    () => notes
      .filter((n) => n.status === 'active')
      .sort((a, b) => {
        // Due dates first (soonest first), then by created_date newest
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        return new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime();
      }),
    [notes]
  );

  const markDone = useMutation({
    mutationFn: (noteId) => base44.entities.MylaneNote.update(noteId, { status: 'done' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mylane-notes', userId] }),
  });

  const dismiss = useMutation({
    mutationFn: (noteId) => base44.entities.MylaneNote.update(noteId, { status: 'dismissed' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mylane-notes', userId] }),
  });

  // Don't render if no active notes
  if (activeNotes.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Reminders</span>
        <span className="text-xs text-muted-foreground">{activeNotes.length}</span>
      </div>
      <div className="space-y-2">
        {activeNotes.map((note) => {
          const dueDateLabel = relativeDate(note.due_date);
          const dueCls = urgencyClass(note.due_date);
          const sourceLabel = SOURCE_LABELS[note.source_space];
          return (
            <div
              key={note.id}
              className="flex items-start gap-2 group"
            >
              {/* Done button */}
              <button
                type="button"
                onClick={() => markDone.mutate(note.id)}
                className="flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 border-primary/40 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-colors"
                title="Mark done"
              >
                <Check className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug">{note.content}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {dueDateLabel && (
                    <span className={`text-xs font-medium ${dueCls}`}>{dueDateLabel}</span>
                  )}
                  {sourceLabel && (
                    <span className="text-xs text-muted-foreground/60">{sourceLabel}</span>
                  )}
                </div>
              </div>
              {/* Dismiss */}
              <button
                type="button"
                onClick={() => dismiss.mutate(note.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 p-0.5 transition-all"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
