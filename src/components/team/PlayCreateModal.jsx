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

const SIDES = [{ value: 'offense', label: 'Offense' }, { value: 'defense', label: 'Defense' }];

const FORMATIONS = [
  'Spread',
  'Trips',
  'Twins',
  'Bunch/Stack',
  'Custom',
];

const ROUTES = [
  'Fly', 'Slant', 'Out', 'In', 'Curl', 'Post', 'Corner', 'Flat', 'Fade',
  'Block', 'Snap', 'Handoff',
  'Man Coverage', 'Zone Coverage', 'Spy', 'Blitz',
  'Custom',
];

const TAG_OPTIONS = [
  { value: 'red_zone', label: 'Red Zone' },
  { value: 'goal_line', label: 'Goal Line' },
  { value: '3rd_down', label: '3rd Down' },
  { value: 'trick_play', label: 'Trick Play' },
  { value: 'screen', label: 'Screen' },
  { value: 'blitz', label: 'Blitz' },
];

const POSITIONS = ['C', 'QB', 'RB', 'X', 'Z'];

const initialAssignments = () => Object.fromEntries(POSITIONS.map((p) => [p, { route: '', assignment_text: '' }]));

export default function PlayCreateModal({
  open,
  onOpenChange,
  teamId,
  createdBy,
  defaultSide = 'offense',
  editPlay = null,
  editAssignments = [],
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: editAssignmentsFetched = [] } = useQuery({
    queryKey: ['play-assignments-edit', editPlay?.id],
    queryFn: async () => {
      if (!editPlay?.id) return [];
      const list = await base44.entities.PlayAssignment.filter({ play_id: editPlay.id });
      return Array.isArray(list) ? list : [];
    },
    enabled: !!editPlay?.id && open,
  });

  const assignmentsFromEdit = editPlay ? editAssignmentsFetched : editAssignments;

  const [form, setForm] = useState({
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
  const [assignments, setAssignments] = useState(initialAssignments());

  useEffect(() => {
    if (!open) return;
    if (editPlay && Array.isArray(editAssignmentsFetched)) {
      const map = initialAssignments();
      editAssignmentsFetched.forEach((a) => {
        if (POSITIONS.includes(a.position)) {
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
      const isCustomFormation = !FORMATIONS.slice(0, -1).includes(editPlay.formation);
      setForm({
        side: editPlay.side ?? 'offense',
        name: editPlay.name ?? '',
        nickname: editPlay.nickname ?? '',
        formation: isCustomFormation ? 'Custom' : (editPlay.formation ?? 'Spread'),
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

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  const createPlay = useMutation({
    mutationFn: async () => {
      const formation = form.formation === 'Custom' ? (form.formation_custom?.trim() || 'Custom') : form.formation;
      const payload = {
        team_id: teamId,
        side: form.side,
        name: form.name.trim(),
        formation,
        status: 'active',
        created_by: createdBy,
      };
      if (form.nickname?.trim()) payload.nickname = form.nickname.trim();
      if (form.diagram_image) payload.diagram_image = form.diagram_image;
      payload.is_mirrorable = !!form.is_mirrorable;
      if (form.tags) payload.tags = form.tags;
      payload.game_day = !!form.game_day;
      if (form.coach_notes?.trim()) payload.coach_notes = form.coach_notes.trim();
      if (editPlay?.id) {
        await base44.entities.Play.update(editPlay.id, payload);
        return { id: editPlay.id, ...payload };
      }
      return base44.entities.Play.create(payload);
    },
    onSuccess: async (play) => {
      const playId = play.id;
      if (editPlay?.id) {
        const existing = await base44.entities.PlayAssignment.filter({ play_id: playId }).then((r) => r ?? []);
        const list = Array.isArray(existing) ? existing : [];
        for (const a of list) await base44.entities.PlayAssignment.delete(a.id);
      }
      for (const pos of POSITIONS) {
        const a = assignments[pos];
        if (!a || (!a.route?.trim() && !a.assignment_text?.trim())) continue;
        await base44.entities.PlayAssignment.create({
          play_id: playId,
          position: pos,
          route: a.route?.trim() || null,
          assignment_text: a.assignment_text?.trim() || null,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['plays', teamId] });
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
    createPlay.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100">{editPlay ? 'Edit play' : 'New play'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {SIDES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, side: s.value }))}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  form.side === s.value
                    ? 'bg-amber-500 text-black'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div>
            <Label className="text-slate-400">Play name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full bg-slate-800 border-slate-700 text-white mt-1 min-h-[44px]"
              placeholder="e.g. Spread Slant-Flat"
              required
            />
          </div>
          <div>
            <Label className="text-slate-400">Nickname (optional)</Label>
            <Input
              value={form.nickname}
              onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
              className="w-full bg-slate-800 border-slate-700 text-white mt-1 min-h-[44px]"
              placeholder="Player nickname for this play"
            />
          </div>

          <div>
            <Label className="text-slate-400">Formation</Label>
            <select
              value={form.formation}
              onChange={(e) => setForm((f) => ({ ...f, formation: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white mt-1 min-h-[44px]"
            >
              {FORMATIONS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            {form.formation === 'Custom' && (
              <Input
                value={form.formation_custom}
                onChange={(e) => setForm((f) => ({ ...f, formation_custom: e.target.value }))}
                className="w-full bg-slate-800 border-slate-700 text-white mt-2 min-h-[44px]"
                placeholder="Custom formation name"
              />
            )}
          </div>

          <div>
            <Label className="text-slate-400">Diagram</Label>
            <div className="mt-1 border border-slate-700 rounded-lg p-4 border-dashed bg-slate-800/50">
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
                    <span className="text-xs text-slate-400">Tap to change</span>
                  </>
                ) : (
                  <>
                    {uploading ? <Loader2 className="h-8 w-8 text-amber-500 animate-spin" /> : <Upload className="h-8 w-8 text-slate-500" />}
                    <span className="text-sm text-slate-400">Upload play diagram</span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-slate-400">Mirrorable (left/right)</Label>
            <button
              type="button"
              role="switch"
              onClick={() => setForm((f) => ({ ...f, is_mirrorable: !f.is_mirrorable }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.is_mirrorable ? 'bg-amber-500' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.is_mirrorable ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div>
            <Label className="text-slate-400">Tags</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => toggleTag(t.value)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    form.tag_list.includes(t.value)
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-slate-400">Game day</Label>
            <button
              type="button"
              role="switch"
              onClick={() => setForm((f) => ({ ...f, game_day: !f.game_day }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.game_day ? 'bg-amber-500' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.game_day ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div>
            <Label className="text-slate-400">Coach notes (coaches only)</Label>
            <Textarea
              value={form.coach_notes}
              onChange={(e) => setForm((f) => ({ ...f, coach_notes: e.target.value }))}
              className="w-full bg-slate-800 border-slate-700 text-white mt-1 min-h-[88px]"
              placeholder="Strategy notes — only visible to coaches"
            />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Position assignments</h4>
            <div className="space-y-3">
              {POSITIONS.map((pos) => (
                <div key={pos} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                  <span className="text-amber-500 font-bold text-sm">{pos}</span>
                  <div className="mt-2 grid gap-2">
                    <select
                      value={assignments[pos]?.route ?? ''}
                      onChange={(e) => setAssignments((a) => ({ ...a, [pos]: { ...a[pos], route: e.target.value } }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm min-h-[40px]"
                    >
                      <option value="">— Route —</option>
                      {ROUTES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <textarea
                      value={assignments[pos]?.assignment_text ?? ''}
                      onChange={(e) => setAssignments((a) => ({ ...a, [pos]: { ...a[pos], assignment_text: e.target.value } }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm placeholder-slate-500 min-h-[60px]"
                      placeholder="What does this player do?"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="border-slate-600 text-slate-300" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-medium" disabled={createPlay.isPending}>
              {createPlay.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editPlay ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
