import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Loader2, Store, ArrowRight, MessageCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useRole } from '@/hooks/useRole';
import { useIsMobile } from '@/hooks/use-mobile';
import MyLaneSurface from '@/components/mylane/MyLaneSurface';
import MylanePanel from '@/components/mylane/MylanePanel';
import MylaneMobileSheet from '@/components/mylane/MylaneMobileSheet';
import { useMylane } from '@/hooks/useMylane';
import { WARM_ENTRY } from '@/config/warmEntryMessages';

// ─── Inline Welcome — replaces the onboarding wizard ───────────────
// Captures display name, sets onboarding_complete, reveals Mylane.
// Agent-free, zero-latency, works even if Base44 agent API is down.
function InlineWelcome({ currentUser, onComplete }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [step, setStep] = useState('name'); // 'name' | 'greeting'

  const completeMutation = useMutation({
    mutationFn: async (displayName) => {
      const data = { onboarding_complete: true };
      if (displayName) {
        data.display_name = displayName;
        data.full_name = displayName;
      }
      try {
        await base44.functions.invoke('updateUser', {
          action: 'update_onboarding',
          data,
        });
      } catch {
        // Server function failed — try direct update
        try {
          await base44.entities.User.update(currentUser.id, data);
        } catch { /* last resort */ }
      }
      // Optimistic cache update
      queryClient.setQueryData(['currentUser'], (old) =>
        old ? { ...old, ...data, data: { ...(old.data || {}), ...data } } : old
      );
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onSuccess: () => {
      // Mark as first visit so Mylane surface can auto-open chat
      try { localStorage.setItem('mylane_first_visit', '1'); } catch {}
      onComplete();
    },
  });

  const handleSubmitName = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStep('greeting');
    // Brief pause on greeting before completing — let the user feel welcomed
    setTimeout(() => completeMutation.mutate(trimmed), 1200);
  };

  const handleSkip = () => {
    completeMutation.mutate(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmitName();
  };

  // Greeting step — warm transition before Mylane opens
  if (step === 'greeting') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-sm space-y-4 animate-in fade-in duration-500">
          <h1
            className="text-3xl md:text-4xl font-bold text-amber-400"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Welcome, {name.trim()}.
          </h1>
          <p className="text-slate-400 text-sm">Your space is ready.</p>
          <Loader2 className="h-5 w-5 text-amber-500/50 animate-spin mx-auto mt-4" />
        </div>
      </div>
    );
  }

  // Name capture step
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        {/* Heading */}
        <div className="text-center">
          <h1
            className="text-3xl md:text-4xl font-bold text-white mb-3"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Welcome
          </h1>
          <p className="text-slate-400 text-sm">What should we call you?</p>
        </div>

        {/* Name input */}
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Your name"
            autoFocus
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 min-h-[48px] text-base"
            disabled={completeMutation.isPending}
          />
          <button
            type="button"
            onClick={handleSubmitName}
            disabled={!name.trim() || completeMutation.isPending}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-black rounded-xl px-4 min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors"
          >
            {completeMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowRight className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Skip */}
        <button
          type="button"
          onClick={handleSkip}
          disabled={completeMutation.isPending}
          className="block mx-auto text-slate-600 hover:text-slate-400 text-xs transition-colors"
        >
          skip for now
        </button>
      </div>
    </div>
  );
}

// ─── Main MyLane page ──────────────────────────────────────────────
export default function MyLane() {
  const queryClient = useQueryClient();
  const agentMessageRef = useRef(null);
  const [welcomeJustCompleted, setWelcomeJustCompleted] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [warmEntry, setWarmEntry] = useState(null); // { workspace, message, wizardPage } | null
  const [mylaneCollapsed, setMylaneCollapsed] = useState(() => {
    try { return localStorage.getItem('mylane_panel_collapsed') === 'true'; } catch { return false; }
  });
  const isMobile = useIsMobile();
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    }
  });

  const { isAppAdmin } = useRole();
  const { mylane_tier } = useMylane();

  // Warm workspace entry — open copilot with an intro message for the tapped space
  const handleDoorOpen = useCallback((workspace) => {
    const config = WARM_ENTRY[workspace];
    if (!config) return;
    setWarmEntry({ workspace, message: config.userMessage, wizardPage: config.wizardPage });
    // Open copilot immediately
    if (isMobile) {
      setMobileSheetOpen(true);
    } else {
      setMylaneCollapsed(false);
      try { localStorage.setItem('mylane_panel_collapsed', 'false'); } catch {}
    }
  }, [isMobile]);

  const handleWelcomeComplete = useCallback(() => {
    setWelcomeJustCompleted(true);
  }, []);

  // Suppress Layout Feedback FAB — Mylane is the feedback channel on this page
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('agent-active', { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent('agent-active', { detail: false }));
    };
  }, []);

  // Auto-open copilot on first visit (flag set by InlineWelcome onSuccess)
  useEffect(() => {
    try {
      const flag = localStorage.getItem('mylane_first_visit');
      if (flag) {
        localStorage.removeItem('mylane_first_visit');
        if (isMobile) {
          setMobileSheetOpen(true);
        } else {
          setMylaneCollapsed(false);
        }
      }
    } catch { /* ignore */ }
  }, [isMobile]);

  // ── Workspace profile queries (DEC-130: single server function call) ──
  // getMyLaneProfiles combines 4 profile entity queries into 1 server function call.
  // Target: ~2 integration credits per page load (down from ~17).

  const { data: profileData } = useQuery({
    queryKey: ['mylane-profiles-v2', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      try {
        const result = await base44.functions.invoke('getMyLaneProfiles', {
          user_id: currentUser.id,
        });
        if (result?.success) return result;
        throw new Error(result?.error || 'Server function failed');
      } catch (err) {
        // Fallback: individual queries if server function unavailable/blocked
        const [teamMembersRaw, financeRaw, fsRaw, pmRaw] = await Promise.all([
          base44.entities.TeamMember.filter({ user_id: currentUser.id, status: 'active' }),
          base44.entities.FinancialProfile.filter({ user_id: currentUser.id }),
          base44.entities.FieldServiceProfile.filter({ user_id: currentUser.id }),
          base44.entities.PMPropertyProfile.filter({ user_id: currentUser.id }),
        ]);
        const toArr = (r) => Array.isArray(r) ? r : r ? [r] : [];
        const memberships = toArr(teamMembersRaw);
        const teamIds = [...new Set(memberships.map((m) => m.team_id).filter(Boolean))];
        let teams = [];
        if (teamIds.length > 0) {
          const teamRecords = await Promise.all(teamIds.map((id) => base44.entities.Team.get(id)));
          teams = teamRecords.filter((t) => t && t.status === 'active');
        }
        let mealPrepRaw = [];
        try {
          const allMP = await base44.entities.MealPrepProfile.list();
          mealPrepRaw = (Array.isArray(allMP) ? allMP : []).filter(p => String(p.user_id) === String(currentUser.id));
        } catch {}
        return {
          success: true,
          financeProfiles: toArr(financeRaw),
          ownedFSProfiles: toArr(fsRaw),
          propertyMgmtProfiles: toArr(pmRaw),
          teamMemberships: memberships,
          teams,
          mealPrepProfiles: toArr(mealPrepRaw),
          _fallback: true,
        };
      }
    },
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Destructure profile data
  const financeProfiles      = profileData?.financeProfiles      ?? [];
  const ownedFSProfiles      = profileData?.ownedFSProfiles      ?? [];
  const propertyMgmtProfiles = profileData?.propertyMgmtProfiles ?? [];
  const allTeams             = profileData?.teams                 ?? [];
  const mealPrepFromServer   = profileData?.mealPrepProfiles     ?? [];

  // Supplementary meal prep query — server function may not include mealPrepProfiles
  // until re-published. Direct query ensures the card appears immediately.
  const { data: mealPrepDirect = [] } = useQuery({
    queryKey: ['mylane-mealprep-direct', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      try {
        const all = await base44.entities.MealPrepProfile.list();
        return (Array.isArray(all) ? all : []).filter(
          (p) => String(p.user_id) === String(currentUser.id)
        );
      } catch { return []; }
    },
    enabled: !!currentUser?.id && mealPrepFromServer.length === 0,
    staleTime: 5 * 60 * 1000,
  });

  const mealPrepProfiles = mealPrepFromServer.length > 0 ? mealPrepFromServer : mealPrepDirect;

  // Business profiles — fetch owned businesses for spinner
  const { data: businessProfiles = [] } = useQuery({
    queryKey: ['mylane-businesses', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      try {
        const owned = await base44.entities.Business.filter(
          { owner_user_id: currentUser.id },
          '-created_date',
          100
        );
        return (Array.isArray(owned) ? owned : owned ? [owned] : []).filter(
          (b) => !b.is_deleted && b.status !== 'deleted'
        );
      } catch { return []; }
    },
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Field Service profiles (joined as worker/sub) — client-only (localStorage)
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
    staleTime: 5 * 60 * 1000,
  });

  // Merge owned + joined FS profiles
  const fieldServiceProfiles = React.useMemo(() => {
    const ownedIds = new Set(ownedFSProfiles.map((p) => p.id));
    const merged = [...ownedFSProfiles];
    joinedFSProfiles.forEach((jp) => { if (!ownedIds.has(jp.id)) merged.push(jp); });
    return merged;
  }, [ownedFSProfiles, joinedFSProfiles]);

  // ── Copilot workspace context ──
  const workspaceProfiles = useMemo(() => ({
    fieldService: fieldServiceProfiles,
    finance: financeProfiles,
    teams: allTeams,
    propertyMgmt: propertyMgmtProfiles,
    mealPrep: mealPrepProfiles,
    isAdmin: currentUser?.role === 'admin',
    mylane_tier,
  }), [fieldServiceProfiles, financeProfiles, allTeams, propertyMgmtProfiles, mealPrepProfiles, currentUser?.role, mylane_tier]);

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

  // ── Onboarding: inline welcome for cold users, invite redirect for invited users ──
  const onboardingComplete =
    currentUser?.onboarding_complete === true ||
    currentUser?.data?.onboarding_complete === true;

  if (!onboardingComplete && !welcomeJustCompleted) {
    // DEC-119: invite codes skip onboarding entirely
    try {
      const pendingTeam = localStorage.getItem('pendingTeamInvite');
      if (pendingTeam) return <Navigate to={`/join/${pendingTeam}`} replace />;
      const pendingDoor = localStorage.getItem('pendingTeamDoorSlug');
      if (pendingDoor) return <Navigate to={`/door/${pendingDoor}`} replace />;
      const pendingFS = localStorage.getItem('pendingFieldServiceInvite');
      if (pendingFS) return <Navigate to={`/join-field-service/${pendingFS}`} replace />;
      const pendingPM = localStorage.getItem('pendingPMInvite');
      if (pendingPM) return <Navigate to={`/join-pm/${pendingPM}`} replace />;
    } catch { /* localStorage unavailable */ }

    // Cold users: inline welcome — no wizard redirect
    return <InlineWelcome currentUser={currentUser} onComplete={handleWelcomeComplete} />;
  }

  // ── Mylane: the organism's living surface ──

  // Shared surface content — same on mobile and desktop
  // DEC-131: Spinner replaces card grid. Surface IS the spinner.
  const cardContent = (
    <div className="max-w-xl mx-auto px-2 py-4">
      <MyLaneSurface
        currentUser={currentUser}
        financeProfiles={financeProfiles}
        fieldServiceProfiles={fieldServiceProfiles}
        allTeams={allTeams}
        propertyMgmtProfiles={propertyMgmtProfiles}
        mealPrepProfiles={mealPrepProfiles}
        businessProfiles={businessProfiles}
        agentMessageRef={agentMessageRef}
        onDoorOpen={handleDoorOpen}
        warmEntryWizardPage={warmEntry?.wizardPage ?? null}
      />
    </div>
  );

  if (isMobile) {
    // Mobile: scrollable card grid + FAB + full-screen sheet
    return (
      <div className="min-h-screen bg-slate-950">
        {cardContent}

        {/* Mylane Beta FAB */}
        {!mobileSheetOpen && (
          <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-1.5">
            <span className="text-xs text-amber-500/70 font-medium px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              Mylane Beta
            </span>
            <button
              type="button"
              onClick={() => setMobileSheetOpen(true)}
              className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 flex items-center justify-center transition-all hover:scale-105"
              style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
              title="Open Mylane"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
          </div>
        )}

        <MylaneMobileSheet
          isOpen={mobileSheetOpen}
          onClose={() => setMobileSheetOpen(false)}
          currentUser={currentUser}
          onMessage={(msg) => agentMessageRef.current?.(msg)}
          workspaceProfiles={workspaceProfiles}
          pendingMessage={warmEntry?.message ?? null}
          onPendingMessageSent={() => setWarmEntry((prev) => prev ? { ...prev, message: null } : null)}
          mylane_tier={mylane_tier}
        />
      </div>
    );
  }

  // Desktop: resizable side panel — Mylane copilot alongside card grid
  return (
    <div className="h-[calc(100vh-64px)] bg-slate-950">
      <MylanePanel
        currentUser={currentUser}
        onMessage={(msg) => agentMessageRef.current?.(msg)}
        workspaceProfiles={workspaceProfiles}
        isCollapsed={mylaneCollapsed}
        onToggle={(collapsed) => {
          setMylaneCollapsed(collapsed);
          try { localStorage.setItem('mylane_panel_collapsed', String(collapsed)); } catch {}
        }}
        pendingMessage={warmEntry?.message ?? null}
        onPendingMessageSent={() => setWarmEntry((prev) => prev ? { ...prev, message: null } : null)}
        mylane_tier={mylane_tier}
      >
        {cardContent}
      </MylanePanel>
    </div>
  );
}
