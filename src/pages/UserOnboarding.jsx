import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Heart, Loader2, ChevronRight, Mail } from 'lucide-react';
import { userOnboardingConfig } from '@/config/userOnboardingConfig';
import { useConfig } from '@/hooks/useConfig';

const ONBOARDING_STORAGE_KEY = 'locallane_onboarding_shown';

const activeSteps = userOnboardingConfig.steps.filter((s) => s.active);

export default function UserOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stepIndex, setStepIndex] = useState(0);
  const [networkInterests, setNetworkInterests] = useState([]);
  const [communityPassInterest, setCommunityPassInterest] = useState(null);
  const [displayName, setDisplayName] = useState('');

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: networksConfig = [] } = useConfig('platform', 'networks');
  const networks = useMemo(
    () => Array.isArray(networksConfig) ? networksConfig.filter((n) => n.active !== false) : [],
    [networksConfig]
  );

  const updateUserMutation = useMutation({
    mutationFn: async (payload) => {
      if (!currentUser?.id) throw new Error('No user');
      const data = {
        onboarding_complete: payload.onboarding_complete,
        network_interests: payload.network_interests ?? [],
        community_pass_interest: payload.community_pass_interest ?? null,
        newsletter_interest: payload.newsletter_interest ?? false,
      };
      if (payload.full_name != null && payload.full_name.trim() !== '') {
        data.full_name = payload.full_name.trim();
      }
      if (payload.display_name != null && payload.display_name.trim() !== '') {
        data.display_name = payload.display_name.trim();
      }
      await base44.functions.invoke('updateUser', {
        action: 'update_onboarding',
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
    },
  });

  const markCompleteAndGo = (payload) => {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {}
    updateUserMutation.mutate(payload, {
      onSettled: () => navigate(createPageUrl('MyLane')),
    });
  };

  const handleSkip = () => {
    markCompleteAndGo({
      onboarding_complete: true,
      network_interests: [],
      community_pass_interest: null,
      newsletter_interest: false,
      full_name: displayName.trim() || undefined,
      display_name: displayName.trim() || undefined,
    });
  };

  const handleFinish = () => {
    markCompleteAndGo({
      onboarding_complete: true,
      network_interests: networkInterests,
      community_pass_interest: communityPassInterest,
      newsletter_interest: newsletterInterest,
      full_name: displayName.trim() || undefined,
      display_name: displayName.trim() || undefined,
    });
  };

  const currentStepId = activeSteps[stepIndex]?.id;

  if (userLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Progress dots */}
      <div className="pt-6 pb-2 px-4">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-2">
          {activeSteps.map((step, idx) => (
            <div
              key={step.id}
              className={`h-2 w-2 rounded-full transition-colors ${
                idx <= stepIndex ? 'bg-amber-500' : 'bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Step 1: Welcome */}
        {currentStepId === 'welcome' && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-amber-500">Local Lane</h1>
              <h2 className="text-xl font-bold text-slate-100 mt-4">Welcome to Local Lane</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg flex gap-3">
                <MapPin className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-100">Discover Local</h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Find businesses, events, and activities in your community — all in one place.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg flex gap-3">
                <Users className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-100">Connect & Participate</h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    RSVP to events, recommend businesses you love, and join community networks.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg flex gap-3">
                <Heart className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-slate-100">Support Local</h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Every interaction strengthens the local economy. Your participation matters.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                What should we call you?
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your first name"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => setStepIndex(1)}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium py-3 rounded-lg transition-colors"
              >
                Get Started
                <ChevronRight className="h-4 w-4 ml-1 inline" />
              </Button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={updateUserMutation.isPending}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Network interests */}
        {currentStepId === 'networks' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">What interests you?</h2>
              <p className="text-slate-400 text-sm mt-1">
                Follow the networks that match your family. You&apos;ll see events and updates tailored to your interests.
              </p>
              <p className="text-slate-500 text-sm mt-1">You can change these anytime from your dashboard.</p>
            </div>
            {networks.length === 0 ? (
              <p className="text-slate-500 text-sm py-4">No networks available right now. You can add interests later from MyLane.</p>
            ) : (
              <div className="space-y-3">
                {networks.map((net) => {
                  const value = net.value ?? net.slug ?? net.id;
                  const label = net.label ?? net.name ?? value;
                  const description = net.description;
                  const isSelected = networkInterests.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setNetworkInterests((prev) =>
                          prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
                        );
                      }}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-700 bg-slate-800 hover:border-amber-500/50'
                      }`}
                    >
                      <h3 className="font-semibold text-slate-100">{label}</h3>
                      {description && (
                        <p className="text-sm text-slate-400 mt-1">{description}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => setStepIndex(2)}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium py-3 rounded-lg transition-colors"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1 inline" />
              </Button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={updateUserMutation.isPending}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Community Pass */}
        {currentStepId === 'community_pass' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Community Pass</h2>
              <p className="text-slate-400 text-sm mt-1">
                We&apos;re building a community membership that gives your family access to local activities, events, and experiences — all for one simple monthly membership.
              </p>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <p>Monthly Joy Coins to spend at participating businesses.</p>
              <p>Access to member-only events and network activities.</p>
              <p>Support local businesses and youth scholarships with every membership.</p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setCommunityPassInterest('yes')}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  communityPassInterest === 'yes'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }`}
              >
                <span className="font-semibold text-slate-100">Yes, I&apos;m interested!</span>
              </button>
              <button
                type="button"
                onClick={() => setCommunityPassInterest('maybe_later')}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  communityPassInterest === 'maybe_later'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }`}
              >
                <span className="font-semibold text-slate-100">Maybe later</span>
              </button>
            </div>

            {/* Stay Connected — The Good News newsletter */}
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-3">
              <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                <Mail className="h-5 w-5 text-amber-500 shrink-0" />
                Stay Connected
              </h3>
              <p className="text-sm text-slate-400">
                Get community wins, new features, and local stories delivered to your inbox.
              </p>
              <button
                type="button"
                onClick={() => setNewsletterInterest((prev) => !prev)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors flex items-center gap-3 ${
                  newsletterInterest
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700 bg-slate-800 hover:border-amber-500/50'
                }`}
              >
                <span className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                  newsletterInterest ? 'border-amber-500 bg-amber-500' : 'border-slate-500 bg-transparent'
                }`}>
                  {newsletterInterest && (
                    <span className="text-white text-[10px] font-bold">✓</span>
                  )}
                </span>
                <span className="font-semibold text-slate-100">Subscribe to The Good News</span>
              </button>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleFinish}
                disabled={updateUserMutation.isPending}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-medium py-3 rounded-lg transition-colors"
              >
                {updateUserMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  <>
                    Finish
                    <ChevronRight className="h-4 w-4 ml-1 inline" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
