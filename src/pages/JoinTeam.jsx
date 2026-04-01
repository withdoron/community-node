import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, LogIn, Users } from 'lucide-react';
import { toast } from 'sonner';

const PENDING_INVITE_KEY = 'pendingTeamInvite';

/** Generate a URL-safe slug from text. "Grab It NFL FLAG" → "grab-it-nfl-flag" */
function slugify(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Human-readable sport name */
function formatSport(sport) {
  if (!sport) return 'Team';
  const MAP = { flag_football: 'Flag Football', basketball: 'Basketball', soccer: 'Soccer', baseball: 'Baseball' };
  return MAP[sport] || sport.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build the sport · format · season subtitle */
function teamSubtitle(team) {
  const parts = [formatSport(team?.sport)];
  if (team?.format) parts.push(team.format);
  if (team?.season) parts.push(team.season);
  return parts.join(' · ');
}

export { slugify };

export default function JoinTeam() {
  const params = useParams();
  // Two entry paths: /join/:inviteCode OR /door/:slug
  const inviteCode = params.inviteCode || null;
  const doorSlug = params.slug || null;
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [parentSelectedIds, setParentSelectedIds] = useState(new Set());
  const [joining, setJoining] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [coachName, setCoachName] = useState('');
  const [showNewCoachForm, setShowNewCoachForm] = useState(false);

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

  // Persist invite code or slug for redirect after auth
  useEffect(() => {
    if (inviteCode) {
      try { localStorage.setItem(PENDING_INVITE_KEY, inviteCode); } catch (_) {}
    } else if (doorSlug) {
      // Store slug so we can redirect back to /door/:slug after auth
      try { localStorage.setItem('pendingTeamDoorSlug', doorSlug); } catch (_) {}
    }
  }, [inviteCode, doorSlug]);

  // Pre-fill coach name from user data
  useEffect(() => {
    if (user && !coachName) {
      const name = user?.data?.display_name || user?.data?.full_name || '';
      setCoachName(name);
    }
  }, [user, coachName]);

  // Detect invite type: family (invite_code), coach (coach_invite_code), or door (slug)
  const lookupKey = inviteCode?.trim() || doorSlug?.trim() || '';
  const { data: teamData, isLoading: teamLoading, error: teamError } = useQuery({
    queryKey: ['join-team', lookupKey],
    queryFn: async () => {
      if (!lookupKey) return null;

      // Path A: invite code lookup (existing flow)
      if (inviteCode) {
        const code = inviteCode.trim();
        // Try family invite first
        const familyResult = await base44.entities.Team.filter({ invite_code: code, status: 'active' });
        const familyList = Array.isArray(familyResult) ? familyResult : (familyResult ? [familyResult] : []);
        if (familyList[0]) return { team: familyList[0], inviteType: 'family' };

        // Try coach invite
        const coachResult = await base44.entities.Team.filter({ coach_invite_code: code, status: 'active' });
        const coachList = Array.isArray(coachResult) ? coachResult : (coachResult ? [coachResult] : []);
        if (coachList[0]) return { team: coachList[0], inviteType: 'coach' };

        return null;
      }

      // Path B: slug lookup (door route)
      if (doorSlug) {
        const slug = doorSlug.trim().toLowerCase();
        // Try stored slug field first (future — when Base44 entity has slug field)
        try {
          const slugResult = await base44.entities.Team.filter({ slug, status: 'active' });
          const slugList = Array.isArray(slugResult) ? slugResult : (slugResult ? [slugResult] : []);
          if (slugList[0]) return { team: slugList[0], inviteType: 'family' };
        } catch { /* slug field may not exist yet — fall through */ }

        // Fallback: match by slugified team name (works before entity field is added)
        const allTeams = await base44.entities.Team.filter({ status: 'active' });
        const teamList = Array.isArray(allTeams) ? allTeams : (allTeams ? [allTeams] : []);
        const match = teamList.find((t) => slugify(t.name) === slug);
        if (match) return { team: match, inviteType: 'family' };

        return null;
      }

      return null;
    },
    enabled: !!lookupKey,
  });

  const team = teamData?.team;
  const inviteType = teamData?.inviteType;

  // Fetch members (needed for player list + head coach name for personalized invite copy)
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['join-team-members', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const result = await base44.entities.TeamMember.filter({ team_id: team.id, status: 'active' });
      return Array.isArray(result) ? result : (result ? [result] : []);
    },
    enabled: !!team?.id,
  });

  // Resolve head coach name from existing members data (no extra API call)
  const headCoach = members.find(
    (m) => String(m.user_id) === String(team?.owner_id) && (m.role === 'coach' || m.role === 'assistant_coach')
  );
  const headCoachName = headCoach?.jersey_name || null;
  const players = members.filter((m) => m.role === 'player');
  const playerCount = players.length;

  // Unclaimed roster spots by role — for claim-first flow
  const unclaimedCoaches = members.filter(
    (m) => !m.user_id && (m.role === 'coach' || m.role === 'assistant_coach')
  );

  const isAlreadyMember = isAuthenticated && user?.id && members.some((m) => m.user_id === user.id);

  // Claim an existing roster spot by linking user_id to the pre-seeded record
  const handleClaimSpot = async (member) => {
    if (!user?.id || !team?.id) return;
    setClaiming(true);
    try {
      // Check for duplicate membership first
      const existing = await base44.entities.TeamMember.filter({ team_id: team.id, user_id: user.id });
      const existingList = Array.isArray(existing) ? existing : [];
      if (existingList.length > 0) {
        toast.success('You are already a member of this team.');
        localStorage.removeItem(PENDING_INVITE_KEY); try { localStorage.removeItem('pendingTeamDoorSlug'); } catch {};
        await ensureOnboardingComplete();
        navigate(createPageUrl('MyLane'), { replace: true });
        return;
      }

      // Claim: update the pre-seeded record with user_id
      try {
        await base44.entities.TeamMember.update(member.id, { user_id: user.id });
      } catch {
        // Update failed (likely Creator Only permission) — create a new record with the same data
        await base44.entities.TeamMember.create({
          team_id: team.id,
          user_id: user.id,
          role: member.role,
          jersey_name: member.jersey_name,
          jersey_number: member.jersey_number || undefined,
          position: member.position || undefined,
          status: 'active',
        });
      }

      const roleLabel = member.role === 'parent' ? 'parent' : 'coach';
      toast.success(`Joined as ${member.jersey_name || roleLabel}!`);
      localStorage.removeItem(PENDING_INVITE_KEY); try { localStorage.removeItem('pendingTeamDoorSlug'); } catch {};
      try { localStorage.setItem('mylane_welcome', JSON.stringify({ space: 'team', name: team.name })); } catch {}
      await ensureOnboardingComplete();
      navigate(createPageUrl('MyLane'), { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Failed to claim spot');
      setClaiming(false);
    }
  };

  // Redirect if already a member
  useEffect(() => {
    if (!team || !isAuthenticated || !user?.id) return;
    if (isAlreadyMember) {
      navigate(createPageUrl('MyLane'), { replace: true });
    }
  }, [team, isAuthenticated, user?.id, isAlreadyMember, navigate]);

  const handleSignIn = () => {
    const returnUrl = doorSlug
      ? `${window.location.origin}/door/${doorSlug}`
      : `${window.location.origin}/join/${inviteCode}`;
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
        localStorage.removeItem(PENDING_INVITE_KEY); try { localStorage.removeItem('pendingTeamDoorSlug'); } catch {};
        await ensureOnboardingComplete();
        navigate(createPageUrl('MyLane'), { replace: true });
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
      localStorage.removeItem(PENDING_INVITE_KEY); try { localStorage.removeItem('pendingTeamDoorSlug'); } catch {};
      try { localStorage.setItem('mylane_welcome', JSON.stringify({ space: 'team', name: team.name })); } catch {}
      await ensureOnboardingComplete();
      navigate(createPageUrl('MyLane'), { replace: true });
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
        localStorage.removeItem(PENDING_INVITE_KEY); try { localStorage.removeItem('pendingTeamDoorSlug'); } catch {};
        await ensureOnboardingComplete();
        navigate(createPageUrl('MyLane'), { replace: true });
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
      localStorage.removeItem(PENDING_INVITE_KEY); try { localStorage.removeItem('pendingTeamDoorSlug'); } catch {};
      try { localStorage.setItem('mylane_welcome', JSON.stringify({ space: 'team', name: team.name })); } catch {}
      await ensureOnboardingComplete();
      navigate(createPageUrl('MyLane'), { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Failed to join');
      setJoining(false);
    }
  };

  // ── Loading ──
  if (teamLoading || (!inviteCode && !doorSlug)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  // ── Invalid code or slug ──
  if (teamError || !team) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 max-w-md mx-auto">
        <h1 className="text-xl font-bold text-white mb-2">
          {doorSlug ? 'Team not found' : 'Invalid or expired invite'}
        </h1>
        <p className="text-slate-400 text-center mb-6">
          {doorSlug
            ? `We couldn't find a team matching "${doorSlug.replace(/-/g, ' ')}." It may have been renamed or removed.`
            : 'This invite code is not valid or the team may no longer be active.'
          }
        </p>
        <Button
          onClick={() => navigate(createPageUrl('MyLane'))}
          className="bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px] px-6"
        >
          Go to My Lane
        </Button>
      </div>
    );
  }

  // ── Not authenticated — the organism's handshake ──
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 max-w-md mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5 w-full">
          {/* Team name — prominent */}
          <h1 className="text-2xl font-bold text-white text-center">{team.name}</h1>

          {/* Sport · Format · Season */}
          <p className="text-slate-400 text-sm text-center">{teamSubtitle(team)}</p>

          {/* Personalized invite copy */}
          {inviteType === 'coach' ? (
            <p className="text-slate-300 text-sm text-center">
              {headCoachName
                ? <>Coach <span className="text-white font-medium">{headCoachName}</span> invited you to coach this team</>
                : <>You've been invited to coach this team</>
              }
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-slate-300 text-sm text-center">
                {headCoachName
                  ? <>Coach <span className="text-white font-medium">{headCoachName}</span> invited you to join</>
                  : <>You've been invited to join this team</>
                }
              </p>
              {playerCount > 0 && (
                <p className="text-slate-500 text-xs text-center flex items-center justify-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {playerCount} {playerCount === 1 ? 'player' : 'players'} on the roster
                </p>
              )}
            </div>
          )}

          {/* Sign in CTA */}
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

  // ── Coach join path (claim-first) ──
  if (inviteType === 'coach') {
    // Wait for members to load so we can show unclaimed spots
    if (membersLoading) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">{team.name}</h1>
        <p className="text-slate-400 text-sm mb-1">{teamSubtitle(team)}</p>
        <p className={`text-slate-500 text-xs ${headCoachName ? '' : 'invisible'} mb-6`}>
          {headCoachName ? <>Coach <span className="text-slate-300">{headCoachName}</span> invited you</> : '\u00A0'}
        </p>

        {/* Claim-first: show unclaimed coach spots */}
        {unclaimedCoaches.length > 0 && !showNewCoachForm && (
          <div className="space-y-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Are you on the roster?</h2>
              <p className="text-slate-400 text-sm">Tap your name to claim your spot.</p>
            </div>
            <div className="space-y-2">
              {unclaimedCoaches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleClaimSpot(m)}
                  disabled={claiming}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors min-h-[56px] disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-white">{m.jersey_name || 'Coach'}</span>
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-500">
                      {m.role === 'assistant_coach' ? 'Asst Coach' : 'Coach'}
                    </span>
                  </div>
                  {claiming ? (
                    <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                  ) : (
                    <span className="text-amber-500 text-sm font-medium">That's me</span>
                  )}
                </button>
              ))}
            </div>

            {/* Divider + fallback to new coach form */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 border-t border-slate-800" />
              <span className="text-slate-500 text-xs">not listed?</span>
              <div className="flex-1 border-t border-slate-800" />
            </div>
            <button
              type="button"
              onClick={() => setShowNewCoachForm(true)}
              className="w-full text-center text-sm text-slate-400 hover:text-amber-500 transition-colors py-2"
            >
              Join as a new coach
            </button>
          </div>
        )}

        {/* New coach form — shown when no unclaimed spots exist OR user tapped "not listed" */}
        {(unclaimedCoaches.length === 0 || showNewCoachForm) && (
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
        )}
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

  const selectedCount = parentSelectedIds.size;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">{team.name}</h1>
      <p className="text-slate-400 text-sm mb-1">{teamSubtitle(team)}</p>
      <p className={`text-slate-500 text-xs ${headCoachName ? '' : 'invisible'} mb-6`}>
        {headCoachName ? <>Coach <span className="text-slate-300">{headCoachName}</span> invited you</> : '\u00A0'}
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
