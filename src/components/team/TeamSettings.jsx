import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Copy, RefreshCw, Archive, Loader2, UserMinus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateInviteCode() {
  let code = '';
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

const SPORTS = [
  { value: 'flag_football', label: 'Flag Football' },
  { value: 'soccer', label: 'Soccer' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'baseball', label: 'Baseball' },
  { value: 'other', label: 'Other' },
];

export default function TeamSettings({ team, members = [], isCoach, onArchived, teamId, teamScope }) {
  const queryClient = useQueryClient();
  const currentUserId = teamScope?.currentUserId;
  const isOwner = team?.owner_id === currentUserId;
  const isAssistantCoach = (members || []).some((m) => m.user_id === currentUserId && m.role === 'assistant_coach');
  const canEditTeamInfo = isOwner || isAssistantCoach;

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
  const [transferToUserId, setTransferToUserId] = useState(null);
  const [profile, setProfile] = useState({
    name: team?.name ?? '',
    sport: team?.sport ?? 'flag_football',
    format: team?.format ?? '5v5',
    league: team?.league ?? '',
    season: team?.season ?? '',
    description: team?.description ?? '',
  });

  useEffect(() => {
    if (team) {
      setProfile({
        name: team.name ?? '',
        sport: team.sport ?? 'flag_football',
        format: team.format ?? '5v5',
        league: team.league ?? '',
        season: team.season ?? '',
        description: team.description ?? '',
      });
    }
  }, [team?.id, team?.name, team?.sport, team?.format, team?.league, team?.season, team?.description]);

  const updateTeam = useMutation({
    mutationFn: (data) => base44.entities.Team.update(team.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-teams'] });
      queryClient.invalidateQueries({ queryKey: ['ownedTeams', team?.owner_id] });
      queryClient.invalidateQueries({ queryKey: ['team', team?.id] });
      toast.success('Team updated');
    },
    onError: (err) => toast.error(err?.message || 'Update failed'),
  });

  const regenerateCode = useMutation({
    mutationFn: () => base44.entities.Team.update(team.id, { invite_code: generateInviteCode() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-teams'] });
      queryClient.invalidateQueries({ queryKey: ['team', team?.id] });
      setRegenerateConfirmOpen(false);
      toast.success('Invite code regenerated. Old links will no longer work.');
    },
    onError: (err) => toast.error(err?.message || 'Failed'),
  });

  const transferOwnership = useMutation({
    mutationFn: async ({ newOwnerUserId }) => {
      const teamMembers = await base44.entities.TeamMember.filter({ team_id: team.id });
      const list = Array.isArray(teamMembers) ? teamMembers : [];
      const newOwnerMember = list.find((m) => m.user_id === newOwnerUserId);
      const currentMember = list.find((m) => m.user_id === currentUserId);
      if (!newOwnerMember || !currentMember) throw new Error('Member not found');
      await base44.entities.Team.update(team.id, { owner_id: newOwnerUserId });
      await base44.entities.TeamMember.update(newOwnerMember.id, { role: 'coach' });
      await base44.entities.TeamMember.update(currentMember.id, { role: 'assistant_coach' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-teams'] });
      queryClient.invalidateQueries({ queryKey: ['my-team-memberships'] });
      setTransferConfirmOpen(false);
      setTransferToUserId(null);
      toast.success('Head coach transferred.');
      window.location.reload();
    },
    onError: (err) => {
      toast.error(err?.message || 'Transfer failed. A server function may be required.');
    },
  });

  const archiveTeam = useMutation({
    mutationFn: () => base44.entities.Team.update(team.id, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-teams'] });
      queryClient.invalidateQueries({ queryKey: ['my-team-memberships'] });
      setArchiveOpen(false);
      onArchived?.();
    },
    onError: (err) => toast.error(err?.message || 'Failed'),
  });

  const otherCoaches = (members || []).filter(
    (m) => (m.role === 'coach' || m.role === 'assistant_coach') && m.user_id !== team?.owner_id
  );
  const inviteCode = team?.invite_code ?? '';
  const fullJoinUrl = typeof window !== 'undefined' && inviteCode ? `${window.location.origin}/join/${inviteCode}` : '';

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateTeam.mutate(profile);
  };

  const handleTransferClick = () => {
    if (transferToUserId) setTransferConfirmOpen(true);
  };

  const handleTransferConfirm = () => {
    if (transferToUserId) transferOwnership.mutate({ newOwnerUserId: transferToUserId });
  };

  const transferTargetName = otherCoaches.find((m) => m.user_id === transferToUserId)?.jersey_name || 'this coach';

  if (!team) return null;

  return (
    <div className="space-y-8">
      {/* Section 1: Team Info — editable by head coach and assistant coaches */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-slate-400" />
          Team info
        </h2>
        {canEditTeamInfo ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
            <div>
              <Label className="text-slate-300 text-sm font-medium">Team name</Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                className="w-full bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
                required
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm font-medium">Sport</Label>
              <select
                value={profile.sport}
                onChange={(e) => setProfile((p) => ({ ...p, sport: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
              >
                {SPORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-slate-300 text-sm font-medium">Format</Label>
              <Input
                value={profile.format}
                onChange={(e) => setProfile((p) => ({ ...p, format: e.target.value }))}
                className="w-full bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
                placeholder="e.g. 5v5"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm font-medium">League (optional)</Label>
              <Input
                value={profile.league}
                onChange={(e) => setProfile((p) => ({ ...p, league: e.target.value }))}
                className="w-full bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm font-medium">Season (optional)</Label>
              <Input
                value={profile.season}
                onChange={(e) => setProfile((p) => ({ ...p, season: e.target.value }))}
                className="w-full bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm font-medium">Description (optional)</Label>
              <Textarea
                value={profile.description}
                onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
                className="w-full bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[88px]"
                placeholder="Optional"
              />
            </div>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px] transition-colors" disabled={updateTeam.isPending}>
              {updateTeam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </form>
        ) : (
          <div className="space-y-2 text-slate-300 text-sm max-w-md">
            <p><span className="text-slate-400">Name:</span> {team.name}</p>
            <p><span className="text-slate-400">Sport:</span> {SPORTS.find((s) => s.value === team.sport)?.label || team.sport}</p>
            <p><span className="text-slate-400">Format:</span> {team.format || '—'}</p>
            {team.league && <p><span className="text-slate-400">League:</span> {team.league}</p>}
            {team.season && <p><span className="text-slate-400">Season:</span> {team.season}</p>}
            {team.description && <p><span className="text-slate-400">Description:</span> {team.description}</p>}
          </div>
        )}
      </section>

      {/* Section 2: Invite Code — head coach and assistant coaches */}
      {canEditTeamInfo && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Invite code</h2>
          <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-4 space-y-4 max-w-md">
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Code</p>
              <p className="text-xl font-mono font-bold text-amber-500">{inviteCode || '—'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-black min-h-[44px]"
                onClick={() => {
                  if (inviteCode) {
                    navigator.clipboard.writeText(inviteCode);
                    toast.success('Code copied');
                  }
                }}
                disabled={!inviteCode}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy Code
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 min-h-[44px]"
                onClick={() => {
                  if (fullJoinUrl) {
                    navigator.clipboard.writeText(fullJoinUrl);
                    toast.success('Link copied');
                  }
                }}
                disabled={!fullJoinUrl}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy Link
              </Button>
              {isOwner && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 min-h-[44px]"
                  onClick={() => setRegenerateConfirmOpen(true)}
                  disabled={regenerateCode.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${regenerateCode.isPending ? 'animate-spin' : ''}`} />
                  Regenerate Code
                </Button>
              )}
            </div>
            <p className="text-slate-500 text-xs">Share the code or link so players and parents can join. {isOwner && 'Regenerating invalidates the current link.'}</p>
          </div>
        </section>
      )}

      {/* Section 3: Transfer Head Coach — head coach only */}
      {isOwner && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Transfer Head Coach</h2>
          <p className="text-slate-400 text-sm mb-4">Transfer ownership of this team to another coach. You will become an assistant coach.</p>
          {otherCoaches.length === 0 ? (
            <p className="text-slate-500 text-sm">Add another coach to the roster before transferring ownership.</p>
          ) : (
            <>
              <div className="space-y-2 max-w-md mb-4">
                <Label className="text-slate-300 text-sm font-medium">New head coach</Label>
                <select
                  value={transferToUserId || ''}
                  onChange={(e) => setTransferToUserId(e.target.value || null)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">Select a coach</option>
                  {otherCoaches.map((m) => (
                    <option key={m.id} value={m.user_id}>{m.jersey_name || 'Coach'} — {m.role === 'assistant_coach' ? 'Assistant Coach' : 'Coach'}</option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 min-h-[44px] transition-colors"
                onClick={handleTransferClick}
                disabled={!transferToUserId || transferOwnership.isPending}
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Transfer Ownership
              </Button>
            </>
          )}
        </section>
      )}

      {/* Section 4: Danger Zone — head coach only */}
      {isOwner && (
        <section className="bg-slate-900 border border-red-500/30 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2">Danger zone</h2>
          <p className="text-slate-400 text-sm mb-4">Archive this team. Members will no longer be able to access it.</p>
          <Button
            type="button"
            variant="outline"
            className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 min-h-[44px] transition-colors"
            onClick={() => setArchiveOpen(true)}
            disabled={archiveTeam.isPending}
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive Team
          </Button>
        </section>
      )}

      {/* Read-only for players/parents */}
      {!canEditTeamInfo && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400">
          <p className="text-sm mb-4">Only coaches can edit team settings.</p>
          {inviteCode && (
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Invite code</p>
              <p className="font-mono text-amber-500 mb-2">{inviteCode}</p>
              <p className="text-slate-500 text-sm break-all mb-2">{fullJoinUrl || '—'}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 min-h-[44px]"
                onClick={() => fullJoinUrl && navigator.clipboard.writeText(fullJoinUrl) && toast.success('Link copied')}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy Link
              </Button>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={regenerateConfirmOpen} onOpenChange={setRegenerateConfirmOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Regenerate invite code?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              The current invite link will stop working. Anyone with the old link will no longer be able to join. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => regenerateCode.mutate()} className="bg-amber-500 hover:bg-amber-400 text-black" disabled={regenerateCode.isPending}>
              {regenerateCode.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Regenerate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={transferConfirmOpen} onOpenChange={(open) => { setTransferConfirmOpen(open); if (!open) setTransferToUserId(null); }}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Transfer head coach?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to transfer head coach to {transferTargetName}? You will become an assistant coach. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransferConfirm} className="bg-red-600 hover:bg-red-500 text-white" disabled={transferOwnership.isPending}>
              {transferOwnership.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Transfer Ownership'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Archive team?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to archive this team? Members will no longer be able to access it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveTeam.mutate()} className="bg-red-600 hover:bg-red-500 text-white" disabled={archiveTeam.isPending}>
              {archiveTeam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
