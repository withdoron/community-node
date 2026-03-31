import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';

const PENDING_INVITE_KEY = 'pendingTeamInvite';

export default function JoinTeam() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [parentSelectedIds, setParentSelectedIds] = useState(new Set());
  const [joining, setJoining] = useState(false);
  const [coachName, setCoachName] = useState('');

  // Mark onboarding complete so user doesn't loop into the wizard after joining
  const ensureOnboardingComplete = async () => {
    try {
      const me = await base44.auth.me();
      if (!me?.onboarding_complete && !me?.data?.onboarding_complete) {
        try {
          await base44.functions.invoke('updateUser', {
            action: 'update_onboarding',
            data: { onboarding_complete: true },
          });
        } catch {
          // Server function failed — try direct update
          try { await base44.entities.User.update(me.id, { onboarding_complete: true }); } catch { /* last resort fails */ }
        }
        queryClient.setQueryData(['currentUser'], (old) =>
          old ? { ...old, onboarding_complete: true } : old
        );
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      }
    } catch { /* non-critical */ }
  };

  // Persist invite code for redirect after auth
  useEffect(() => {
    if (inviteCode) {
      try {
        localStorage.setItem(PENDING_INVITE_KEY, inviteCode);
      } catch (_) {}
    }
  }, [inviteCode]);

  // Pre-fill coach name from user data
  useEffect(() => {
    if (user && !coachName) {
      const name = user?.data?.display_name || user?.data?.full_name || '';
      setCoachName(name);
    }
  }, [user, coachName]);

  // Detect invite type: family (invite_code) or coach (coach_invite_code)
  const { data: teamData, isLoading: teamLoading, error: teamError } = useQuery({
    queryKey: ['join-team', inviteCode],
    queryFn: async () => {
      if (!inviteCode?.trim()) return null;
      const code = inviteCode.trim();

      // Try family invite first
      const familyResult = await base44.entities.Team.filter({ invite_code: code, status: 'active' });
      const familyList = Array.isArray(familyResult) ? familyResult : (familyResult ? [familyResult] : []);
      if (familyList[0]) {
        return { team: familyList[0], inviteType: 'family' };
      }

      // Try coach invite
      const coachResult = await base44.entities.Team.filter({ coach_invite_code: code, status: 'active' });
      const coachList = Array.isArray(coachResult) ? coachResult : (coachResult ? [coachResult] : []);
      if (coachList[0]) {
        return { team: coachList[0], inviteType: 'coach' };
      }

      return null;
    },
    enabled: !!inviteCode?.trim(),
  });

  const team = teamData?.team;
  const inviteType = teamData?.inviteType;

  // Fetch members (needed for family path to show player list)
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['join-team-members', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const result = await base44.entities.TeamMember.filter({ team_id: team.id, status: 'active' });
      return Array.isArray(result) ? result : (result ? [result] : []);
    },
    enabled: !!team?.id && inviteType === 'family',
  });

  const isAlreadyMember = isAuthenticated && user?.id && members.some((m) => m.user_id === user.id);

  // Redirect if already a member
  useEffect(() => {
    if (!team || !isAuthenticated || !user?.id) return;
    if (isAlreadyMember) {
      navigate(createPageUrl('BusinessDashboard') + '?team=' + team.id, { replace: true });
    }
  }, [team, isAuthenticated, user?.id, isAlreadyMember, navigate]);

  const handleSignIn = () => {
    const returnUrl = `${window.location.origin}/join/${inviteCode}`;
    base44.auth.redirectToLogin(returnUrl);
  };

  const toggleParentChild = (memberId) => {
    setParentSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const handleJoinAsParent = async () => {
    if (!user?.id || !team?.id || parentSelectedIds.size === 0) return;
    setJoining(true);
    try {
      // Check for duplicate membership
      const existing = await base44.entities.TeamMember.filter({ team_id: team.id, user_id: user.id });
      const existingList = Array.isArray(existing) ? existing : [];
      if (existingList.length > 0) {
        toast.success('You are already a member of this team.');
        localStorage.removeItem(PENDING_INVITE_KEY);
        await ensureOnboardingComplete();
        navigate(createPageUrl('BusinessDashboard') + '?team=' + team.id, { replace: true });
        return;
      }

      // Create parent member record with linked player IDs
      await base44.entities.TeamMember.create({
        team_id: team.id,
        user_id: user.id,
        role: 'parent',
        status: 'active',
        linked_player_ids: [...parentSelectedIds],
      });

      toast.success(parentSelectedIds.size === 1 ? "You've joined as a parent." : `Linked ${parentSelectedIds.size} children.`);
      localStorage.removeItem(PENDING_INVITE_KEY);
      await ensureOnboardingComplete();
      navigate(createPageUrl('BusinessDashboard') + '?team=' + team.id, { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Failed to join');
      setJoining(false);
    }
  };

  const handleJoinAsCoach = async () => {
    if (!user?.id || !coachName?.trim() || !team?.id) return;
    setJoining(true);
    try {
      // Check for duplicate membership
      const existing = await base44.entities.TeamMember.filter({ team_id: team.id, user_id: user.id });
      const existingList = Array.isArray(existing) ? existing : [];
      if (existingList.length > 0) {
        toast.success('You are already a member of this team.');
        localStorage.removeItem(PENDING_INVITE_KEY);
        await ensureOnboardingComplete();
        navigate(createPageUrl('BusinessDashboard') + '?team=' + team.id, { replace: true });
        return;
      }

      // Create assistant coach member record
      await base44.entities.TeamMember.create({
        team_id: team.id,
        user_id: user.id,
        role: 'assistant_coach',
        jersey_name: coachName.trim(),
        status: 'active',
      });

      toast.success("You've joined as a coach!");
      localStorage.removeItem(PENDING_INVITE_KEY);
      await ensureOnboardingComplete();
      navigate(createPageUrl('BusinessDashboard') + '?team=' + team.id, { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Failed to join');
      setJoining(false);
    }
  };

  // ── Loading ──
  if (teamLoading || !inviteCode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  // ── Invalid code ──
  if (teamError || !team) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 max-w-md mx-auto">
        <h1 className="text-xl font-bold text-white mb-2">Invalid or expired invite</h1>
        <p className="text-slate-400 text-center mb-6">This invite code is not valid or the team may no longer be active.</p>
        <Button
          onClick={() => navigate(createPageUrl('MyLane'))}
          className="bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px] px-6"
        >
          Go to My Lane
        </Button>
      </div>
    );
  }

  // ── Not authenticated ──
  if (!isAuthenticated || !user) {
    const roleLabel = inviteType === 'coach' ? 'coach' : 'parent';
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col p-6 max-w-md mx-auto">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-white">{team.name}</h1>
          <p className="text-slate-400 text-sm">
            {team.sport === 'flag_football' ? 'Flag Football' : team.sport || 'Team'} · {team.format || ''}
          </p>
          <p className="text-slate-300 text-sm">Sign in to join this team as a {roleLabel}.</p>
          <Button
            onClick={handleSignIn}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px] flex items-center justify-center gap-2"
          >
            <LogIn className="h-5 w-5" />
            Sign in to join
          </Button>
        </div>
      </div>
    );
  }

  // ── Coach join path ──
  if (inviteType === 'coach') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col p-6 max-w-md mx-auto">
        <h1 className="text-xl font-bold text-white mb-1">{team.name}</h1>
        <p className="text-slate-400 text-sm mb-6">
          {team.sport === 'flag_football' ? 'Flag Football' : team.sport || 'Team'} · {team.format || ''}
        </p>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Join as Coach</h2>
          <p className="text-slate-400 text-sm">You'll have full access to the playbook, roster, and team settings.</p>
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1">Your name</label>
            <Input
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              className="w-full bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 min-h-[44px]"
              placeholder="Coach name"
              disabled={joining}
            />
          </div>
          <Button
            onClick={handleJoinAsCoach}
            disabled={!coachName?.trim() || joining}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px]"
          >
            {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Join Team'}
          </Button>
        </div>
      </div>
    );
  }

  // ── Family/parent join path ──
  if (membersLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const players = members.filter((m) => m.role === 'player');
  const selectedCount = parentSelectedIds.size;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-white mb-1">{team.name}</h1>
      <p className="text-slate-400 text-sm mb-6">
        {team.sport === 'flag_football' ? 'Flag Football' : team.sport || 'Team'} · {team.format || ''}
      </p>
      <h2 className="text-lg font-semibold text-white mb-1">Link your children</h2>
      <p className="text-slate-400 text-sm mb-4">Select each child on this team. You can switch to their view in the team later.</p>
      {players.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
          <p className="text-slate-400">No players on the roster yet. Ask a coach to add your child first.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {players.map((m) => {
              const checked = parentSelectedIds.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => !joining && toggleParentChild(m.id)}
                  disabled={joining}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors min-h-[56px] disabled:opacity-60 ${
                    checked ? 'bg-slate-800 border-amber-500' : 'bg-slate-800 border-slate-700 hover:border-amber-500/50'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                      checked ? 'bg-amber-500 border-amber-500' : 'bg-transparent border-amber-500'
                    }`}
                  >
                    {checked && <span className="text-black font-bold text-sm leading-none">✓</span>}
                  </div>
                  <span className="font-medium text-white flex-1">{m.jersey_name || 'Unnamed'}</span>
                  {m.jersey_number && <span className="text-slate-400">#{m.jersey_number}</span>}
                  {m.position && <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{m.position}</span>}
                  {!m.user_id && <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">Pending</span>}
                </button>
              );
            })}
          </div>
          {selectedCount > 0 && (
            <p className="text-slate-400 text-sm mt-3">
              {selectedCount} {selectedCount === 1 ? 'child' : 'children'} selected
            </p>
          )}
          <Button
            type="button"
            onClick={handleJoinAsParent}
            disabled={selectedCount === 0 || joining}
            className="mt-6 w-full bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px]"
          >
            {joining ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : `Link ${selectedCount === 0 ? 'children' : selectedCount === 1 ? 'child' : 'children'}`}
          </Button>
        </>
      )}
    </div>
  );
}
