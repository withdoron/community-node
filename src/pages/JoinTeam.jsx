import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';

const PENDING_INVITE_KEY = 'pendingTeamInvite';

export default function JoinTeam() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, navigateToLogin } = useAuth();
  const [joinPath, setJoinPath] = useState(null); // 'player' | 'parent'
  const [claimingId, setClaimingId] = useState(null);
  const [parentSelectedIds, setParentSelectedIds] = useState(new Set()); // child TeamMember ids
  const [parentLinking, setParentLinking] = useState(false);

  // Persist invite code for redirect after auth
  useEffect(() => {
    if (inviteCode) {
      try {
        localStorage.setItem(PENDING_INVITE_KEY, inviteCode);
      } catch (_) {}
    }
  }, [inviteCode]);

  const { data: team, isLoading: teamLoading, error: teamError } = useQuery({
    queryKey: ['join-team', inviteCode],
    queryFn: async () => {
      if (!inviteCode?.trim()) return null;
      const result = await base44.entities.Team.filter({ invite_code: inviteCode.trim(), status: 'active' });
      const list = Array.isArray(result) ? result : (result ? [result] : []);
      return list[0] || null;
    },
    enabled: !!inviteCode?.trim(),
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['join-team-members', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const result = await base44.entities.TeamMember.filter({ team_id: team.id, status: 'active' });
      return Array.isArray(result) ? result : (result ? [result] : []);
    },
    enabled: !!team?.id,
  });

  const unclaimedPlayers = members.filter((m) => m.role === 'player' && !m.user_id);
  const claimedPlayers = members.filter((m) => m.role === 'player' && m.user_id);
  const isAlreadyMember = isAuthenticated && user?.id && members.some((m) => m.user_id === user.id);

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

  const handleClaimPlayer = async (memberId) => {
    if (!user?.id) return;
    setClaimingId(memberId);
    try {
      await base44.entities.TeamMember.update(memberId, { user_id: user.id });
      toast.success("You're on the roster!");
      navigate(createPageUrl('BusinessDashboard') + '?team=' + team.id, { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Failed to claim');
      setClaimingId(null);
    }
  };

  const toggleParentChild = (memberId) => {
    setParentSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const handleLinkChildren = async () => {
    if (!user?.id || !team?.id || parentSelectedIds.size === 0) return;
    setParentLinking(true);
    const displayName = user?.data?.display_name || user?.data?.full_name || user?.email || 'Parent';
    try {
      for (const linkedPlayerMemberId of parentSelectedIds) {
        await base44.entities.TeamMember.create({
          team_id: team.id,
          user_id: user.id,
          role: 'parent',
          jersey_name: displayName,
          status: 'active',
          linked_player_id: linkedPlayerMemberId,
        });
      }
      toast.success(parentSelectedIds.size === 1 ? "You've joined as a parent." : `Linked ${parentSelectedIds.size} children.`);
      navigate(createPageUrl('BusinessDashboard') + '?team=' + team.id, { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Failed to link');
      setParentLinking(false);
    }
  };

  if (teamLoading || !inviteCode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

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

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col p-6 max-w-md mx-auto">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
          <h1 className="text-xl font-bold text-white">{team.name}</h1>
          <p className="text-slate-400 text-sm">
            {team.sport === 'flag_football' ? 'Flag Football' : team.sport || 'Team'} · {team.format || ''}
          </p>
          <p className="text-slate-300 text-sm">Sign in to join this team and claim your spot on the roster.</p>
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

  if (membersLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (joinPath === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col p-6 max-w-md mx-auto">
        <h1 className="text-xl font-bold text-white mb-1">{team.name}</h1>
        <p className="text-slate-400 text-sm mb-6">
          {team.sport === 'flag_football' ? 'Flag Football' : team.sport || 'Team'} · {team.format || ''}
        </p>
        <p className="text-slate-300 mb-4">How are you joining?</p>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setJoinPath('player')}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-left transition-colors min-h-[56px]"
          >
            <Users className="h-6 w-6 text-amber-500" />
            <span className="font-medium text-white">I'm a player</span>
            <span className="text-slate-400 text-sm ml-auto">Claim my roster spot</span>
          </button>
          <button
            type="button"
            onClick={() => setJoinPath('parent')}
            className="w-full flex items-center gap-3 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-left transition-colors min-h-[56px]"
          >
            <UserPlus className="h-6 w-6 text-amber-500" />
            <span className="font-medium text-white">I'm a parent</span>
            <span className="text-slate-400 text-sm ml-auto">Link to my child</span>
          </button>
        </div>
      </div>
    );
  }

  if (joinPath === 'player') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col p-6 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setJoinPath(null)}
          className="text-slate-400 hover:text-amber-500 text-sm mb-4 self-start"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold text-white mb-1">Claim your spot</h1>
        <p className="text-slate-400 text-sm mb-6">Select your name if it's already on the roster.</p>
        {unclaimedPlayers.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
            <p className="text-slate-400">No unclaimed roster spots. Ask your coach to add you.</p>
            <Button
              onClick={() => navigate(createPageUrl('BusinessDashboard') + '?team=' + team.id)}
              className="mt-4 bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px]"
            >
              Go to team
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {unclaimedPlayers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleClaimPlayer(m.id)}
                disabled={claimingId !== null}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-500/50 transition-colors min-h-[56px] disabled:opacity-60"
              >
                <span className="font-medium text-white">{m.jersey_name || 'Unnamed'}</span>
                {m.jersey_number && <span className="text-slate-400">#{m.jersey_number}</span>}
                {m.position && <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{m.position}</span>}
                {claimingId === m.id ? (
                  <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                ) : (
                  <span className="text-amber-500 text-sm font-medium">I'm this player</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (joinPath === 'parent') {
    const players = [...claimedPlayers, ...unclaimedPlayers];
    const selectedCount = parentSelectedIds.size;
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col p-6 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setJoinPath(null)}
          className="text-slate-400 hover:text-amber-500 text-sm mb-4 self-start"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold text-white mb-1">Link your children</h1>
        <p className="text-slate-400 text-sm mb-6">Select each child on this team. You can switch to their view in the team later.</p>
        {players.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
            <p className="text-slate-400">No players on the roster yet.</p>
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
                    onClick={() => !parentLinking && toggleParentChild(m.id)}
                    disabled={parentLinking}
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
              onClick={handleLinkChildren}
              disabled={selectedCount === 0 || parentLinking}
              className="mt-6 w-full bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px]"
            >
              {parentLinking ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : `Link ${selectedCount === 0 ? 'children' : selectedCount === 1 ? 'child' : 'children'}`}
            </Button>
          </>
        )}
      </div>
    );
  }

  return null;
}
