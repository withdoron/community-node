import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { HardHat, Loader2, LogIn, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const PENDING_FS_INVITE_KEY = 'pendingFieldServiceInvite';

export default function JoinFieldService() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [claimedResult, setClaimedResult] = useState(null);

  // Persist invite code for redirect after auth
  useEffect(() => {
    if (inviteCode) {
      try {
        localStorage.setItem(PENDING_FS_INVITE_KEY, inviteCode);
      } catch (_) {}
    }
  }, [inviteCode]);

  // Find the workspace by invite code
  const { data: workspace, isLoading, error } = useQuery({
    queryKey: ['join-fs', inviteCode],
    queryFn: async () => {
      if (!inviteCode?.trim()) return null;
      const result = await base44.entities.FieldServiceProfile.filter({
        invite_code: inviteCode.trim(),
      });
      const list = Array.isArray(result) ? result : result ? [result] : [];
      return list[0] || null;
    },
    enabled: !!inviteCode?.trim(),
  });

  // Parse workers from workspace
  const workers = React.useMemo(() => {
    if (!workspace) return [];
    const wj = workspace.workers_json;
    if (Array.isArray(wj)) return wj;
    if (wj && typeof wj === 'object' && Array.isArray(wj.items)) return wj.items;
    return [];
  }, [workspace]);

  // Unclaimed spots (no user_id)
  const unclaimedSpots = workers.filter((w) => !w.user_id);

  // Check if current user already on roster
  const isAlreadyMember = isAuthenticated && user?.id && workers.some((w) => w.user_id === user.id);

  // Auto-redirect if already a member
  useEffect(() => {
    if (workspace && isAlreadyMember) {
      toast.info('You\'re already part of this crew');
      navigate(createPageUrl('BusinessDashboard') + '?fieldservice=' + workspace.id, { replace: true });
    }
  }, [workspace, isAlreadyMember, navigate]);

  const handleSignIn = () => {
    const returnUrl = `${window.location.origin}/join-field-service/${inviteCode}`;
    base44.auth.redirectToLogin(returnUrl);
  };

  const handleClaimSpot = async (workerName) => {
    if (!user?.id) return;
    setClaiming(true);
    try {
      const response = await base44.serverFunctions.claimWorkspaceSpot({
        invite_code: inviteCode,
        worker_name: workerName,
      });
      if (response.error) {
        toast.error(response.error);
        setClaiming(false);
        return;
      }
      // Clear pending invite + store joined workspace in localStorage
      try {
        localStorage.removeItem(PENDING_FS_INVITE_KEY);
        const existing = JSON.parse(localStorage.getItem('joinedFSWorkspaces') || '[]');
        if (!existing.some((e) => e.id === response.workspace_id)) {
          existing.push({ id: response.workspace_id, name: response.workspace_name, role: response.role });
          localStorage.setItem('joinedFSWorkspaces', JSON.stringify(existing));
        }
      } catch (_) {}
      setClaimedResult(response);
      toast.success('You\'re on the team!');
    } catch (err) {
      toast.error(err?.message || 'Failed to claim spot');
      setClaiming(false);
    }
  };

  // ─── Loading ───────────────────────────
  if (isLoading || !inviteCode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  // ─── Invalid invite ────────────────────
  if (error || !workspace) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 max-w-md mx-auto">
        <h1 className="text-xl font-bold text-white mb-2">Invalid or expired invite</h1>
        <p className="text-slate-400 text-center mb-6">
          This invite code is not valid or the space may no longer be active.
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

  // ─── Not signed in ────────────────────
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 max-w-md mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <HardHat className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                {workspace.workspace_name || workspace.business_name || 'Field Service'}
              </h1>
              <p className="text-sm text-slate-400">
                {workspace.business_name && workspace.workspace_name !== workspace.business_name
                  ? workspace.business_name
                  : 'Field Service'}
              </p>
            </div>
          </div>
          <p className="text-slate-300 text-sm">
            Sign in to join this space and claim your spot on the crew.
          </p>
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

  // ─── Successfully claimed ─────────────
  if (claimedResult) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 max-w-md mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold text-white">You're in!</h1>
          <p className="text-slate-400 text-sm">
            You've joined <span className="text-slate-200 font-medium">{claimedResult.workspace_name}</span> as a{' '}
            <span className="text-amber-400 font-medium">{claimedResult.role === 'subcontractor' ? 'subcontractor' : 'worker'}</span>.
          </p>
          <Button
            onClick={() => navigate(createPageUrl('BusinessDashboard') + '?fieldservice=' + claimedResult.workspace_id, { replace: true })}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
          >
            Open Space
          </Button>
        </div>
      </div>
    );
  }

  // ─── Claim a spot ─────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <HardHat className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">
            {workspace.workspace_name || workspace.business_name || 'Field Service'}
          </h1>
          <p className="text-sm text-slate-400">Join this space</p>
        </div>
      </div>

      <p className="text-slate-300 text-sm mb-4">
        Select your name to claim your spot. If you don't see your name, ask the owner to add you first.
      </p>

      {unclaimedSpots.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
          <p className="text-slate-400">
            No unclaimed spots available. Ask the owner to add you to the roster.
          </p>
          <Button
            onClick={() => navigate(createPageUrl('MyLane'))}
            className="mt-4 bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px]"
          >
            Go to My Lane
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {unclaimedSpots.map((w, idx) => {
            const roleLabel = w.role === 'subcontractor' ? 'Sub' : 'Worker';
            const roleBg = w.role === 'subcontractor' ? 'bg-sky-500/20 text-sky-400' : 'bg-amber-500/20 text-amber-400';
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleClaimSpot(w.name)}
                disabled={claiming}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors min-h-[56px] disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-white">{w.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${roleBg}`}>
                    {roleLabel}
                  </span>
                </div>
                {claiming ? (
                  <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                ) : (
                  <span className="text-amber-500 text-sm font-medium">That's me</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
