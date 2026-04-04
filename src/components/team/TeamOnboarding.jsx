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
import { useConfig } from '@/hooks/useConfig';

const SPORTS = [
  { value: 'flag_football', label: 'Flag Football' },
  { value: 'soccer', label: 'Soccer' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'baseball', label: 'Baseball' },
  { value: 'other', label: 'Other' },
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

  const { data: networksConfig = [] } = useConfig('platform', 'networks');
  const activeNetworks = (networksConfig || []).filter((n) => n.active !== false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const [createdTeam, setCreatedTeam] = useState(null);

  const createTeam = useMutation({
    mutationFn: async () => {
      const inviteCode = generateInviteCode();
      const coachInviteCode = generateInviteCode();
      const payload = {
        name: formData.name.trim(),
        sport: formData.sport || 'flag_football',
        format: formData.format?.trim() || '5v5',
        league: formData.league?.trim() || null,
        season: formData.season?.trim() || null,
        owner_id: currentUser?.id,
        status: 'active',
        invite_code: inviteCode,
        coach_invite_code: coachInviteCode,
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
    if (createdTeam?.id) navigate(createPageUrl('MyLane'));
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://locallane.app';
  const familyLink = createdTeam?.invite_code ? `${origin}/join/${createdTeam.invite_code}` : '';
  const coachLink = createdTeam?.coach_invite_code ? `${origin}/join/${createdTeam.coach_invite_code}` : '';
  const doorSlug = createdTeam?.name
    ? createdTeam.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : '';
  const leagueLink = doorSlug ? `${origin}/door/${doorSlug}` : '';

  const copyLink = (link, label) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success(label || 'Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentUser?.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Create a Team</h1>
            <p className="text-sm text-muted-foreground">Step {step + 1} of 3</p>
          </div>
        </div>

        {step === 0 && (
          <form onSubmit={handleStep1Submit} className="space-y-6">
            <div>
              <Label className="text-muted-foreground">Team name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                className="w-full bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring mt-1"
                placeholder="e.g. Eagles 10U"
                required
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Sport</Label>
              <select
                value={formData.sport}
                onChange={(e) => setFormData((d) => ({ ...d, sport: e.target.value }))}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-ring mt-1"
              >
                {SPORTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {formData.sport !== 'flag_football' && (
                <div className="mt-3 bg-secondary/50 rounded-lg p-3 space-y-2">
                  <p className="text-muted-foreground text-sm">
                    {SPORTS.find((s) => s.value === formData.sport)?.label || 'This sport'} teams are coming soon. Want to help make it happen?
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/10 hover:bg-transparent text-sm min-h-[44px]"
                    onClick={() => navigate(createPageUrl('MyLane'))}
                  >
                    Share on Shaping the Garden
                  </Button>
                </div>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground">Format</Label>
              <Input
                value={formData.format}
                onChange={(e) => setFormData((d) => ({ ...d, format: e.target.value }))}
                className="w-full bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring mt-1"
                placeholder="5v5"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">League (optional)</Label>
              <Input
                value={formData.league}
                onChange={(e) => setFormData((d) => ({ ...d, league: e.target.value }))}
                className="w-full bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring mt-1"
                placeholder="e.g. Grab It NFL FLAG"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Season (optional)</Label>
              <Input
                value={formData.season}
                onChange={(e) => setFormData((d) => ({ ...d, season: e.target.value }))}
                className="w-full bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring mt-1"
                placeholder="e.g. Spring 2026"
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={formData.sport !== 'flag_football'}
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium px-4 py-2 rounded-lg min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </Button>
            </div>
          </form>
        )}

        {step === 1 && (
          <form onSubmit={handleStep2Submit} className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-foreground-soft">Connect your team to a LocalLane network?</Label>
              <button
                type="button"
                role="switch"
                onClick={() => setFormData((d) => ({ ...d, linkToNetwork: !d.linkToNetwork }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${formData.linkToNetwork ? 'bg-primary' : 'bg-surface'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-slate-100 transition-transform ${formData.linkToNetwork ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            {formData.linkToNetwork && (
              <div>
                <Label className="text-muted-foreground">Network</Label>
                <select
                  value={formData.network_id}
                  onChange={(e) => setFormData((d) => ({ ...d, network_id: e.target.value }))}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-ring mt-1"
                >
                  <option value="">Select a network</option>
                  {activeNetworks.map((n) => {
                    const value = n.value ?? n.slug ?? n.id;
                    const label = n.label ?? n.name ?? value;
                    return (
                      <option key={value} value={value}>{label}</option>
                    );
                  })}
                </select>
                <p className="text-xs text-muted-foreground/70 mt-1">Team events will appear in the network for LocalLane members.</p>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="border-border text-foreground-soft hover:border-primary hover:text-primary" onClick={() => setStep(0)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium px-4 py-2 rounded-lg min-h-[44px]">
                Next
              </Button>
            </div>
          </form>
        )}

        {step === 2 && !createdTeam && (
          <form onSubmit={handleFinalSubmit} className="space-y-6">
            <p className="text-muted-foreground">Your team will be created with a unique invite code. After you tap Done, you can share the link so players and parents can join.</p>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="border-border text-foreground-soft hover:border-primary hover:text-primary min-h-[44px]" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium px-4 py-2 rounded-lg min-h-[44px]" disabled={createTeam.isPending}>
                {createTeam.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Done'}
              </Button>
            </div>
          </form>
        )}

        {createdTeam && (
          <div className="space-y-6">
            <p className="text-muted-foreground">Share these links so coaches and parents can join your team.</p>
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              {familyLink && (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-0.5">Family Link</p>
                    <p className="text-muted-foreground text-xs truncate">{familyLink}</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="flex-shrink-0 border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent min-h-[44px]" onClick={() => copyLink(familyLink, 'Family link copied')}>
                    <Copy className="h-4 w-4 mr-1.5" /> Copy
                  </Button>
                </div>
              )}
              {coachLink && (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-foreground-soft font-semibold uppercase tracking-wider mb-0.5">Coach Link</p>
                    <p className="text-muted-foreground text-xs truncate">{coachLink}</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="flex-shrink-0 border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent min-h-[44px]" onClick={() => copyLink(coachLink, 'Coach link copied')}>
                    <Copy className="h-4 w-4 mr-1.5" /> Copy
                  </Button>
                </div>
              )}
              {leagueLink && (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground/70 font-semibold uppercase tracking-wider mb-0.5">League Link</p>
                    <p className="text-muted-foreground text-xs truncate">{leagueLink}</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="flex-shrink-0 border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent min-h-[44px]" onClick={() => copyLink(leagueLink, 'League link copied — great for stickers & flyers')}>
                    <Copy className="h-4 w-4 mr-1.5" /> Copy
                  </Button>
                </div>
              )}
            </div>
            <Button type="button" className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-medium px-4 py-2 rounded-lg min-h-[44px]" onClick={goToTeam}>
              Go to team
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
