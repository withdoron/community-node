import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Save, Loader2, AlertTriangle, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

// ═══ Constants (same as onboarding) ═══

const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
];

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

// ═══ Helpers ═══

function parseJsonArray(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseStoresString(val) {
  const arr = parseJsonArray(val);
  return arr.length > 0 ? arr.join(', ') : '';
}

// ═══ Main Component ═══

export default function MealPrepSettings({ profile, currentUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ─── State (pre-filled from profile) ────────────────
  const [workspaceName, setWorkspaceName] = useState(profile?.workspace_name || 'My Kitchen');
  const [householdSize, setHouseholdSize] = useState(
    profile?.household_size?.toString() || '1'
  );
  const [selectedDiets, setSelectedDiets] = useState(() => parseJsonArray(profile?.dietary_tags));
  const [skillLevel, setSkillLevel] = useState(profile?.skill_level || 'beginner');
  const [favoriteStores, setFavoriteStores] = useState(() => parseStoresString(profile?.favorite_stores));

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // ─── Toggle diet tag ────────────────────────────────
  const toggleDiet = (diet) => {
    setSelectedDiets((prev) =>
      prev.includes(diet)
        ? prev.filter((d) => d !== diet)
        : [...prev, diet]
    );
  };

  // ─── Save mutation ──────────────────────────────────
  const saveSettings = useMutation({
    mutationFn: () => {
      const storesArray = favoriteStores
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      return base44.entities.MealPrepProfile.update(profile.id, {
        workspace_name: workspaceName.trim() || 'My Kitchen',
        household_size: parseInt(householdSize) || 1,
        dietary_tags: JSON.stringify(selectedDiets),
        skill_level: skillLevel,
        favorite_stores: JSON.stringify(storesArray),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealprep-profiles'] });
      toast.success('Settings saved');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save settings'),
  });

  // ─── Delete workspace mutation ──────────────────────
  const deleteWorkspace = useMutation({
    mutationFn: async () => {
      // 1. Delete all RecipeIngredients belonging to this profile's recipes
      const allIngredients = await base44.entities.RecipeIngredient.list();
      const allRecipes = await base44.entities.Recipe.list();
      const profileRecipes = (Array.isArray(allRecipes) ? allRecipes : []).filter(
        (r) => String(r.profile_id) === String(profile.id)
      );
      const recipeIds = new Set(profileRecipes.map((r) => String(r.id)));

      const profileIngredients = (Array.isArray(allIngredients) ? allIngredients : []).filter(
        (ing) => recipeIds.has(String(ing.recipe_id))
      );

      for (const ing of profileIngredients) {
        await base44.entities.RecipeIngredient.delete(ing.id);
      }

      // 2. Delete all Recipes
      for (const recipe of profileRecipes) {
        await base44.entities.Recipe.delete(recipe.id);
      }

      // 3. Delete the MealPrepProfile
      await base44.entities.MealPrepProfile.delete(profile.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mealprep-profiles'] });
      toast.success('Workspace deleted');
      navigate(createPageUrl('MyLane'));
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete workspace'),
  });

  // ─── Render ─────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Section: General */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">General</h2>

        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Kitchen name</Label>
            <Input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
              placeholder="My Kitchen"
            />
          </div>

          <div>
            <Label className="text-muted-foreground">Household size</Label>
            <Input
              type="number"
              min="1"
              value={householdSize}
              onChange={(e) => setHouseholdSize(e.target.value)}
              className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
              placeholder="4"
            />
          </div>

          <div>
            <Label className="text-muted-foreground">Favorite stores (comma-separated)</Label>
            <Input
              value={favoriteStores}
              onChange={(e) => setFavoriteStores(e.target.value)}
              className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
              placeholder="Market of Choice, WinCo, Trader Joe's"
            />
          </div>
        </div>
      </div>

      {/* Section: Preferences */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Preferences</h2>

        <div className="space-y-6">
          {/* Dietary tags */}
          <div>
            <Label className="text-muted-foreground mb-3 block">Dietary preferences</Label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((diet) => (
                <div
                  key={diet}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleDiet(diet)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleDiet(diet);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all select-none ${
                    selectedDiets.includes(diet)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary border border-border text-foreground-soft hover:border-primary hover:text-primary'
                  }`}
                >
                  {diet.charAt(0).toUpperCase() + diet.slice(1)}
                </div>
              ))}
            </div>
          </div>

          {/* Skill level */}
          <div>
            <Label className="text-muted-foreground mb-3 block">Cooking skill level</Label>
            <div className="grid grid-cols-3 gap-3">
              {SKILL_LEVELS.map((level) => (
                <div
                  key={level.value}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSkillLevel(level.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSkillLevel(level.value);
                    }
                  }}
                  className={`p-4 rounded-xl text-center text-sm font-medium cursor-pointer transition-all select-none ${
                    skillLevel === level.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary border border-border text-foreground-soft hover:border-primary hover:text-primary'
                  }`}
                >
                  {level.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveSettings.mutate()}
          disabled={saveSettings.isPending}
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold min-h-[44px]"
        >
          {saveSettings.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <p className="text-sm font-medium text-red-400">Danger Zone</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Permanently delete this workspace and all its data. This cannot be undone.
        </p>
        <Button
          variant="outline"
          onClick={() => setDeleteDialogOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-foreground border-red-600 hover:border-red-700 min-h-[44px]"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Workspace
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Delete Meal Prep Workspace?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete your kitchen, all recipes, and all ingredients.
              Type <span className="text-red-400 font-mono">delete</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            placeholder='Type "delete" to confirm'
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-foreground-soft hover:bg-secondary">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWorkspace.mutate()}
              disabled={deleteConfirmText !== 'delete' || deleteWorkspace.isPending}
              className="bg-red-600 hover:bg-red-500 text-foreground disabled:opacity-50"
            >
              {deleteWorkspace.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete Forever'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
