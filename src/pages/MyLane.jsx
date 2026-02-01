import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useUserState } from '@/hooks/useUserState';
import GreetingHeader from '@/components/mylane/GreetingHeader';
import UpcomingEventsSection from '@/components/mylane/UpcomingEventsSection';
import HappeningSoonSection from '@/components/mylane/HappeningSoonSection';
import NewInCommunitySection from '@/components/mylane/NewInCommunitySection';
import YourRecommendationsSection from '@/components/mylane/YourRecommendationsSection';
import DiscoverSection from '@/components/mylane/DiscoverSection';

export default function MyLane() {
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    }
  });

  const { recommendations, punchPass } = useUserState(currentUser?.id);

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
        <GreetingHeader currentUser={currentUser} punchPass={punchPass} />
        <UpcomingEventsSection currentUser={currentUser} />
        <HappeningSoonSection />
        <NewInCommunitySection />
        {recommendations.length > 0 && (
          <YourRecommendationsSection recommendations={recommendations} />
        )}
        <DiscoverSection />
      </div>
    </div>
  );
}
