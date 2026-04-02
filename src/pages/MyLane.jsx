import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Loader2, Store, ArrowRight, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useRole } from '@/hooks/useRole';
import { useIsMobile } from '@/hooks/use-mobile';
import MyLaneSurface from '@/components/mylane/MyLaneSurface';
import MylaneMobileSheet from '@/components/mylane/MylaneMobileSheet';
import AgentChat from '@/components/fieldservice/AgentChat';
import { useMylane } from '@/hooks/useMylane';
import { WARM_ENTRY } from '@/config/warmEntryMessages';
import { FrequencyProvider, useFrequency } from '@/contexts/FrequencyContext';

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
  return (
    <FrequencyProvider>
      <MyLaneInner />
    </FrequencyProvider>
  );
}

function MyLaneInner() {
  const queryClient = useQueryClient();
  const agentMessageRef = useRef(null);
  const [welcomeJustCompleted, setWelcomeJustCompleted] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [warmEntry, setWarmEntry] = useState(null); // { workspace, message, wizardPage } | null
  const [copilotOpen, setCopilotOpen] = useState(false);
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

  // Warm workspace entry — stores intro message for copilot
  const handleDoorOpen = useCallback((workspace) => {
    const config = WARM_ENTRY[workspace];
    if (!config) return;
    setWarmEntry({ workspace, message: config.userMessage, wizardPage: config.wizardPage });
  }, []);

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

  // Clean up first-visit flag (copilot is on-demand now)
  useEffect(() => {
    try { localStorage.removeItem('mylane_first_visit'); } catch {}
  }, []);

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
  // DEC-131: One surface, everything renders in place.
  // Desktop: copilot FAB → slide-in panel from right. Mobile: bottom sheet.

  // Mushroom FAB SVG — sized for FAB (22px per mockup spec)
  const mushroomSvg = (size = 22) => (
    <svg viewBox="0 0 24 24" style={{ width: size, height: size }} stroke="#f59e0b" fill="none" strokeWidth={1.5}>
      <circle cx="12" cy="10" r="6" />
      <line x1="12" y1="16" x2="12" y2="22" />
      <line x1="9" y1="19" x2="12" y2="16" />
      <line x1="15" y1="19" x2="12" y2="16" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Holographic FAB keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fabBreathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); border-color: rgba(245,158,11,0.6); }
          50% { box-shadow: 0 0 12px 2px rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.9); }
        }
        @keyframes iconBreathe {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes holoSpin { to { rotate: 360deg; } }
        .cop-fab-calm { animation: fabBreathe 4s ease-in-out infinite; }
        .cop-fab-calm svg { animation: iconBreathe 4s ease-in-out infinite; }
        .cop-fab-active { box-shadow: 0 0 16px 4px rgba(245,158,11,0.15); }
      ` }} />

      {/* Main surface — full width, shrinks when copilot open on desktop */}
      <div
        className="transition-[margin-right] duration-300 ease-in-out"
        style={{ marginRight: (!isMobile && copilotOpen) ? 320 : 0 }}
      >
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

      {/* ── Copilot: desktop slide-in panel ── */}
      {!isMobile && (
        <>
          {/* Slide-in panel from right */}
          <div
            className="fixed top-0 h-full flex flex-col"
            style={{
              width: 320,
              right: copilotOpen ? 0 : -320,
              borderLeft: '1px solid #111827',
              background: '#060b14',
              transition: 'right 0.3s ease',
              zIndex: 45,
            }}
          >
            {/* Panel header */}
            <div className="flex items-center gap-2" style={{ padding: '12px 16px', borderBottom: '1px solid #111827' }}>
              <div className="flex items-center justify-center flex-shrink-0" style={{
                width: 24, height: 24, borderRadius: '50%', border: '1.5px solid #f59e0b',
              }}>
                {mushroomSvg(10)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#f8fafc' }}>Mylane</div>
                <div style={{ fontSize: 10, color: '#475569' }}>Your companion</div>
              </div>
              <button
                type="button"
                onClick={() => setCopilotOpen(false)}
                className="cursor-pointer"
                style={{ padding: '4px 8px', color: '#475569', fontSize: 14, transition: 'color 0.15s' }}
              >
                <X style={{ width: 14, height: 14 }} strokeWidth={2} />
              </button>
            </div>

            {/* AgentChat fills the panel */}
            <div className="flex-1 overflow-hidden [&>div]:h-full [&>div>div]:h-full [&>div>div]:max-h-full [&>div>div]:rounded-none">
              <AgentChat
                agentName="MyLane"
                userId={currentUser?.id}
                isOpen={true}
                onClose={() => setCopilotOpen(false)}
                docked={true}
                fillHeight={true}
                onMessage={(msg) => agentMessageRef.current?.(msg)}
                workspaceProfiles={workspaceProfiles}
                pendingMessage={warmEntry?.message ?? null}
                onPendingMessageSent={() => setWarmEntry((prev) => prev ? { ...prev, message: null } : null)}
                mylane_tier={mylane_tier}
              />
            </div>
          </div>

          {/* Holographic mushroom FAB — calm when idle, active when copilot open */}
          <div
            className={copilotOpen ? 'cop-fab-active' : 'cop-fab-calm'}
            style={{
              position: 'fixed', bottom: 20, right: 20, width: 44, height: 44,
              borderRadius: '50%',
              border: `1.5px solid ${copilotOpen ? 'rgba(245,158,11,1)' : 'rgba(245,158,11,0.6)'}`,
              background: copilotOpen ? 'rgba(18,14,4,0.95)' : 'rgba(10,15,26,0.9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 44, transition: 'opacity 0.2s',
              opacity: copilotOpen ? 0 : 1,
              pointerEvents: copilotOpen ? 'none' : 'auto',
            }}
            onClick={() => setCopilotOpen(true)}
            title="Open Mylane"
          >
            {/* Holographic ring (active state) */}
            {copilotOpen && (
              <div style={{
                position: 'absolute', inset: -2, borderRadius: '50%', pointerEvents: 'none', zIndex: -1,
                background: 'conic-gradient(from 0deg, rgba(245,158,11,0.15), rgba(168,85,247,0.1), rgba(59,130,246,0.1), rgba(245,158,11,0.15))',
                animation: 'holoSpin 3s linear infinite',
              }} />
            )}
            {mushroomSvg(22)}
          </div>
        </>
      )}

      {/* ── Copilot: mobile bottom sheet ── */}
      {isMobile && (
        <>
          {/* Holographic mushroom FAB — mobile */}
          {!mobileSheetOpen && (
            <div
              className="cop-fab-calm"
              style={{
                position: 'fixed', bottom: 20, right: 20, width: 44, height: 44,
                borderRadius: '50%', border: '1.5px solid rgba(245,158,11,0.6)',
                background: 'rgba(10,15,26,0.9)', zIndex: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                marginBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
              onClick={() => setMobileSheetOpen(true)}
              title="Open Mylane"
            >
              {mushroomSvg(22)}
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
        </>
      )}
    </div>
  );
}
