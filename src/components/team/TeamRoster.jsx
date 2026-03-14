import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Pencil, Trash2, Loader2, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { getPositionsForFormat, DEFAULT_FORMAT } from '@/config/flagFootball';

const ROLES = [
  { value: 'coach', label: 'Coach' },
  { value: 'player', label: 'Player' },
  { value: 'parent', label: 'Parent' },
];

const ROLE_ORDER = ['coach', 'player', 'parent'];

function roleBadgeClass(role) {
  // Backward compat: treat existing 'assistant_coach' records as 'coach'
  if (role === 'coach' || role === 'assistant_coach') return 'bg-amber-500 text-black text-xs font-semibold px-2 py-0.5 rounded';
  if (role === 'player') return 'bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded';
  return 'border border-slate-600 text-slate-400 text-xs px-2 py-0.5 rounded';
}

function roleLabel(role) {
  // Backward compat: treat existing 'assistant_coach' records as 'Coach'
  if (role === 'assistant_coach') return 'Coach';
  const r = ROLES.find((x) => x.value === role);
  return r?.label ?? role;
}

const emptyForm = () => ({
  jersey_name: '',
  role: 'player',
  position: '',
  jersey_number: '',
  linked_player_id: '',
});

export default function TeamRoster({ team, members = [], isCoach }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null); // null = add, object = edit
  const [deleteConfirmMember, setDeleteConfirmMember] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const positions = getPositionsForFormat(team?.format || DEFAULT_FORMAT);

  const sortedMembers = [...members].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
  );

  const saveMember = useMutation({
    mutationFn: async (data) => {
      const payload = {
        role: data.role,
        jersey_name: data.jersey_name.trim(),
      };
      if (data.jersey_number?.trim()) payload.jersey_number = data.jersey_number.trim();
      else payload.jersey_number = '';
      if (data.role === 'player' && data.position) payload.position = data.position;
      else payload.position = '';
      if (data.role === 'parent' && data.linked_player_id) payload.linked_player_id = data.linked_player_id;

      if (editingMember) {
        return base44.entities.TeamMember.update(editingMember.id, payload);
      }
      return base44.entities.TeamMember.create({ ...payload, team_id: team.id, status: 'active' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', team?.id] });
      closeModal();
      toast.success(editingMember ? 'Member updated' : 'Added to roster');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save'),
  });

  const setHeadCoach = useMutation({
    mutationFn: async (member) => {
      await base44.entities.Team.update(team.id, { head_coach_member_id: member.id });
    },
    onSuccess: () => {
      // Close modal first so user sees the refreshed roster
      closeModal();
      // Refetch team data (header badge, HC designation) and members (role badge)
      queryClient.refetchQueries({ queryKey: ['dashboard-teams'] });
      queryClient.refetchQueries({ queryKey: ['team-members', team?.id] });
      toast.success('Head coach updated');
    },
    onError: (err) => toast.error(err?.message || 'Failed to update head coach'),
  });

  const deleteMember = useMutation({
    mutationFn: (member) => base44.entities.TeamMember.delete(member.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', team?.id] });
      setDeleteConfirmMember(null);
      toast.success('Removed from roster');
    },
    onError: (err) => toast.error(err?.message || 'Failed to remove'),
  });

  const openAdd = () => {
    setEditingMember(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (member) => {
    setEditingMember(member);
    setForm({
      jersey_name: member.jersey_name || '',
      role: member.role || 'player',
      position: member.position || '',
      jersey_number: member.jersey_number || '',
      linked_player_id: member.linked_player_id || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setEditingMember(null);
    setForm(emptyForm());
    setModalOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.jersey_name?.trim()) {
      toast.error('Enter a name');
      return;
    }
    saveMember.mutate(form);
  };

  const players = members.filter((m) => m.role === 'player');

  const getLinkedPlayer = (member) => {
    if (member.role !== 'parent' || !member.linked_player_id) return null;
    return members.find((m) => m.id === member.linked_player_id);
  };
  const getLinkedParents = (member) => members.filter((m) => m.role === 'parent' && m.linked_player_id === member.id);

  return (
    <div className="space-y-4">
      {isCoach && (
        <div className="flex justify-end">
          <Button
            type="button"
            className="bg-amber-500 hover:bg-amber-400 text-black font-medium px-4 py-2 rounded-lg min-h-[44px] transition-colors"
            onClick={openAdd}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add to Roster
          </Button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Role</th>
              {isCoach && <th className="px-4 py-3 w-20" />}
            </tr>
          </thead>
          <tbody>
            {sortedMembers.length === 0 ? (
              <tr>
                <td colSpan={isCoach ? 5 : 4} className="px-4 py-8 text-center text-slate-500">
                  No one on the roster yet. {isCoach && 'Add players or coaches above.'}
                </td>
              </tr>
            ) : (
              sortedMembers.map((m) => {
                const linkedPlayer = getLinkedPlayer(m);
                const linkedParents = getLinkedParents(m);
                const isUnclaimedPlayer = m.role === 'player' && !m.user_id;
                return (
                  <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{m.jersey_name || '—'}</div>
                      {isUnclaimedPlayer && (
                        <span className="inline-block mt-1 text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">Pending</span>
                      )}
                      {m.role === 'parent' && linkedPlayer && (
                        <span className="inline-block mt-1 text-xs text-slate-400">Linked: {linkedPlayer.jersey_name || '—'}</span>
                      )}
                      {m.role === 'player' && linkedParents.length > 0 && (
                        <span className="inline-block mt-1 text-xs text-slate-400">Parent: {linkedParents.map((p) => p.jersey_name).filter(Boolean).join(', ') || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{m.jersey_number || '—'}</td>
                    <td className="px-4 py-3">
                      {m.position ? <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{m.position}</span> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={roleBadgeClass(m.role)}>{roleLabel(m.role)}</span>
                        {m.role === 'coach' && team?.head_coach_member_id === m.id && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-500">
                            <Shield className="h-3 w-3" /> HC
                          </span>
                        )}
                      </div>
                    </td>
                    {isCoach && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(m)}
                            className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors"
                            aria-label={`Edit ${m.jersey_name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmMember(m)}
                            className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                            aria-label={`Remove ${m.jersey_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal(); else setModalOpen(open); }}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">{editingMember ? 'Edit member' : 'Add to roster'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-slate-400">Name *</Label>
              <Input
                value={form.jersey_name}
                onChange={(e) => setForm((f) => ({ ...f, jersey_name: e.target.value }))}
                className="w-full bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
                placeholder="Display name"
                required
              />
            </div>
            <div>
              <Label className="text-slate-400">Role</Label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            {form.role === 'player' && (
              <div>
                <Label className="text-slate-400">Position</Label>
                <select
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
                >
                  <option value="">—</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>{p.id}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label className="text-slate-400">Jersey number (optional)</Label>
              <Input
                value={form.jersey_number}
                onChange={(e) => setForm((f) => ({ ...f, jersey_number: e.target.value }))}
                className="w-full bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
                placeholder="e.g. 12"
              />
            </div>
            {form.role === 'parent' && players.length > 0 && (
              <div>
                <Label className="text-slate-400">Link to player (optional)</Label>
                <select
                  value={form.linked_player_id}
                  onChange={(e) => setForm((f) => ({ ...f, linked_player_id: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
                >
                  <option value="">—</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.jersey_name} {p.jersey_number ? `#${p.jersey_number}` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Set as Head Coach — only when editing a coach-role member */}
            {editingMember && form.role === 'coach' && (
              <div className="border-t border-slate-800 pt-3">
                {team?.head_coach_member_id === editingMember.id ? (
                  <p className="flex items-center gap-1.5 text-xs text-amber-500">
                    <Shield className="h-3.5 w-3.5" />
                    This member is the designated Head Coach
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent min-h-[44px]"
                    onClick={() => setHeadCoach.mutate(editingMember)}
                    disabled={setHeadCoach.isPending}
                  >
                    {setHeadCoach.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Set as Head Coach
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px]" disabled={saveMember.isPending}>
                {saveMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingMember ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteConfirmMember}
        onOpenChange={(open) => { if (!open) setDeleteConfirmMember(null); }}
        title="Remove from roster?"
        description={`Remove ${deleteConfirmMember?.jersey_name || 'this member'} from the team? This cannot be undone.`}
        confirmLabel="Remove"
        destructive
        loading={deleteMember.isPending}
        onConfirm={() => deleteMember.mutate(deleteConfirmMember)}
      />
    </div>
  );
}
