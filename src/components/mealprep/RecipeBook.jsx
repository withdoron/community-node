import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search, Heart, Clock, Plus, ArrowLeft, Edit2, Trash2,
  Loader2, ChefHat, UtensilsCrossed, AlertTriangle,
  BookOpen, Tag, Users as UsersIcon,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import RecipeEditor from './RecipeEditor';

const MEAL_TYPES = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
const DIFFICULTY_OPTIONS = ['All', 'Easy', 'Medium', 'Hard'];

const DIFFICULTY_COLORS = {
  Easy: 'bg-emerald-500/20 text-emerald-400',
  Medium: 'bg-primary/20 text-primary-hover',
  Hard: 'bg-red-500/20 text-red-400',
};

function RecipeBook({ profile, currentUser }) {
  const queryClient = useQueryClient();

  // ── State ──
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // ── Fetch recipes ──
  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.Recipe.list();
      const mine = (Array.isArray(all) ? all : []).filter(
        (r) => String(r.profile_id) === String(profile.id)
      );
      setRecipes(mine);
    } catch (err) {
      console.error('Failed to load recipes:', err);
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredients = async () => {
    try {
      const all = await base44.entities.RecipeIngredient.list();
      setIngredients(Array.isArray(all) ? all : []);
    } catch (err) {
      console.error('Failed to load ingredients:', err);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchRecipes();
      fetchIngredients();
    }
  }, [profile?.id]);

  // ── Filtered recipes ──
  const filteredRecipes = useMemo(() => {
    let list = recipes;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => (r.name || '').toLowerCase().includes(q));
    }
    if (selectedMealType !== 'All') {
      list = list.filter((r) => r.meal_type === selectedMealType);
    }
    if (selectedDifficulty !== 'All') {
      list = list.filter((r) => r.difficulty === selectedDifficulty);
    }
    if (showFavoritesOnly) {
      list = list.filter((r) => r.is_favorite);
    }
    return list;
  }, [recipes, searchQuery, selectedMealType, selectedDifficulty, showFavoritesOnly]);

  // ── Ingredients for selected recipe ──
  const recipeIngredients = useMemo(() => {
    if (!selectedRecipe) return [];
    return ingredients.filter(
      (ing) => String(ing.recipe_id) === String(selectedRecipe.id)
    );
  }, [ingredients, selectedRecipe]);

  // ── Favorite toggle ──
  const favoriteMutation = useMutation({
    mutationFn: async ({ id, current }) => {
      return base44.entities.Recipe.update(id, { is_favorite: !current });
    },
    onSuccess: (_, { id, current }) => {
      setRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_favorite: !current } : r))
      );
      if (selectedRecipe?.id === id) {
        setSelectedRecipe((prev) => ({ ...prev, is_favorite: !current }));
      }
      queryClient.invalidateQueries(['recipes']);
    },
    onError: () => toast.error('Failed to update favorite'),
  });

  // ── Delete recipe ──
  const deleteMutation = useMutation({
    mutationFn: async (recipe) => {
      const recipeIngs = ingredients.filter(
        (ing) => String(ing.recipe_id) === String(recipe.id)
      );
      for (const ing of recipeIngs) {
        await base44.entities.RecipeIngredient.delete(ing.id);
      }
      await base44.entities.Recipe.delete(recipe.id);
      return recipe.id;
    },
    onSuccess: (deletedId) => {
      setRecipes((prev) => prev.filter((r) => r.id !== deletedId));
      setIngredients((prev) =>
        prev.filter((ing) => String(ing.recipe_id) !== String(deletedId))
      );
      setSelectedRecipe(null);
      setConfirmDelete(null);
      queryClient.invalidateQueries(['recipes']);
      toast.success('Recipe deleted');
    },
    onError: () => {
      toast.error('Failed to delete recipe');
      setConfirmDelete(null);
    },
  });

  // ── Editor close handler ──
  const handleEditorClose = (saved) => {
    setShowEditor(false);
    setEditingRecipe(null);
    if (saved) {
      fetchRecipes();
      fetchIngredients();
    }
  };

  // ── Detail View ──
  if (selectedRecipe) {
    return (
      <div className="space-y-6">
        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedRecipe(null)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] min-w-[44px]"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">Back to recipes</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingRecipe(selectedRecipe);
                setShowEditor(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-surface text-foreground-soft transition-colors min-h-[44px]"
            >
              <Edit2 className="h-4 w-4" />
              <span className="text-sm">Edit</span>
            </button>
            <button
              onClick={() => setConfirmDelete(selectedRecipe)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors min-h-[44px]"
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-sm">Delete</span>
            </button>
          </div>
        </div>

        {/* Recipe detail card */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                {selectedRecipe.name}
              </h2>
              {selectedRecipe.description && (
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {selectedRecipe.description}
                </p>
              )}
            </div>
            <button
              onClick={() =>
                favoriteMutation.mutate({
                  id: selectedRecipe.id,
                  current: selectedRecipe.is_favorite,
                })
              }
              className="min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Heart
                className={`h-5 w-5 transition-colors ${
                  selectedRecipe.is_favorite
                    ? 'fill-primary text-primary'
                    : 'text-muted-foreground/70 hover:text-primary'
                }`}
              />
            </button>
          </div>

          {/* Badges + meta */}
          <div className="flex flex-wrap items-center gap-3">
            {selectedRecipe.meal_type && (
              <span className="px-3 py-1 rounded-full bg-secondary text-foreground-soft text-xs font-medium">
                {selectedRecipe.meal_type}
              </span>
            )}
            {selectedRecipe.difficulty && (
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  DIFFICULTY_COLORS[selectedRecipe.difficulty] ||
                  'bg-secondary text-foreground-soft'
                }`}
              >
                {selectedRecipe.difficulty}
              </span>
            )}
            {(selectedRecipe.prep_time || selectedRecipe.cook_time) && (
              <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Clock className="h-3.5 w-3.5" />
                {selectedRecipe.prep_time && (
                  <span>Prep: {selectedRecipe.prep_time} min</span>
                )}
                {selectedRecipe.prep_time && selectedRecipe.cook_time && (
                  <span className="text-muted-foreground/50">|</span>
                )}
                {selectedRecipe.cook_time && (
                  <span>Cook: {selectedRecipe.cook_time} min</span>
                )}
              </span>
            )}
            {selectedRecipe.servings && (
              <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <UsersIcon className="h-3.5 w-3.5" />
                {selectedRecipe.servings} servings
              </span>
            )}
          </div>

          {/* Tags */}
          {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(Array.isArray(selectedRecipe.tags)
                ? selectedRecipe.tags
                : [selectedRecipe.tags]
              ).map((tag, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-secondary text-muted-foreground text-xs"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Ingredients */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider">
              Ingredients
            </h3>
            {recipeIngredients.length > 0 ? (
              <ul className="space-y-1.5">
                {recipeIngredients.map((ing) => (
                  <li
                    key={ing.id}
                    className="flex items-baseline gap-2 text-sm text-foreground-soft"
                  >
                    <span className="text-primary text-xs">--</span>
                    <span>
                      {ing.quantity && (
                        <span className="text-foreground font-medium">
                          {ing.quantity}
                        </span>
                      )}{' '}
                      {ing.unit && (
                        <span className="text-muted-foreground">{ing.unit}</span>
                      )}{' '}
                      {ing.name}
                      {ing.notes && (
                        <span className="text-muted-foreground/70 ml-1">
                          ({ing.notes})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground/70 text-sm">No ingredients listed.</p>
            )}
          </div>

          {/* Instructions */}
          {selectedRecipe.instructions && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider">
                Instructions
              </h3>
              <div className="text-sm text-foreground-soft leading-relaxed whitespace-pre-line">
                {selectedRecipe.instructions}
              </div>
            </div>
          )}

          {/* Notes */}
          {selectedRecipe.notes && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider">
                Notes
              </h3>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line bg-secondary/50 rounded-lg p-4 border border-border/50">
                {selectedRecipe.notes}
              </div>
            </div>
          )}
        </div>

        {/* Delete confirmation */}
        <AlertDialog
          open={!!confirmDelete}
          onOpenChange={() => setConfirmDelete(null)}
        >
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Delete Recipe
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Are you sure you want to delete &quot;{confirmDelete?.name}&quot;?
                This will also remove all ingredients. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-secondary text-foreground-soft border-border hover:bg-surface hover:bg-transparent">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(confirmDelete)}
                className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Editor overlay */}
        {showEditor && (
          <RecipeEditor
            profile={profile}
            currentUser={currentUser}
            recipe={editingRecipe}
            onClose={handleEditorClose}
          />
        )}
      </div>
    );
  }

  // ── Grid View ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Recipe Book</h2>
        </div>
        <button
          onClick={() => {
            setEditingRecipe(null);
            setShowEditor(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-medium transition-colors min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">Add Recipe</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="space-y-3">
        {/* Search + favorites toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card border border-border text-foreground placeholder-muted-foreground/70 text-sm focus:outline-none focus:border-primary/50 min-h-[44px]"
            />
          </div>
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg border transition-colors ${
              showFavoritesOnly
                ? 'bg-primary/10 border-primary/50 text-primary'
                : 'bg-card border-border text-muted-foreground/70 hover:text-foreground-soft'
            }`}
            title="Show favorites only"
          >
            <Heart
              className={`h-5 w-5 ${showFavoritesOnly ? 'fill-primary' : ''}`}
            />
          </button>
        </div>

        {/* Meal type pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
          {MEAL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedMealType(type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[36px] ${
                selectedMealType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Difficulty pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
          <span className="text-xs text-muted-foreground/70 mr-1">Difficulty:</span>
          {DIFFICULTY_OPTIONS.map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[36px] ${
                selectedDifficulty === diff
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredRecipes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <ChefHat className="h-12 w-12 text-slate-700" />
          <div className="text-center space-y-1">
            <p className="text-muted-foreground text-sm">
              {recipes.length === 0
                ? 'No recipes yet. Start building your collection.'
                : 'No recipes match your filters.'}
            </p>
            {recipes.length === 0 && (
              <button
                onClick={() => {
                  setEditingRecipe(null);
                  setShowEditor(true);
                }}
                className="text-primary hover:text-primary-hover text-sm font-medium transition-colors"
              >
                Add your first recipe
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recipe grid */}
      {!loading && filteredRecipes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onSelect={() => setSelectedRecipe(recipe)}
              onToggleFavorite={() =>
                favoriteMutation.mutate({
                  id: recipe.id,
                  current: recipe.is_favorite,
                })
              }
            />
          ))}
        </div>
      )}

      {/* Editor overlay */}
      {showEditor && (
        <RecipeEditor
          profile={profile}
          currentUser={currentUser}
          recipe={editingRecipe}
          onClose={handleEditorClose}
        />
      )}
    </div>
  );
}

// ── Recipe Card ──
function RecipeCard({ recipe, onSelect, onToggleFavorite }) {
  const totalTime =
    (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <div
      onClick={onSelect}
      className="bg-card rounded-xl border border-border hover:border-border p-4 cursor-pointer transition-colors space-y-3"
    >
      {/* Top row: name + favorite */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-foreground font-semibold text-sm leading-snug line-clamp-2">
          {recipe.name}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 -mt-2 shrink-0"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              recipe.is_favorite
                ? 'fill-primary text-primary'
                : 'text-muted-foreground/50 hover:text-primary'
            }`}
          />
        </button>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {recipe.meal_type && (
          <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground-soft text-xs">
            {recipe.meal_type}
          </span>
        )}
        {recipe.difficulty && (
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${
              DIFFICULTY_COLORS[recipe.difficulty] ||
              'bg-secondary text-foreground-soft'
            }`}
          >
            {recipe.difficulty}
          </span>
        )}
      </div>

      {/* Time */}
      {totalTime > 0 && (
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {recipe.prep_time ? `${recipe.prep_time}m prep` : ''}
            {recipe.prep_time && recipe.cook_time ? ' + ' : ''}
            {recipe.cook_time ? `${recipe.cook_time}m cook` : ''}
          </span>
        </div>
      )}
    </div>
  );
}

export default RecipeBook;
