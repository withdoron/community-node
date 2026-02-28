import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Copy, RefreshCw, Archive, Loader2 } from 'lucide-react';
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

export default function TeamSettings({ team, members = [], isCoach, onArchived }) {
  const queryClient = useQueryClient();
  const [archiveOpen, setArchiveOpen] = useState(false);
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
      queryClient.invalidateQueries({ queryKey: ['ownedTeams', team?.owner_id] });
      queryClient.invalidateQueries({ queryKey: ['team', team?.id] });
      toast.success('Team updated');
    },
    onError: (err) => toast.error(err?.message || 'Update failed'),
  });

  const regenerateCode = useMutation({
    mutationFn: () => base44.entities.Team.update(team.id, { invite_code: generateInviteCode() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', team?.id] });
      toast.success('Invite code regenerated');
    },
    onError: (err) => toast.error(err?.message || 'Failed'),
  });

  const archiveTeam = useMutation({
    mutationFn: () => base44.entities.Team.update(team.id, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownedTeams'] });
      setArchiveOpen(false);
      onArchived?.();
    },
    onError: (err) => toast.error(err?.message || 'Failed'),
  });

  const coaches = members.filter((m) => m.role === 'coach' || m.role === 'assistant_coach');
  const shareLink = team?.invite_code ? `locallane.app/join/${team.invite_code}` : '';

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateTeam.mutate(profile);
  };

  return (
    <div className="space-y-8">
      {isCoach && (
        <>
          <section>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-slate-400" />
              Team profile
            </h2>
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
              <div>
                <Label className="text-slate-400">Team name</Label>
                <Input
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
                  required
                />
              </div>
              <div>
                <Label className="text-slate-400">Sport</Label>
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
                <Label className="text-slate-400">Format</Label>
                <Input
                  value={profile.format}
                  onChange={(e) => setProfile((p) => ({ ...p, format: e.target.value }))}
                  className="w-full bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
                />
              </div>
              <div>
                <Label className="text-slate-400">League</Label>
                <Input
                  value={profile.league}
                  onChange={(e) => setProfile((p) => ({ ...p, league: e.target.value }))}
                  className="w-full bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
                />
              </div>
              <div>
                <Label className="text-slate-400">Season</Label>
                <Input
                  value={profile.season}
                  onChange={(e) => setProfile((p) => ({ ...p, season: e.target.value }))}
                  className="w-full bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[44px]"
                />
              </div>
              <div>
                <Label className="text-slate-400">Description</Label>
                <Textarea
                  value={profile.description}
                  onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1 min-h-[88px]"
                  placeholder="Optional"
                />
              </div>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px]" disabled={updateTeam.isPending}>
                {updateTeam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </form>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Invite</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 max-w-md">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Invite code</p>
                <p className="text-lg font-mono font-bold text-amber-500">{team?.invite_code ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Share link</p>
                <p className="text-slate-300 break-all text-sm mb-2">{shareLink || '—'}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 min-h-[44px] mr-2"
                  onClick={() => shareLink && navigator.clipboard.writeText(shareLink) && toast.success('Copied')}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy link
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 min-h-[44px]"
                  onClick={() => regenerateCode.mutate()}
                  disabled={regenerateCode.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${regenerateCode.isPending ? 'animate-spin' : ''}`} />
                  Regenerate code
                </Button>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-4">Coaches</h2>
            <ul className="space-y-2">
              {coaches.length === 0 ? (
                <li className="text-slate-500 text-sm">No coaches listed.</li>
              ) : (
                coaches.map((m) => (
                  <li key={m.id} className="text-slate-300">
                    {m.jersey_name} — {m.role === 'coach' ? 'Head Coach' : 'Assistant Coach'}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="border-t border-slate-800 pt-8">
            <h2 className="text-lg font-semibold text-white mb-2">Danger zone</h2>
            <p className="text-sm text-slate-400 mb-4">Archive this team to hide it from your dashboard. You can still view it later.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 min-h-[44px]"
              onClick={() => setArchiveOpen(true)}
              disabled={archiveTeam.isPending}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive team
            </Button>
          </section>
        </>
      )}

      {!isCoach && (
        <div className="text-slate-400">
          <p>Only the head coach can edit team settings.</p>
          {team?.invite_code && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Invite code</p>
              <p className="font-mono text-amber-500">{team.invite_code}</p>
              <p className="text-sm text-slate-500 mt-1">{shareLink}</p>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Archive team?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              The team will be hidden from your dashboard. You can restore it later from settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveTeam.mutate()}
              className="bg-red-600 hover:bg-red-500 text-white"
              disabled={archiveTeam.isPending}
            >
              {archiveTeam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
