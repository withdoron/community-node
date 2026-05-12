import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Trash2, ArrowRightLeft, Inbox, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { excludeDeleted } from '@/utils/softDelete';
import { countDependents } from '@/utils/softDeleteProjectWithCascade';

/**
 * Pre-delete dependency-check modal (IF-008 Session 1).
 *
 * On open, queries every dependent entity for live records referencing
 * `projectId`. If total = 0, auto-confirms with mode="delete" — no warning
 * needed. If total > 0, surfaces a three-option warning:
 *   1. Delete project and all records   (mode: 'delete')
 *   2. Reassign records to another project   (mode: 'reassign', reassignTo: id)
 *   3. Move records to Unassigned   (mode: 'unassigned')
 *
 * The component is a primitive — it never invokes the cascade itself; the
 * caller wires onConfirm to softDeleteProjectWithCascade.
 *
 * Props
 *   open             — boolean (controlled)
 *   onOpenChange     — boolean callback for shadcn AlertDialog
 *   projectId        — the project being deleted
 *   projectName      — display name for the headline
 *   profileId        — workspace anchor; scopes the reassign-target picker
 *   onConfirm        — ({ mode, reassignTo? }) callback
 *   onCancel         — () callback; defaults to a no-op
 */
const ENTITY_LABELS = {
  FSPayment: { singular: 'payment', plural: 'payments' },
  FSDailyLog: { singular: 'daily log', plural: 'daily logs' },
  FSEstimate: { singular: 'estimate', plural: 'estimates' },
  FSChangeOrder: { singular: 'change order', plural: 'change orders' },
  FSMaterialEntry: { singular: 'material entry', plural: 'material entries' },
  FSLaborEntry: { singular: 'labor entry', plural: 'labor entries' },
  FSDocument: { singular: 'document', plural: 'documents' },
  FSPermit: { singular: 'permit', plural: 'permits' },
  FSDailyPhoto: { singular: 'daily photo', plural: 'daily photos' },
  Engagement: { singular: 'engagement', plural: 'engagements' },
};

function labelFor(entityType, count) {
  const meta = ENTITY_LABELS[entityType] || { singular: entityType, plural: entityType };
  return `${count} ${count === 1 ? meta.singular : meta.plural}`;
}

export default function ConfirmDeleteWithDependents({
  open,
  onOpenChange,
  projectId,
  projectName,
  profileId,
  onConfirm,
  onCancel = () => {},
}) {
  const [mode, setMode] = useState('warning'); // 'warning' | 'reassign-picker'
  const [reassignTo, setReassignTo] = useState('');

  // Fire-once ref guard for auto-confirm. Without this, `onConfirm` being
  // a new function reference on every parent render re-fires the useEffect
  // and triggers `mutate()` again — which produced React error #185
  // (max update depth exceeded) on 2026-05-11 production attempt.
  const autoConfirmedRef = useRef(false);

  // Reset internal state when the modal closes.
  useEffect(() => {
    if (!open) {
      setMode('warning');
      setReassignTo('');
      autoConfirmedRef.current = false;
    }
  }, [open]);

  // Count dependents on open. countDependents() returns { entityType: n, _total: total }.
  // retry:false — 429s should bubble immediately so the modal can surface
  // the failure instead of compounding it; the cascade's withRetry handles
  // legitimate retry semantics with bounded backoff.
  const {
    data: counts,
    isLoading: countsLoading,
    error: countsError,
  } = useQuery({
    queryKey: ['fs-project-dependents', projectId],
    queryFn: () => countDependents(projectId),
    enabled: !!projectId && !!open,
    staleTime: 0,
    retry: false,
  });

  // Auto-confirm with delete when there are zero dependents. The modal stays
  // open just long enough to read the count; this skips the warning UI and
  // matches the existing "no records attached → just delete" behavior. Ref
  // guard ensures the effect fires at most once per modal-open session.
  useEffect(() => {
    if (!open) return;
    if (!counts) return;
    if (autoConfirmedRef.current) return;
    if (counts._total === 0) {
      autoConfirmedRef.current = true;
      onConfirm({ mode: 'delete' });
    }
  }, [open, counts, onConfirm]);

  // Reassign-target picker uses the workspace's projects list. Cache key
  // matches FieldServiceProjects.jsx's query so this pulls from cache when
  // the user opens the picker right after the projects list rendered.
  const { data: projectsList = [] } = useQuery({
    queryKey: ['fs-projects', profileId],
    queryFn: async () => {
      const all = await base44.entities.FSProject.list();
      const arr = Array.isArray(all) ? all : all ? [all] : [];
      return arr.filter((p) => p.profile_id === profileId);
    },
    enabled: !!profileId && !!open && mode === 'reassign-picker',
  });

  // Project picker excludes: current project, soft-deleted, and the
  // Unassigned sentinel. Only live, non-sentinel candidates are pickable.
  const reassignTargets = useMemo(() => {
    return excludeDeleted(projectsList).filter(
      (p) => p.id !== projectId && p.is_unassigned !== true,
    );
  }, [projectsList, projectId]);

  const handleCancel = () => {
    onCancel();
    onOpenChange?.(false);
  };

  const totalDependents = counts?._total ?? 0;
  const entries = counts
    ? Object.entries(counts).filter(([k, v]) => k !== '_total' && v > 0)
    : [];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border">
        {countsError ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Could not check for attached records
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                {countsError?.message || 'A request to the server failed.'} Try again in a moment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg border border-border text-foreground-soft hover:bg-secondary transition-colors min-h-[44px]"
              >
                Close
              </button>
            </div>
          </>
        ) : countsLoading || (counts && totalDependents === 0) ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {countsLoading ? 'Checking for attached records…' : 'Deleting…'}
            </p>
          </div>
        ) : mode === 'reassign-picker' ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">
                Reassign records to another project
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Pick the project that should receive these {totalDependents} record{totalDependents === 1 ? '' : 's'}.
                The current project (<span className="text-foreground-soft">{projectName}</span>) will be soft-deleted after the records move.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="mt-2 max-h-[40vh] overflow-y-auto space-y-1">
              {reassignTargets.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No other live projects in this workspace. Use "Move to Unassigned" instead.
                </p>
              ) : (
                reassignTargets.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      reassignTo === p.id
                        ? 'bg-primary/10 border border-primary'
                        : 'border border-border hover:bg-secondary'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reassign-target"
                      value={p.id}
                      checked={reassignTo === p.id}
                      onChange={() => setReassignTo(p.id)}
                      className="accent-primary"
                    />
                    <div className="flex-1">
                      <div className="text-sm text-foreground">{p.name || '(unnamed project)'}</div>
                      {p.client_name ? (
                        <div className="text-xs text-muted-foreground">{p.client_name}</div>
                      ) : null}
                    </div>
                  </label>
                ))
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">
              <button
                type="button"
                onClick={() => setMode('warning')}
                className="px-4 py-2 rounded-lg border border-border text-foreground-soft hover:bg-secondary transition-colors min-h-[44px]"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!reassignTo}
                onClick={() => onConfirm({ mode: 'reassign', reassignTo })}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reassign and delete project
              </button>
            </div>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                This project has records attached
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                <span className="text-foreground-soft">{projectName}</span> has{' '}
                {totalDependents} record{totalDependents === 1 ? '' : 's'} tied to it. Pick how
                they should be handled.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="mt-2 mb-2 rounded-lg border border-border bg-secondary/40 p-3">
              <ul className="space-y-1 text-sm text-foreground-soft">
                {entries.map(([entityType, count]) => (
                  <li key={entityType}>• {labelFor(entityType, count)}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <button
                type="button"
                onClick={() => onConfirm({ mode: 'delete' })}
                className="flex items-start gap-3 p-3 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-left min-h-[60px]"
              >
                <Trash2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium">Delete project and all records</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Soft-deletes the project and every attached record. Reversible by an admin.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('reassign-picker')}
                className="flex items-start gap-3 p-3 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors text-left min-h-[60px]"
              >
                <ArrowRightLeft className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                <div>
                  <div className="font-medium">Reassign records to another project</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Pick a different project to receive these records, then delete this one.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onConfirm({ mode: 'unassigned' })}
                className="flex items-start gap-3 p-3 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors text-left min-h-[60px]"
              >
                <Inbox className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                <div>
                  <div className="font-medium">Move records to Unassigned</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Records survive in a workspace Unassigned bucket. Review and reassign them later.
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg border border-border text-foreground-soft hover:bg-secondary transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
