/**
 * Networks index — DEC-050 Build 3 + DEC-060 living tiles.
 * Route: /networks
 * Auth-gated: networks are private gardens discovered through relationships (DEC-121).
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, ArrowLeft, Sprout } from 'lucide-react';

export default function Networks() {
  const navigate = useNavigate();

  const { data: currentUser, isLoading: authLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  // Not authenticated — redirect to sign in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <Sprout className="h-10 w-10 text-amber-500/60 mx-auto" />
          <h1 className="text-xl font-bold text-white">Sign in to discover networks</h1>
          <p className="text-slate-400 text-sm">
            Networks grow from connections. Sign in and they'll find you.
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

  // Authenticated — show warm discovery message instead of network tiles.
  // Full relationship-based gating comes later when network membership entity exists.
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/MyLane')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-amber-500 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="text-center py-16 space-y-4">
          <Sprout className="h-12 w-12 text-amber-500/40 mx-auto" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
            Networks
          </h1>
          <p className="text-slate-400 max-w-sm mx-auto leading-relaxed">
            Networks are discovered through connections. As you grow in the community, you'll find them — through teammates, neighbors, and the people you already know.
          </p>
          <p className="text-slate-500 text-sm mt-6">
            They're not hidden. They're just quiet until you're ready.
          </p>
        </div>
      </div>
    </div>
  );
}
