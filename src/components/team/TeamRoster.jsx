import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const ROLES = [
  { value: 'coach', label: 'Coach' },
  { value: 'assistant_coach', label: 'Assistant Coach' },
  { value: 'player', label: 'Player' },
  { value: 'parent', label: 'Parent' },
];

const POSITIONS = [
  { value: 'C', label: 'C' },
  { value: 'QB', label: 'QB' },
  { value: 'RB', label: 'RB' },
  { value: 'X', label: 'X' },
  { value: 'Z', label: 'Z' },
];

const ROLE_ORDER = ['coach', 'assistant_coach', 'player', 'parent'];

function roleBadgeClass(role) {
  if (role === 'coach') return 'bg-amber-500 text-black text-xs font-semibold px-2 py-0.5 rounded';
  if (role === 'assistant_coach') return 'border border-amber-500 text-amber-500 text-xs px-2 py-0.5 rounded';
  if (role === 'player') return 'bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded';
  return 'border border-slate-600 text-slate-400 text-xs px-2 py-0.5 rounded';
}

function roleLabel(role) {
  const r = ROLES.find((x) => x.value === role);
  return r?.label ?? role;
}

export default function TeamRoster({ team, members = [], isCoach }) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    jersey_name: '',
    role: 'player',
    position: '',
    jersey_number: '',
    linked_player_id: '',
  });

  const sortedMembers = [...members].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
  );

  const addMember = useMutation({
    mutationFn: async (data) => {
      const payload = {
        team_id: team.id,
        role: data.role,
        jersey_name: data.jersey_name.trim(),
        status: 'active',
      };
      if (data.jersey_number?.trim()) payload.jersey_number = data.jersey_number.trim();
      if (data.role === 'player' && data.position) payload.position = data.position;
      if (data.role === 'parent' && data.linked_player_id) payload.linked_player_id = data.linked_player_id;
      return base44.entities.TeamMember.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', team?.id] });
      setAddOpen(false);
      setForm({ jersey_name: '', role: 'player', position: '', jersey_number: '', linked_player_id: '' });
      toast.success('Added to roster');
    },
    onError: (err) => toast.error(err?.message || 'Failed to add'),
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.jersey_name?.trim()) {
      toast.error('Enter a name');
      return;
    }
    addMember.mutate(form);
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
            onClick={() => setAddOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Player
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
            </tr>
          </thead>
          <tbody>
            {sortedMembers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
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
                      <span className={roleBadgeClass(m.role)}>{roleLabel(m.role)}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Add to roster</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
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
                {ROLES.filter((r) => r.value !== 'coach').map((r) => (
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
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
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
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px]" disabled={addMember.isPending}>
                {addMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
