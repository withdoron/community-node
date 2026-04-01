import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, LogIn, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const PENDING_INVITE_KEY = 'pendingPMInvite';

export default function JoinPM() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState('');

  // Persist invite code for redirect after auth
  useEffect(() => {
    if (inviteCode) {
      try {
        localStorage.setItem(PENDING_INVITE_KEY, inviteCode);
      } catch (_) {}
    }
  }, [inviteCode]);

  // Pre-fill name from user data
  useEffect(() => {
    if (user && !name) {
      const displayName = user?.data?.display_name || user?.data?.full_name || '';
      setName(displayName);
    }
  }, [user, name]);

  // Detect invite type: tenant, owner, or manager
  const { data: profileData, isLoading, error: queryError } = useQuery({
    queryKey: ['join-pm', inviteCode],
    queryFn: async () => {
      if (!inviteCode?.trim()) return null;
      const code = inviteCode.trim();

      // Try tenant invite first
      const tenantResult = await base44.entities.PMPropertyProfile.filter({ tenant_invite_code: code });
      const tenantList = Array.isArray(tenantResult) ? tenantResult : tenantResult ? [tenantResult] : [];
      if (tenantList[0]) return { profile: tenantList[0], inviteType: 'tenant' };

      // Try owner invite
      const ownerResult = await base44.entities.PMPropertyProfile.filter({ owner_invite_code: code });
      const ownerList = Array.isArray(ownerResult) ? ownerResult : ownerResult ? [ownerResult] : [];
      if (ownerList[0]) return { profile: ownerList[0], inviteType: 'owner' };

      // Try manager invite
      const managerResult = await base44.entities.PMPropertyProfile.filter({ manager_invite_code: code });
      const managerList = Array.isArray(managerResult) ? managerResult : managerResult ? [managerResult] : [];
      if (managerList[0]) return { profile: managerList[0], inviteType: 'manager' };

      return null;
    },
    enabled: !!inviteCode?.trim(),
  });

  const profile = profileData?.profile;
  const inviteType = profileData?.inviteType;
  const workspaceName = profile?.workspace_name || profile?.business_name || 'Property Management';

  const handleSignIn = () => {
    const returnUrl = `${window.location.origin}/join-pm/${inviteCode}`;
    base44.auth.redirectToLogin(returnUrl);
  };

  const handleJoin = async () => {
    if (!user?.id) return;
    setJoining(true);
    try {
      const payload = {
        action: inviteType === 'tenant' ? 'join_as_tenant'
          : inviteType === 'owner' ? 'join_as_owner'
          : 'join_as_manager',
        invite_code: inviteCode,
      };

      if (inviteType === 'owner' || inviteType === 'manager') {
        payload.name = name.trim();
      }

      const response = await base44.serverFunctions.claimPMSpot(payload);

      if (response.error) {
        toast.error(response.error);
        setJoining(false);
        return;
      }

      const roleLabel = inviteType === 'tenant' ? 'tenant'
        : inviteType === 'owner' ? 'co-owner'
        : 'property manager';
      toast.success(`You've joined as a ${roleLabel}.`);
      localStorage.removeItem(PENDING_INVITE_KEY);
      try { localStorage.setItem('mylane_welcome', JSON.stringify({ space: 'property-pulse', name: workspace?.workspace_name || 'Property' })); } catch {}
      navigate(createPageUrl('MyLane'), { replace: true });
    } catch (err) {
      toast.error(err?.message || 'Failed to join');
      setJoining(false);
    }
  };

  // ── Loading ──
  if (isLoading || !inviteCode) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  // ── Invalid code ──
  if (queryError || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 max-w-md mx-auto">
        <h1 className="text-xl font-bold text-white mb-2">Invalid or expired invite</h1>
        <p className="text-slate-400 text-center mb-6">This invite code is not valid or the workspace may no longer be active.</p>
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
    const roleLabel = inviteType === 'tenant' ? 'tenant'
      : inviteType === 'owner' ? 'co-owner'
      : 'property manager';
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col p-6 max-w-md mx-auto">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-amber-500" />
            <h1 className="text-xl font-bold text-white">{workspaceName}</h1>
          </div>
          <p className="text-slate-300 text-sm">Sign in to join this workspace as a {roleLabel}.</p>
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

  // ── Tenant join path ──
  if (inviteType === 'tenant') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col p-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-6 w-6 text-amber-500" />
          <h1 className="text-xl font-bold text-white">{workspaceName}</h1>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Join as Tenant</h2>
          <p className="text-slate-400 text-sm">
            You'll be able to view your unit details, submit maintenance requests, and communicate with your property manager.
          </p>
          <Button
            onClick={handleJoin}
            disabled={joining}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px]"
          >
            {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Join as Tenant'}
          </Button>
        </div>
      </div>
    );
  }

  // ── Owner join path ──
  if (inviteType === 'owner') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col p-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-6 w-6 text-amber-500" />
          <h1 className="text-xl font-bold text-white">{workspaceName}</h1>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Join as Co-Owner</h2>
          <p className="text-slate-400 text-sm">
            You'll be able to view property data, financial summaries, and your ownership distributions.
          </p>
          <div>
            <label className="text-slate-300 text-sm font-medium block mb-1">Your name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 min-h-[44px]"
              placeholder="Your name"
              disabled={joining}
            />
          </div>
          <Button
            onClick={handleJoin}
            disabled={!name?.trim() || joining}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px]"
          >
            {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Join as Co-Owner'}
          </Button>
        </div>
      </div>
    );
  }

  // ── Manager join path ──
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col p-6 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="h-6 w-6 text-amber-500" />
        <h1 className="text-xl font-bold text-white">{workspaceName}</h1>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Join as Property Manager</h2>
        <p className="text-slate-400 text-sm">
          You'll have access to manage properties, expenses, maintenance, and financial summaries.
        </p>
        <div>
          <label className="text-slate-300 text-sm font-medium block mb-1">Your name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 min-h-[44px]"
            placeholder="Your name"
            disabled={joining}
          />
        </div>
        <Button
          onClick={handleJoin}
          disabled={!name?.trim() || joining}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium min-h-[44px]"
        >
          {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Join as Manager'}
        </Button>
      </div>
    </div>
  );
}
