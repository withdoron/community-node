import React, { useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Store } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useRole } from '@/hooks/useRole';
import { useUserOwnedBusinesses } from '@/hooks/useUserOwnedBusinesses';
import MyLaneSurface from '@/components/mylane/MyLaneSurface';
import UpcomingEventsSection from '@/components/mylane/UpcomingEventsSection';
import DiscoverSection from '@/components/mylane/DiscoverSection';

export default function MyLane() {
  const queryClient = useQueryClient();
  const agentMessageRef = useRef(null);
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    }
  });

  const { isAppAdmin } = useRole();
  const { hasOwnedBusinesses } = useUserOwnedBusinesses(currentUser);

  // ── Workspace profile queries (feed MyLaneSurface) ──

  // Teams: find memberships → resolve team records
  const { data: myTeamMemberships = [] } = useQuery({
    queryKey: ['mylane-team-memberships', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const result = await base44.entities.TeamMember.filter({ user_id: currentUser.id, status: 'active' });
      return Array.isArray(result) ? result : result ? [result] : [];
    },
    enabled: !!currentUser?.id,
  });

  const teamIds = [...new Set(myTeamMemberships.map((m) => m.team_id).filter(Boolean))];

  const { data: allTeams = [] } = useQuery({
    queryKey: ['mylane-teams', teamIds.sort().join(',')],
    queryFn: async () => {
      if (teamIds.length === 0) return [];
      const teams = await Promise.all(teamIds.map((id) => base44.entities.Team.get(id)));
      return teams.filter((t) => t && t.status === 'active');
    },
    enabled: teamIds.length > 0,
  });

  // Finance profiles
  const { data: financeProfiles = [] } = useQuery({
    queryKey: ['mylane-finance-profiles', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const list = await base44.entities.FinancialProfile.filter({ user_id: currentUser.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!currentUser?.id,
  });

  // Field Service profiles (owned)
  const { data: ownedFSProfiles = [] } = useQuery({
    queryKey: ['mylane-fs-profiles', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const list = await base44.entities.FieldServiceProfile.filter({ user_id: currentUser.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!currentUser?.id,
  });

  // Field Service profiles (joined as worker/sub)
  const { data: joinedFSProfiles = [] } = useQuery({
    queryKey: ['mylane-fs-joined', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      try {
        const raw = localStorage.getItem('joinedFSWorkspaces');
        if (!raw) return [];
        const joined = JSON.parse(raw);
        if (!Array.isArray(joined)) return [];
        const results = await Promise.all(
          joined.map(async (entry) => {
            try {
              const list = await base44.entities.FieldServiceProfile.filter({ id: entry.id });
              const profile = Array.isArray(list) ? list[0] : list;
              if (profile) return { ...profile, _workerRole: entry.role || 'worker' };
              return null;
            } catch {
              return { id: entry.id, workspace_name: entry.name || 'Field Service', _workerRole: entry.role || 'worker', _cached: true };
            }
          })
        );
        return results.filter(Boolean);
      } catch { return []; }
    },
    enabled: !!currentUser?.id,
  });

  // Merge owned + joined FS profiles
  const fieldServiceProfiles = React.useMemo(() => {
    const ownedIds = new Set(ownedFSProfiles.map((p) => p.id));
    const merged = [...ownedFSProfiles];
    joinedFSProfiles.forEach((jp) => { if (!ownedIds.has(jp.id)) merged.push(jp); });
    return merged;
  }, [ownedFSProfiles, joinedFSProfiles]);

  // Property Management profiles
  const { data: propertyMgmtProfiles = [] } = useQuery({
    queryKey: ['mylane-pm-profiles', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const list = await base44.entities.PMPropertyProfile.filter({ user_id: currentUser.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!currentUser?.id,
  });

  // ── Loading ──
  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  // ── Not authenticated ──
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-100 mb-3">Welcome to LocalLane</h1>
          <p className="text-slate-400 mb-6">Sign in to see your spaces.</p>
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Onboarding gate (DEC-119: invite codes skip wizard) ──
  const onboardingComplete =
    currentUser?.onboarding_complete === true ||
    currentUser?.data?.onboarding_complete === true;

  if (!onboardingComplete) {
    try {
      const pendingTeam = localStorage.getItem('pendingTeamInvite');
      if (pendingTeam) return <Navigate to={`/join/${pendingTeam}`} replace />;
      const pendingFS = localStorage.getItem('pendingFieldServiceInvite');
      if (pendingFS) return <Navigate to={`/join-field-service/${pendingFS}`} replace />;
      const pendingPM = localStorage.getItem('pendingPMInvite');
      if (pendingPM) return <Navigate to={`/join-pm/${pendingPM}`} replace />;
    } catch { /* localStorage unavailable */ }

    return <Navigate to={createPageUrl('welcome')} replace />;
  }

  // ── Mylane: the organism's living surface ──
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">

        {/* Primary: MyLaneSurface — your spaces, vitality-dimmed, organically ordered */}
        <MyLaneSurface
          currentUser={currentUser}
          financeProfiles={financeProfiles}
          fieldServiceProfiles={fieldServiceProfiles}
          allTeams={allTeams}
          propertyMgmtProfiles={propertyMgmtProfiles}
          agentMessageRef={agentMessageRef}
        />

        {/* Secondary: community content — upcoming events, directory discovery */}
        <UpcomingEventsSection currentUser={currentUser} />
        <DiscoverSection />

        {/* Business CTA for non-business-owners */}
        {!hasOwnedBusinesses && (
          <section>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                  <Store className="h-5 w-5 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-slate-100">Run a local business?</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    List your business, create events, and connect with your community.
                  </p>
                  <Link
                    to={createPageUrl('BusinessOnboarding')}
                    className="inline-flex items-center gap-1.5 mt-4 text-amber-500 hover:text-amber-400 font-medium text-sm border border-amber-500 hover:border-amber-400 rounded-lg px-4 py-2 transition-colors"
                  >
                    Get Started
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
