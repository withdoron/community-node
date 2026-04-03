import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Pencil, Trash2, Loader2, Copy, ArrowUpCircle, Heart } from 'lucide-react';
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
import PlayerCard from './PlayerCard';

const ROLES = [
  { value: 'coach', label: 'Coach' },
  { value: 'player', label: 'Player' },
  { value: 'parent', label: 'Parent' },
];

const ROLE_ORDER = ['coach', 'player', 'parent'];

function roleBadgeClass(role) {
  // Backward compat: treat existing 'assistant_coach' records as 'coach'
  if (role === 'coach' || role === 'assistant_coach') return 'bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded';
  if (role === 'player') return 'bg-surface text-foreground-soft text-xs px-2 py-0.5 rounded';
  return 'border border-border text-muted-foreground text-xs px-2 py-0.5 rounded';
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

export default function TeamRoster({ team, members = [], isCoach, currentUserId }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null); // null = add, object = edit
  const [deleteConfirmMember, setDeleteConfirmMember] = useState(null);
  const [promoteConfirmMember, setPromoteConfirmMember] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [cardMember, setCardMember] = useState(null);

  const positions = getPositionsForFormat(team?.format || DEFAULT_FORMAT);

  // Fetch PlayerStats for all team members (for player cards)
  const { data: allPlayerStats = [] } = useQuery({
    queryKey: ['team-player-stats', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const list = await base44.entities.PlayerStats.filter({ team_id: team.id });
      return Array.isArray(list) ? list : [];
    },
    enabled: !!team?.id,
    staleTime: 5 * 60 * 1000,
  });
  const statsByUserId = useMemo(() => {
    const map = {};
    allPlayerStats.forEach((s) => { if (s.user_id) map[s.user_id] = s; });
    return map;
  }, [allPlayerStats]);

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

  const deleteMember = useMutation({
    mutationFn: (member) => base44.entities.TeamMember.delete(member.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', team?.id] });
      setDeleteConfirmMember(null);
      toast.success('Removed from roster');
    },
    onError: (err) => toast.error(err?.message || 'Failed to remove'),
  });

  const promoteMember = useMutation({
    mutationFn: async (member) => {
      await base44.entities.TeamMember.update(member.id, { role: 'coach' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', team?.id] });
      setPromoteConfirmMember(null);
      toast.success('Promoted to coach!');
    },
    onError: (err) => toast.error(err?.message || 'Failed to promote'),
  });

  const toggleParentLink = useMutation({
    mutationFn: async ({ member, isLinked }) => {
      const current = Array.isArray(member.parent_user_ids)
        ? [...member.parent_user_ids]
        : member.parent_user_id ? [member.parent_user_id] : [];
      const updated = isLinked
        ? current.filter((id) => id !== currentUserId)
        : [...current, currentUserId];
      return base44.entities.TeamMember.update(member.id, {
        parent_user_ids: updated,
      });
    },
    onSuccess: (_, { isLinked }) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', team?.id] });
      toast.success(isLinked ? 'Unlinked as parent' : 'Linked as your child');
    },
    onError: (err) => toast.error(err?.message || 'Failed to update'),
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent min-h-[44px]"
              onClick={() => {
                const code = team?.invite_code;
                if (code) {
                  navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
                  toast.success('Family link copied');
                }
              }}
              disabled={!team?.invite_code}
            >
              <Copy className="h-4 w-4 mr-2" />
              Family Link
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent min-h-[44px]"
              onClick={() => {
                const code = team?.coach_invite_code;
                if (code) {
                  navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
                  toast.success('Coach link copied');
                }
              }}
              disabled={!team?.coach_invite_code}
            >
              <Copy className="h-4 w-4 mr-2" />
              Coach Link
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent min-h-[44px]"
              onClick={() => {
                const name = team?.name;
                if (name) {
                  const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                  navigator.clipboard.writeText(`${window.location.origin}/door/${slug}`);
                  toast.success('Door link copied — great for stickers & flyers');
                }
              }}
              disabled={!team?.name}
            >
              <Copy className="h-4 w-4 mr-2" />
              Door Link
            </Button>
          </div>
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium px-4 py-2 rounded-lg min-h-[44px] transition-colors"
            onClick={openAdd}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add to Roster
          </Button>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
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
                <td colSpan={isCoach ? 5 : 4} className="px-4 py-8 text-center text-muted-foreground/70">
                  No one on the roster yet. {isCoach && 'Add players or coaches above.'}
                </td>
              </tr>
            ) : (
              sortedMembers.map((m) => {
                const linkedPlayer = getLinkedPlayer(m);
                const linkedParents = getLinkedParents(m);
                const isUnclaimedPlayer = !m.user_id;
                const parentIds = Array.isArray(m.parent_user_ids) ? m.parent_user_ids : m.parent_user_id ? [m.parent_user_id] : [];
                const isMyChild = m.role === 'player' && parentIds.includes(currentUserId);
                return (
                  <tr
                    key={m.id}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => m.role === 'player' && setCardMember(m)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{m.jersey_name || '—'}</div>
                      {isUnclaimedPlayer && (
                        <span className="inline-block mt-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Pending</span>
                      )}
                      {m.role === 'parent' && linkedPlayer && (
                        <span className="inline-block mt-1 text-xs text-muted-foreground">Linked: {linkedPlayer.jersey_name || '—'}</span>
                      )}
                      {m.role === 'player' && linkedParents.length > 0 && (
                        <span className="inline-block mt-1 text-xs text-muted-foreground">Parent: {linkedParents.map((p) => p.jersey_name).filter(Boolean).join(', ') || '—'}</span>
                      )}
                      {isMyChild && (
                        <span className="inline-block mt-1 text-xs text-primary">Your child</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.jersey_number || '—'}</td>
                    <td className="px-4 py-3">
                      {m.position ? <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{m.position}</span> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={roleBadgeClass(m.role)}>{roleLabel(m.role)}</span>
                      </div>
                    </td>
                    {isCoach && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {m.role === 'player' && (
                            <button
                              type="button"
                              onClick={() => toggleParentLink.mutate({ member: m, isLinked: isMyChild })}
                              className={`p-1.5 transition-colors ${isMyChild ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                              aria-label={isMyChild ? `Unlink ${m.jersey_name} as your child` : `Link ${m.jersey_name} as your child`}
                              title={isMyChild ? 'Your child — click to unlink' : 'Mark as my child'}
                            >
                              <Heart className={`h-4 w-4 ${isMyChild ? 'fill-primary' : ''}`} />
                            </button>
                          )}
                          {m.role === 'parent' && (
                            <button
                              type="button"
                              onClick={() => setPromoteConfirmMember(m)}
                              className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                              aria-label={`Promote ${m.jersey_name} to coach`}
                              title="Promote to coach"
                            >
                              <ArrowUpCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEdit(m)}
                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                            aria-label={`Edit ${m.jersey_name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmMember(m)}
                            className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
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
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingMember ? 'Edit member' : 'Add to roster'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Name *</Label>
              <Input
                value={form.jersey_name}
                onChange={(e) => setForm((f) => ({ ...f, jersey_name: e.target.value }))}
                className="w-full bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring mt-1 min-h-[44px]"
                placeholder="Display name"
                required
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Role</Label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-ring mt-1 min-h-[44px]"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            {form.role === 'player' && (
              <div>
                <Label className="text-muted-foreground">Position</Label>
                <select
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-ring mt-1 min-h-[44px]"
                >
                  <option value="">—</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>{p.id}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Jersey number (optional)</Label>
              <Input
                value={form.jersey_number}
                onChange={(e) => setForm((f) => ({ ...f, jersey_number: e.target.value }))}
                className="w-full bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring mt-1 min-h-[44px]"
                placeholder="e.g. 12"
              />
            </div>
            {form.role === 'parent' && players.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Link to player (optional)</Label>
                <select
                  value={form.linked_player_id}
                  onChange={(e) => setForm((f) => ({ ...f, linked_player_id: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-ring mt-1 min-h-[44px]"
                >
                  <option value="">—</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.jersey_name} {p.jersey_number ? `#${p.jersey_number}` : ''}</option>
                  ))}
                </select>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" className="border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium min-h-[44px]" disabled={saveMember.isPending}>
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

      {/* Promote to coach confirmation */}
      <ConfirmDialog
        open={!!promoteConfirmMember}
        onOpenChange={(open) => { if (!open) setPromoteConfirmMember(null); }}
        title="Promote to coach?"
        description={`Promote ${promoteConfirmMember?.jersey_name || 'this parent'} to coach? They will get full access to the playbook, roster, and settings.`}
        confirmLabel="Promote"
        loading={promoteMember.isPending}
        onConfirm={() => promoteMember.mutate(promoteConfirmMember)}
      />

      {/* Player card modal */}
      <PlayerCard
        open={!!cardMember}
        onOpenChange={(open) => { if (!open) setCardMember(null); }}
        member={cardMember}
        stats={cardMember ? statsByUserId[cardMember.user_id] || null : null}
      />
    </div>
  );
}
