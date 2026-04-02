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
      className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <UtensilsCrossed className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-primary">Recipe Book</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[48px]">
          <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : total === 0 ? (
        <div className="min-h-[48px]">
          <p className="text-sm text-muted-foreground/70">No recipes yet</p>
          <p className="text-xs text-muted-foreground/50">Tap to add your first recipe</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-baseline gap-4">
            <div>
              <span className="text-2xl font-bold text-foreground">{total}</span>
              <span className="text-xs text-muted-foreground ml-1">recipe{total !== 1 ? 's' : ''}</span>
            </div>
            {favorites > 0 && (
              <div className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5 text-primary fill-primary" />
                <span className="text-sm text-foreground-soft">{favorites}</span>
              </div>
            )}
          </div>
          {latest && (
            <div className="text-xs text-muted-foreground truncate">
              <span className="text-muted-foreground/70">Latest:</span>{' '}
              <span className="text-foreground-soft">{latest.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
