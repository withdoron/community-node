import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Copy, RefreshCw, Archive, Loader2, UserMinus, AlertTriangle } from 'lucide-react';
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
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { FORMAT_OPTIONS } from '@/config/flagFootball';

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

  const { data: plays = [] } = useQuery({
    queryKey: ['plays', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const list = await base44.entities.Play.filter({ team_id: team.id, status: 'active' });
      return Array.isArray(list) ? list : [];
    },
    enabled: !!team?.id,
  });
  const isOwner = team?.owner_id === currentUserId;
  const isCoachedMember = (members || []).some((m) => m.user_id === currentUserId && m.role === 'coach');
  const canEditTeamInfo = isOwner || isCoachedMember;

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [regenerateConfirmOpen, setRegenerateConfirmOpen] = useState(false);
  const [regenerateCoachConfirmOpen, setRegenerateCoachConfirmOpen] = useState(false);
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
  const [transferToUserId, setTransferToUserId] = useState(null);
  const [formatChangeConfirm, setFormatChangeConfirm] = useState(null);
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
      toast.success('Family invite code regenerated. Old links will no longer work.');
    },
    onError: (err) => toast.error(err?.message || 'Failed'),
  });

  const regenerateCoachCode = useMutation({
    mutationFn: () => base44.entities.Team.update(team.id, { coach_invite_code: generateInviteCode() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-teams'] });
      queryClient.invalidateQueries({ queryKey: ['team', team?.id] });
      setRegenerateCoachConfirmOpen(false);
      toast.success('Coach invite code regenerated. Old links will no longer work.');
    },
    onError: (err) => toast.error(err?.message || 'Failed'),
  });

  // Auto-generate coach_invite_code if missing
  useEffect(() => {
    if (team?.id && canEditTeamInfo && !team.coach_invite_code) {
      const newCode = generateInviteCode();
      base44.entities.Team.update(team.id, { coach_invite_code: newCode }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-teams'] });
        queryClient.invalidateQueries({ queryKey: ['team', team?.id] });
      }).catch(() => {});
    }
  }, [team?.id, team?.coach_invite_code, canEditTeamInfo]);

  const transferOwnership = useMutation({
    mutationFn: async ({ newOwnerUserId }) => {
      const teamMembers = await base44.entities.TeamMember.filter({ team_id: team.id });
      const list = Array.isArray(teamMembers) ? teamMembers : [];
      const newOwnerMember = list.find((m) => m.user_id === newOwnerUserId);
      const currentMember = list.find((m) => m.user_id === currentUserId);
      if (!newOwnerMember || !currentMember) throw new Error('Member not found');
      await base44.entities.Team.update(team.id, { owner_id: newOwnerUserId });
      await base44.entities.TeamMember.update(newOwnerMember.id, { role: 'coach' });
      await base44.entities.TeamMember.update(currentMember.id, { role: 'coach' });
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
    (m) => m.role === 'coach' && m.user_id !== team?.owner_id
  );
  const familyCode = team?.invite_code ?? '';
  const coachCode = team?.coach_invite_code ?? '';
  const familyJoinUrl = typeof window !== 'undefined' && familyCode ? `${window.location.origin}/join/${familyCode}` : '';
  const coachJoinUrl = typeof window !== 'undefined' && coachCode ? `${window.location.origin}/join/${coachCode}` : '';
  const teamSlug = team?.name ? team.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : '';
  const doorUrl = typeof window !== 'undefined' && teamSlug ? `${window.location.origin}/door/${teamSlug}` : '';

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
              <select
                value={profile.format}
                onChange={(e) => {
                  const newFormat = e.target.value;
                  if (plays.length > 0 && newFormat !== profile.format) {
                    setFormatChangeConfirm(newFormat);
                  } else {
                    setProfile((p) => ({ ...p, format: newFormat }));
                  }
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
              >
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              {plays.length > 0 && (
                <p className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                  <AlertTriangle className="h-3 w-3 text-amber-500/70" />
                  Changing format affects position lists across existing plays.
                </p>
              )}
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
            <p><span className="text-slate-400">Format:</span> {FORMAT_OPTIONS.find((f) => f.value === team.format)?.label || team.format || '—'}</p>
            {team.league && <p><span className="text-slate-400">League:</span> {team.league}</p>}
            {team.season && <p><span className="text-slate-400">Season:</span> {team.season}</p>}
            {team.description && <p><span className="text-slate-400">Description:</span> {team.description}</p>}
          </div>
        )}
      </section>

      {/* Section 2: Invite Codes — coaches */}
      {canEditTeamInfo && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white">Invite links</h2>

          {/* Family invite */}
          <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-4 space-y-3 max-w-md">
            <div>
              <p className="text-amber-500 text-xs font-semibold uppercase tracking-wider mb-1">Family Invite</p>
              <p className="text-slate-400 text-xs mb-2">Share with parents to link their children</p>
              <p className="text-xl font-mono font-bold text-amber-500">{familyCode || '—'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-black min-h-[44px]"
                onClick={() => {
                  if (familyCode) {
                    navigator.clipboard.writeText(familyCode);
                    toast.success('Family code copied');
                  }
                }}
                disabled={!familyCode}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy Code
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent min-h-[44px]"
                onClick={() => {
                  if (familyJoinUrl) {
                    navigator.clipboard.writeText(familyJoinUrl);
                    toast.success('Family link copied');
                  }
                }}
                disabled={!familyJoinUrl}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy Link
              </Button>
              {isOwner && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent min-h-[44px]"
                  onClick={() => setRegenerateConfirmOpen(true)}
                  disabled={regenerateCode.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${regenerateCode.isPending ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              )}
            </div>
          </div>

          {/* Coach invite */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3 max-w-md">
            <div>
              <p className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1">Coach Invite</p>
              <p className="text-slate-400 text-xs mb-2">Share with coaches to join the staff</p>
              <p className="text-xl font-mono font-bold text-slate-100">{coachCode || '—'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent min-h-[44px]"
                onClick={() => {
                  if (coachCode) {
                    navigator.clipboard.writeText(coachCode);
                    toast.success('Coach code copied');
                  }
                }}
                disabled={!coachCode}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy Code
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent min-h-[44px]"
                onClick={() => {
                  if (coachJoinUrl) {
                    navigator.clipboard.writeText(coachJoinUrl);
                    toast.success('Coach link copied');
                  }
                }}
                disabled={!coachJoinUrl}
              >
                <Copy className="h-4 w-4 mr-2" /> Copy Link
              </Button>
              {isOwner && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent min-h-[44px]"
                  onClick={() => setRegenerateCoachConfirmOpen(true)}
                  disabled={regenerateCoachCode.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${regenerateCoachCode.isPending ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Door Link — human-readable URL for stickers and flyers */}
      {isCoach && doorUrl && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Door Link</h2>
          <p className="text-slate-400 text-sm mb-4">A readable URL for stickers, flyers, and QR codes. Anyone who visits joins as a parent.</p>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3 max-w-md">
            <p className="text-sm text-slate-300 break-all font-mono">{doorUrl}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent min-h-[44px]"
              onClick={() => {
                navigator.clipboard.writeText(doorUrl);
                toast.success('Door link copied — great for stickers & flyers');
              }}
            >
              <Copy className="h-4 w-4 mr-2" /> Copy Door Link
            </Button>
          </div>
        </section>
      )}

      {/* Section 3: Transfer Ownership — owner only */}
      {isOwner && (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Transfer Ownership</h2>
          <p className="text-slate-400 text-sm mb-4">Transfer ownership of this team to another coach. You will remain a coach.</p>
          {otherCoaches.length === 0 ? (
            <p className="text-slate-500 text-sm">Add another coach to the roster before transferring ownership.</p>
          ) : (
            <>
              <div className="space-y-2 max-w-md mb-4">
                <Label className="text-slate-300 text-sm font-medium">New owner</Label>
                <select
                  value={transferToUserId || ''}
                  onChange={(e) => setTransferToUserId(e.target.value || null)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">Select a coach</option>
                  {otherCoaches.map((m) => (
                    <option key={m.id} value={m.user_id}>{m.jersey_name || 'Coach'} — Coach</option>
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
          {familyCode && (
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Family invite code</p>
              <p className="font-mono text-amber-500 mb-2">{familyCode}</p>
              <p className="text-slate-500 text-sm break-all mb-2">{familyJoinUrl || '—'}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent min-h-[44px]"
                onClick={() => familyJoinUrl && navigator.clipboard.writeText(familyJoinUrl) && toast.success('Link copied')}
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
            <AlertDialogTitle className="text-slate-100">Regenerate family invite code?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              The current family invite link will stop working. Parents with the old link will no longer be able to join. Continue?
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

      <AlertDialog open={regenerateCoachConfirmOpen} onOpenChange={setRegenerateCoachConfirmOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Regenerate coach invite code?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              The current coach invite link will stop working. Coaches with the old link will no longer be able to join. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => regenerateCoachCode.mutate()} className="bg-amber-500 hover:bg-amber-400 text-black" disabled={regenerateCoachCode.isPending}>
              {regenerateCoachCode.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Regenerate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={transferConfirmOpen} onOpenChange={(open) => { setTransferConfirmOpen(open); if (!open) setTransferToUserId(null); }}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Transfer head coach?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to transfer head coach to {transferTargetName}? You will remain a coach but no longer be the owner. This cannot be undone.
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

      {/* Format change warning */}
      <ConfirmDialog
        open={!!formatChangeConfirm}
        onOpenChange={(open) => { if (!open) setFormatChangeConfirm(null); }}
        title="Change team format?"
        description={`Switching to ${formatChangeConfirm} will change the position list for all plays. Existing plays with positions not in the new format may need to be updated.`}
        confirmLabel="Change Format"
        destructive
        onConfirm={() => {
          setProfile((p) => ({ ...p, format: formatChangeConfirm }));
          setFormatChangeConfirm(null);
        }}
      />

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
