import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PlayBuilder from './PlayBuilder';
import {
  getPositionsForFormat,
  DEFAULT_FORMAT,
  TAG_OPTIONS,
  FORMATION_OPTIONS,
  DEFENSE_FORMATION_OPTIONS,
  PHOTO_MODE_ROUTES,
  PHOTO_MODE_DEFENSE_ROUTES,
} from '@/config/flagFootball';

const SIDES = [{ value: 'offense', label: 'Offense' }, { value: 'defense', label: 'Defense' }];

export default function PlayCreateModal({
  open,
  onOpenChange,
  teamId,
  createdBy,
  createdByName,
  defaultSide = 'offense',
  editPlay = null,
  editAssignments = [],
  teamFormat,
  initialStatus = 'active',
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState('visual'); // 'visual' | 'photo'
  const [photoModeConfirm, setPhotoModeConfirm] = useState(false);

  const [form, setForm] = useState({
    side: defaultSide,
    name: '',
    nickname: '',
    formation: defaultSide === 'defense' ? 'Man-to-Man' : 'Spread',
    formation_custom: '',
    diagram_image: '',
    is_mirrorable: false,
    tags: '',
    tag_list: [],
    game_day: false,
    coach_notes: '',
  });

  const getPositions = (side) => getPositionsForFormat(teamFormat || DEFAULT_FORMAT, side).map((p) => p.id);
  const positions = getPositions(form.side);
  const initialAssignments = () => Object.fromEntries(positions.map((p) => [p, { route: '', assignment_text: '' }]));

  const { data: editAssignmentsFetched = [], isLoading: editAssignmentsLoading } = useQuery({
    queryKey: ['play-assignments-edit', editPlay?.id],
    queryFn: async () => {
      if (!editPlay?.id) return [];
      const list = await base44.entities.PlayAssignment.filter({ play_id: editPlay.id });
      return Array.isArray(list) ? list : [];
    },
    enabled: !!editPlay?.id && open,
  });

  const assignmentsFromEdit = editPlay ? editAssignmentsFetched : editAssignments;
  const editDataReady = !editPlay || !editAssignmentsLoading;

  const [assignments, setAssignments] = useState(initialAssignments());

  useEffect(() => {
    if (!open) return;
    if (editPlay && Array.isArray(editAssignmentsFetched)) {
      const map = initialAssignments();
      editAssignmentsFetched.forEach((a) => {
        if (positions.includes(a.position)) {
          map[a.position] = { route: a.route || '', assignment_text: a.assignment_text || '' };
        }
      });
      setAssignments(map);
    } else if (!editPlay) {
      setAssignments(initialAssignments());
    }
  }, [open, editPlay?.id, editAssignmentsFetched]);

  useEffect(() => {
    if (!open) return;
    if (editPlay) {
      const editSide = editPlay.side ?? 'offense';
      const knownFormations = editSide === 'defense'
        ? DEFENSE_FORMATION_OPTIONS.slice(0, -1)
        : FORMATION_OPTIONS.slice(0, -1);
      const isCustomFormation = !knownFormations.includes(editPlay.formation);
      const defaultFormation = editSide === 'defense' ? 'Man-to-Man' : 'Spread';
      setForm({
        side: editSide,
        name: editPlay.name ?? '',
        nickname: editPlay.nickname ?? '',
        formation: isCustomFormation ? 'Custom' : (editPlay.formation ?? defaultFormation),
        formation_custom: isCustomFormation ? (editPlay.formation || '') : '',
        diagram_image: editPlay.diagram_image ?? '',
        is_mirrorable: editPlay.is_mirrorable ?? false,
        tags: editPlay.tags ?? '',
        tag_list: editPlay.tags ? editPlay.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        game_day: editPlay.game_day ?? false,
        coach_notes: editPlay.coach_notes ?? '',
      });
    } else {
      setForm({
        side: defaultSide,
        name: '',
        nickname: '',
        formation: 'Spread',
        formation_custom: '',
        diagram_image: '',
        is_mirrorable: false,
        tags: '',
        tag_list: [],
        game_day: false,
        coach_notes: '',
      });
    }
  }, [open, editPlay?.id, defaultSide]);

  // Auto-detect mode based on play type
  useEffect(() => {
    if (!open) return;
    if (editPlay?.use_renderer) setMode('visual');
    else if (editPlay) setMode('photo');
    else setMode('visual');
  }, [open, editPlay?.id]);

  const handleModeSwitch = (newMode) => {
    if (newMode === 'photo' && editPlay?.use_renderer) {
      setPhotoModeConfirm(true);
      return;
    }
    setMode(newMode);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { validateFile } = await import('@/utils/fileValidation');
    const check = validateFile(file);
    if (!check.valid) { toast.error(check.error); return; }
    setUploading(true);
    try {
      const result = await base44.integrations?.Core?.UploadFile?.({ file });
      const url = result?.file_url || result?.url;
      if (url) setForm((f) => ({ ...f, diagram_image: url }));
      else {
        const reader = new FileReader();
        reader.onload = (ev) => setForm((f) => ({ ...f, diagram_image: ev.target?.result ?? '' }));
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => setForm((f) => ({ ...f, diagram_image: ev.target?.result ?? '' }));
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const toggleTag = (value) => {
    setForm((f) => {
      const list = f.tag_list.includes(value)
        ? f.tag_list.filter((t) => t !== value)
        : [...f.tag_list, value];
      return { ...f, tag_list: list, tags: list.join(',') };
    });
  };

  const invoke = (args) => base44.functions.invoke('manageTeamPlay', { ...args, team_id: teamId });

  const createPlay = useMutation({
    mutationFn: async (variables) => {
      const formToUse = variables?.form ?? form;
      const assignmentsToUse = variables?.assignments ?? assignments;
      const formation = formToUse.formation === 'Custom' ? (formToUse.formation_custom?.trim() || 'Custom') : formToUse.formation;
      const payload = {
        team_id: teamId,
        side: formToUse.side,
        name: formToUse.name.trim(),
        formation,
        status: editPlay ? editPlay.status : initialStatus,
        created_by: createdBy,
        ...((!editPlay && initialStatus === 'experimental' && createdByName) ? { created_by_name: createdByName } : {}),
      };
      if (formToUse.nickname?.trim()) payload.nickname = formToUse.nickname.trim();
      if (formToUse.diagram_image) payload.diagram_image = formToUse.diagram_image;
      payload.is_mirrorable = !!formToUse.is_mirrorable;
      payload.tags = (formToUse.tags ?? '').trim();
      payload.game_day = !!formToUse.game_day;
      if (formToUse.coach_notes?.trim()) payload.coach_notes = formToUse.coach_notes.trim();
      if (editPlay?.id) {
        await invoke({ action: 'update', entity_type: 'play', entity_id: editPlay.id, data: payload });
        return { id: editPlay.id, ...payload, _assignments: assignmentsToUse };
      }
      const created = await invoke({ action: 'create', entity_type: 'play', data: payload });
      return { ...created, _assignments: assignmentsToUse };
    },
    onSuccess: async (play) => {
      const playId = play.id;
      const assignmentsToUse = play._assignments ?? assignments;

      // Smart update: match by position, only delete removed, only create added
      if (editPlay?.id) {
        const existing = await base44.entities.PlayAssignment.filter({ play_id: playId }).then((r) => r ?? []);
        const existingList = Array.isArray(existing) ? existing : [];
        const existingByPos = Object.fromEntries(existingList.map((a) => [a.position, a]));

        for (const pos of positions) {
          const a = assignmentsToUse[pos];
          const hasContent = a && (a.route?.trim() || a.assignment_text?.trim());
          const existingA = existingByPos[pos];

          if (hasContent && existingA) {
            // Update existing
            await invoke({ action: 'update', entity_type: 'play_assignment', entity_id: existingA.id, data: {
              route: a.route?.trim() || null,
              assignment_text: a.assignment_text?.trim() || null,
            }});
          } else if (hasContent && !existingA) {
            // Create new
            await invoke({ action: 'create', entity_type: 'play_assignment', data: {
              play_id: playId,
              position: pos,
              route: a.route?.trim() || null,
              assignment_text: a.assignment_text?.trim() || null,
            }});
          } else if (!hasContent && existingA) {
            // Remove empty
            await invoke({ action: 'delete', entity_type: 'play_assignment', entity_id: existingA.id });
          }
        }
        // Clean up assignments for positions no longer in format
        for (const a of existingList) {
          if (!positions.includes(a.position)) {
            await invoke({ action: 'delete', entity_type: 'play_assignment', entity_id: a.id });
          }
        }
      } else {
        // New play — just create
        for (const pos of positions) {
          const a = assignmentsToUse[pos];
          if (!a || (!a.route?.trim() && !a.assignment_text?.trim())) continue;
          await invoke({ action: 'create', entity_type: 'play_assignment', data: {
            play_id: playId,
            position: pos,
            route: a.route?.trim() || null,
            assignment_text: a.assignment_text?.trim() || null,
          }});
        }
      }

      queryClient.invalidateQueries({ queryKey: ['plays', teamId] });
      queryClient.invalidateQueries({ queryKey: ['renderer-play-assignments'] });
      toast.success(editPlay ? 'Play updated' : 'Play created');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => toast.error(err?.message || 'Failed to save play'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      toast.error('Enter a play name');
      return;
    }
    createPlay.mutate({ form, assignments });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`bg-card border-border max-h-[90vh] overflow-y-auto ${mode === 'visual' ? 'max-w-3xl w-[95vw]' : 'max-w-lg'}`}>
        <DialogHeader>
          <DialogTitle className="text-foreground">{editPlay ? 'Edit play' : 'New play'}</DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2 p-1 bg-secondary rounded-xl">
          <button
            type="button"
            onClick={() => handleModeSwitch('visual')}
            className={`flex-1 py-2.5 text-center font-medium rounded-lg transition-colors min-h-[44px] text-sm ${
              mode === 'visual' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground bg-transparent hover:bg-surface'
            }`}
          >
            Visual Builder
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('photo')}
            className={`flex-1 py-2.5 text-center font-medium rounded-lg transition-colors min-h-[44px] text-sm ${
              mode === 'photo' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground bg-transparent hover:bg-surface'
            }`}
          >
            Upload Photo
          </button>
        </div>

        {mode === 'visual' ? (
          editDataReady ? (
            <PlayBuilder
              key={editPlay?.id || 'new'}
              team={{ id: teamId }}
              initialPlay={editPlay}
              initialAssignments={assignmentsFromEdit}
              currentUserId={createdBy}
              initialStatus={editPlay ? (editPlay.status || 'active') : initialStatus}
              createdByName={createdByName}
              defaultSide={editPlay?.side || form.side || defaultSide}
              onSave={() => {
                queryClient.invalidateQueries({ queryKey: ['plays', teamId] });
                onOpenChange(false);
                onSuccess?.();
              }}
              onCancel={() => onOpenChange(false)}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          )
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {SIDES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  if (form.side === s.value) return;
                  const defaultFormation = s.value === 'defense' ? 'Man-to-Man' : 'Spread';
                  setForm((f) => ({ ...f, side: s.value, formation: defaultFormation, formation_custom: '' }));
                  // Reset assignments for new side's positions
                  const newPositions = getPositions(s.value);
                  setAssignments(Object.fromEntries(newPositions.map((p) => [p, { route: '', assignment_text: '' }])));
                }}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  form.side === s.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-surface'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div>
            <Label className="text-muted-foreground">Play name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full bg-secondary border-border text-foreground mt-1 min-h-[44px]"
              placeholder="e.g. Spread Slant-Flat"
              required
            />
          </div>
          <div>
            <Label className="text-muted-foreground">Nickname (optional)</Label>
            <Input
              value={form.nickname}
              onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
              className="w-full bg-secondary border-border text-foreground mt-1 min-h-[44px]"
              placeholder="Player nickname for this play"
            />
          </div>

          <div>
            <Label className="text-muted-foreground">Formation</Label>
            <select
              value={form.formation}
              onChange={(e) => setForm((f) => ({ ...f, formation: e.target.value }))}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground mt-1 min-h-[44px]"
            >
              {(form.side === 'defense' ? DEFENSE_FORMATION_OPTIONS : FORMATION_OPTIONS).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            {form.formation === 'Custom' && (
              <Input
                value={form.formation_custom}
                onChange={(e) => setForm((f) => ({ ...f, formation_custom: e.target.value }))}
                className="w-full bg-secondary border-border text-foreground mt-2 min-h-[44px]"
                placeholder="Custom formation name"
              />
            )}
          </div>

          <div>
            <Label className="text-muted-foreground">Diagram</Label>
            <div className="mt-1 border border-border rounded-lg p-4 border-dashed bg-secondary/50">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="play-diagram-upload"
              />
              <label htmlFor="play-diagram-upload" className="flex flex-col items-center gap-2 cursor-pointer">
                {form.diagram_image ? (
                  <>
                    <img src={form.diagram_image} alt="Diagram" className="max-h-32 rounded object-contain" />
                    <span className="text-xs text-muted-foreground">Tap to change</span>
                  </>
                ) : (
                  <>
                    {uploading ? <Loader2 className="h-8 w-8 text-primary animate-spin" /> : <Upload className="h-8 w-8 text-muted-foreground/70" />}
                    <span className="text-sm text-muted-foreground">Upload play diagram</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground">Mirrorable (left/right)</Label>
            <button
              type="button"
              role="switch"
              onClick={() => setForm((f) => ({ ...f, is_mirrorable: !f.is_mirrorable }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.is_mirrorable ? 'bg-primary' : 'bg-surface'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-slate-100 transition-transform ${form.is_mirrorable ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div>
            <Label className="text-muted-foreground">Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => toggleTag(t.value)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    form.tag_list.includes(t.value)
                      ? 'bg-primary/20 text-primary border border-primary/50'
                      : 'bg-secondary text-muted-foreground border border-border hover:border-border'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {initialStatus !== 'experimental' && (
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground">Game day</Label>
              <button
                type="button"
                role="switch"
                onClick={() => setForm((f) => ({ ...f, game_day: !f.game_day }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.game_day ? 'bg-primary' : 'bg-surface'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-slate-100 transition-transform ${form.game_day ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          )}

          {initialStatus !== 'experimental' && (
            <div>
              <Label className="text-muted-foreground">Coach notes (coaches only)</Label>
              <Textarea
                value={form.coach_notes}
                onChange={(e) => setForm((f) => ({ ...f, coach_notes: e.target.value }))}
                className="w-full bg-secondary border-border text-foreground mt-1 min-h-[88px]"
                placeholder="Strategy notes — only visible to coaches"
              />
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Position assignments</h4>
            <div className="space-y-3">
              {positions.map((pos) => (
                <div key={pos} className="bg-secondary/50 rounded-lg p-3 border border-border">
                  <span className="text-primary font-bold text-sm">{pos}</span>
                  <div className="mt-2 grid gap-2">
                    <select
                      value={assignments[pos]?.route ?? ''}
                      onChange={(e) => setAssignments((a) => ({ ...a, [pos]: { ...a[pos], route: e.target.value } }))}
                      className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-foreground text-sm min-h-[40px]"
                    >
                      <option value="">{form.side === 'defense' ? '— Assignment —' : '— Route —'}</option>
                      {(form.side === 'defense' ? PHOTO_MODE_DEFENSE_ROUTES : PHOTO_MODE_ROUTES).map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <textarea
                      value={assignments[pos]?.assignment_text ?? ''}
                      onChange={(e) => setAssignments((a) => ({ ...a, [pos]: { ...a[pos], assignment_text: e.target.value } }))}
                      className="w-full bg-secondary border border-border rounded px-2 py-1.5 text-foreground text-sm placeholder-muted-foreground/70 min-h-[60px]"
                      placeholder="What does this player do?"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="border-border text-foreground-soft hover:bg-transparent" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium" disabled={createPlay.isPending}>
              {createPlay.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editPlay ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>

      {/* Photo mode edit protection */}
      <ConfirmDialog
        open={photoModeConfirm}
        onOpenChange={(open) => { if (!open) setPhotoModeConfirm(false); }}
        title="Switch to photo mode?"
        description="This play was built with the Visual Builder. Switching to photo mode will replace the rendered diagram with an uploaded image. Visual routes and positions will be lost."
        confirmLabel="Switch to Photo"
        destructive
        onConfirm={() => {
          setMode('photo');
          setPhotoModeConfirm(false);
        }}
      />
    </Dialog>
  );
}
