import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Loader2, Copy, Check, Users } from 'lucide-react';
import { toast } from 'sonner';

const SPORTS = [
  { value: 'flag_football', label: 'Flag Football' },
  { value: 'soccer', label: 'Soccer' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'baseball', label: 'Baseball' },
  { value: 'other', label: 'Other' },
];

const NETWORKS = [
  { id: 'recess', name: 'Recess' },
  { id: 'creative_alliance', name: 'Creative Alliance' },
  { id: 'gathering_circle', name: 'Gathering Circle' },
  { id: 'harvest_network', name: 'Harvest Network' },
];

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function TeamOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    sport: 'flag_football',
    format: '5v5',
    league: '',
    season: '',
    linkToNetwork: false,
    network_id: '',
  });
  const [copied, setCopied] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const [createdTeam, setCreatedTeam] = useState(null);

  const createTeam = useMutation({
    mutationFn: async () => {
      const inviteCode = generateInviteCode();
      const payload = {
        name: formData.name.trim(),
        sport: formData.sport || 'flag_football',
        format: formData.format?.trim() || '5v5',
        league: formData.league?.trim() || null,
        season: formData.season?.trim() || null,
        owner_id: currentUser?.id,
        status: 'active',
        invite_code: inviteCode,
        network_id: formData.linkToNetwork && formData.network_id ? formData.network_id : null,
      };
      const team = await base44.entities.Team.create(payload);
      const displayName = currentUser?.data?.display_name || currentUser?.data?.full_name || currentUser?.full_name || 'Coach';
      await base44.entities.TeamMember.create({
        team_id: team.id,
        user_id: currentUser?.id,
        role: 'coach',
        jersey_name: displayName,
        status: 'active',
      });
      return { team, inviteCode };
    },
    onSuccess: ({ team }) => {
      setCreatedTeam(team);
      toast.success('Team created');
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to create team');
    },
  });

  const handleNext = () => {
    if (step === 0) {
      if (!formData.name?.trim()) {
        toast.error('Please enter a team name');
        return;
      }
      if (step < 2) setStep((s) => s + 1);
      else createTeam.mutate({ isFinalStep: true });
    } else if (step === 1) {
      if (step < 2) setStep((s) => s + 1);
      else createTeam.mutate({ isFinalStep: true });
    } else {
      createTeam.mutate({ isFinalStep: true });
    }
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error('Please enter a team name');
      return;
    }
    setStep(1);
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleFinalSubmit = (e) => {
    e.preventDefault();
    createTeam.mutate();
  };

  const goToTeam = () => {
    if (createdTeam?.id) navigate(createPageUrl('BusinessDashboard') + '?team=' + createdTeam.id);
  };

  const shareLink = createdTeam?.invite_code ? `locallane.app/join/${createdTeam.invite_code}` : '';

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentUser?.id) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Create a Team</h1>
            <p className="text-sm text-slate-400">Step {step + 1} of 3</p>
          </div>
        </div>

        {step === 0 && (
          <form onSubmit={handleStep1Submit} className="space-y-6">
            <div>
              <Label className="text-slate-400">Team name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                className="w-full bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1"
                placeholder="e.g. Eagles 10U"
                required
              />
            </div>
            <div>
              <Label className="text-slate-400">Sport</Label>
              <select
                value={formData.sport}
                onChange={(e) => setFormData((d) => ({ ...d, sport: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1"
              >
                {SPORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-slate-400">Format</Label>
              <Input
                value={formData.format}
                onChange={(e) => setFormData((d) => ({ ...d, format: e.target.value }))}
                className="w-full bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1"
                placeholder="5v5"
              />
            </div>
            <div>
              <Label className="text-slate-400">League (optional)</Label>
              <Input
                value={formData.league}
                onChange={(e) => setFormData((d) => ({ ...d, league: e.target.value }))}
                className="w-full bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1"
                placeholder="e.g. Grab It NFL FLAG"
              />
            </div>
            <div>
              <Label className="text-slate-400">Season (optional)</Label>
              <Input
                value={formData.season}
                onChange={(e) => setFormData((d) => ({ ...d, season: e.target.value }))}
                className="w-full bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1"
                placeholder="e.g. Spring 2026"
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-medium px-4 py-2 rounded-lg min-h-[44px]">
                Next
              </Button>
            </div>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={handleStep2Submit} className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Connect your team to a LocalLane network?</Label>
              <button
                type="button"
                role="switch"
                onClick={() => setFormData((d) => ({ ...d, linkToNetwork: !d.linkToNetwork }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${formData.linkToNetwork ? 'bg-amber-500' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.linkToNetwork ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            {formData.linkToNetwork && (
              <div>
                <Label className="text-slate-400">Network</Label>
                <select
                  value={formData.network_id}
                  onChange={(e) => setFormData((d) => ({ ...d, network_id: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 mt-1"
                >
                  <option value="">Select a network</option>
                  {NETWORKS.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Team events will appear in the network for LocalLane members.</p>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500" onClick={() => setStep(0)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-medium px-4 py-2 rounded-lg min-h-[44px]">
                Next
              </Button>
            </div>
          </form>
        )}

        {step === 2 && !createdTeam && (
          <form onSubmit={handleFinalSubmit} className="space-y-6">
            <p className="text-slate-400">Your team will be created with a unique invite code. After you tap Done, you can share the link so players and parents can join.</p>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 min-h-[44px]" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-medium px-4 py-2 rounded-lg min-h-[44px]" disabled={createTeam.isPending}>
                {createTeam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Done'}
              </Button>
            </div>
          </form>
        )}

        {createdTeam && (
          <div className="space-y-6">
            <p className="text-slate-400">Share this with players and parents so they can join your team.</p>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Your team invite code</p>
                <p className="text-lg font-mono font-bold text-amber-500">{createdTeam.invite_code}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Share this link</p>
                <p className="text-slate-300 break-all mb-2">{shareLink}</p>
                <Button type="button" size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 min-h-[44px]" onClick={() => copyLink(shareLink)}>
                  {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              </div>
            </div>
            <Button type="button" className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium px-4 py-2 rounded-lg min-h-[44px]" onClick={goToTeam}>
              Go to team
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
