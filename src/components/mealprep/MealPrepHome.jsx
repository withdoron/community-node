import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Heart, Clock, Plus, Loader2 } from 'lucide-react';
import WorkspaceGuide from '@/components/workspaces/WorkspaceGuide';

const fmtShortDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + (d.includes('T') ? '' : 'T12:00:00'));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function MealPrepHome({ profile, currentUser, onNavigateTab }) {
  // ─── Query: Recipes ─────────────────────────────
  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['mealprep-recipes', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const all = await base44.entities.Recipe.list();
        return (Array.isArray(all) ? all : []).filter(
          (r) => String(r.profile_id) === String(profile.id)
        );
      } catch {
        return [];
      }
    },
    enabled: !!profile?.id,
  });

  // ─── Derived Stats ──────────────────────────────
  const favorites = useMemo(
    () => recipes.filter((r) => r.is_favorite),
    [recipes]
  );

  const recentRecipes = useMemo(
    () =>
      [...recipes]
        .sort((a, b) => {
          const da = a.created_date || '';
          const db = b.created_date || '';
          return db.localeCompare(da);
        })
        .slice(0, 3),
    [recipes]
  );

  // ─── Loading State ──────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  // ─── Empty State ────────────────────────────────
  if (recipes.length === 0) {
    return (
      <div className="space-y-6">
        <WorkspaceGuide
          workspaceType="meal_prep"
          profile={profile}
          onNavigateTab={onNavigateTab}
        />

        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <BookOpen className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">
            Your recipe book is empty
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Add your first recipe to get started.
          </p>
          <button
            type="button"
            onClick={() => onNavigateTab?.('recipes')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors text-sm min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            Add Recipe
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────
  return (
    <div className="space-y-6">
      <WorkspaceGuide
        workspaceType="meal_prep"
        profile={profile}
        onNavigateTab={onNavigateTab}
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Recipes</span>
          </div>
          <p className="text-2xl font-bold text-primary">{recipes.length}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Favorites</span>
          </div>
          <p className="text-2xl font-bold text-primary">{favorites.length}</p>
        </div>
      </div>

      {/* Quick Action */}
      <button
        type="button"
        onClick={() => onNavigateTab?.('recipes')}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors text-sm min-h-[44px]"
      >
        <Plus className="h-4 w-4" />
        Add Recipe
      </button>

      {/* Recently Added */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Recently Added</h2>
          </div>
          {recipes.length > 3 && (
            <button
              type="button"
              onClick={() => onNavigateTab?.('recipes')}
              className="text-xs text-primary hover:text-primary-hover"
            >
              View all
            </button>
          )}
        </div>

        <div className="space-y-3">
          {recentRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-secondary/50 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {recipe.name || 'Untitled Recipe'}
                </p>
                {recipe.created_date && (
                  <span className="text-xs text-muted-foreground/70 flex-shrink-0 ml-2">
                    {fmtShortDate(recipe.created_date)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mt-2">
                {recipe.meal_type && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                    {recipe.meal_type}
                  </span>
                )}
                {(recipe.prep_time || recipe.cook_time) && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {[
                      recipe.prep_time ? `${recipe.prep_time}m prep` : null,
                      recipe.cook_time ? `${recipe.cook_time}m cook` : null,
                    ]
                      .filter(Boolean)
                      .join(' + ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
