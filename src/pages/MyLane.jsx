import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ThumbsUp, Users } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useUserState } from '@/hooks/useUserState';
import { useRole } from '@/hooks/useRole';
import GreetingHeader from '@/components/mylane/GreetingHeader';
import MyNetworksSection from '@/components/mylane/MyNetworksSection';
import UpcomingEventsSection from '@/components/mylane/UpcomingEventsSection';
import HappeningSoonSection from '@/components/mylane/HappeningSoonSection';
import NewInCommunitySection from '@/components/mylane/NewInCommunitySection';
import YourRecommendationsSection from '@/components/mylane/YourRecommendationsSection';
import DiscoverSection from '@/components/mylane/DiscoverSection';
import SectionWrapper from '@/components/mylane/SectionWrapper';
import { JoyCoinsCard } from '@/components/mylane/JoyCoinsCard';

export default function MyLane() {
  const queryClient = useQueryClient();
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    }
  });

  const { recommendations, joyCoins } = useUserState(currentUser?.id);
  const { isAppAdmin } = useRole();

  const handleNetworksUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
  };

  if (!userLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-100 mb-3">Welcome to MyLane</h1>
          <p className="text-slate-400 mb-6">Sign in to see your personalized community dashboard.</p>
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

  // Onboarding redirect for new users
  const ONBOARDING_STORAGE_KEY = 'locallane_onboarding_shown';
  if (currentUser && !localStorage.getItem(ONBOARDING_STORAGE_KEY)) {
    return <Navigate to={createPageUrl('welcome')} replace />;
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        <GreetingHeader currentUser={currentUser} joyCoins={joyCoins} />
        {isAppAdmin && <JoyCoinsCard />}
        <MyNetworksSection currentUser={currentUser} onUpdate={handleNetworksUpdate} />
        {isAppAdmin && (
          <SectionWrapper title="My Household" seeAllPage="Settings">
            <div className="py-6 text-center bg-slate-900 border border-slate-800 rounded-xl">
              <Users className="h-10 w-10 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Add family members to quickly select them when RSVPing</p>
            </div>
          </SectionWrapper>
        )}
        <UpcomingEventsSection currentUser={currentUser} />
        <HappeningSoonSection />
        <NewInCommunitySection />
        {recommendations.length > 0 ? (
          <YourRecommendationsSection recommendations={recommendations} />
        ) : (
          <SectionWrapper title="Your Recommendations" seeAllPage="Directory">
            <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-xl">
              <ThumbsUp className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">You haven&apos;t recommended any businesses yet</p>
              <p className="text-sm text-slate-500 mt-1">Discover local spots and share your experience.</p>
              <Link
                to={createPageUrl('Directory')}
                className="mt-4 inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
              >
                Browse Directory
                <span aria-hidden>→</span>
              </Link>
            </div>
          </SectionWrapper>
        )}
        <DiscoverSection />
      </div>
    </div>
  );
}
