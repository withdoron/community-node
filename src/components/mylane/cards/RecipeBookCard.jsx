import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { UtensilsCrossed, Heart, Clock } from 'lucide-react';

export default function RecipeBookCard({ profile, onClick }) {
  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const all = await base44.entities.Recipe.list();
      return (Array.isArray(all) ? all : []).filter(
        (r) => String(r.profile_id) === String(profile.id)
      );
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
  });

  const total = recipes.length;
  const favorites = recipes.filter((r) => r.is_favorite).length;
  const latest = recipes.length > 0
    ? [...recipes].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))[0]
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-amber-500/30 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <UtensilsCrossed className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-medium text-amber-500">Recipe Book</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[48px]">
          <div className="animate-spin h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full" />
        </div>
      ) : total === 0 ? (
        <div className="min-h-[48px]">
          <p className="text-sm text-slate-500">No recipes yet</p>
          <p className="text-xs text-slate-600">Tap to add your first recipe</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline gap-4">
            <div>
              <span className="text-2xl font-bold text-slate-100">{total}</span>
              <span className="text-xs text-slate-400 ml-1">recipe{total !== 1 ? 's' : ''}</span>
            </div>
            {favorites > 0 && (
              <div className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span className="text-sm text-slate-300">{favorites}</span>
              </div>
            )}
          </div>
          {latest && (
            <div className="text-xs text-slate-400 truncate">
              <span className="text-slate-500">Latest:</span>{' '}
              <span className="text-slate-300">{latest.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
