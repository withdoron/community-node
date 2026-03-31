import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import IdeasBoard from '@/components/dashboard/IdeasBoard';
import { Loader2, Sprout } from 'lucide-react';

export default function ShapingTheGarden() {
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <Sprout className="h-10 w-10 text-amber-500/60 mx-auto" />
          <h1 className="text-xl font-bold text-white">Sign in to shape the garden</h1>
          <p className="text-slate-400 text-sm">
            Ideas grow from community. Sign in to plant yours.
          </p>
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="mt-4 bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <IdeasBoard currentUser={currentUser} />
    </div>
  );
}
