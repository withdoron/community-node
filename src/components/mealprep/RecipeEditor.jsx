import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { ArrowLeft, Plus, X } from 'lucide-react';

const inputClass =
  'w-full rounded-md bg-secondary border border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none px-3 py-2 text-sm min-h-[44px]';
const selectClass =
  'w-full rounded-md bg-secondary border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none px-3 py-2 text-sm min-h-[44px] appearance-none';
const textareaClass =
  'w-full rounded-md bg-secondary border border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none px-3 py-2 text-sm min-h-[100px] resize-y';
const labelClass = 'text-foreground-soft text-sm font-medium block mb-1';

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'other', label: 'Other' },
];

const UNIT_OPTIONS = [
  { value: 'cups', label: 'Cups' },
  { value: 'tbsp', label: 'Tbsp' },
  { value: 'tsp', label: 'Tsp' },
  { value: 'oz', label: 'Oz' },
  { value: 'lbs', label: 'Lbs' },
  { value: 'g', label: 'g' },
  { value: 'ml', label: 'ml' },
  { value: 'pieces', label: 'Pieces' },
  { value: 'whole', label: 'Whole' },
  { value: 'pinch', label: 'Pinch' },
  { value: 'to taste', label: 'To Taste' },
];

const CATEGORY_OPTIONS = [
  { value: 'produce', label: 'Produce' },
  { value: 'meat', label: 'Meat' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'spices', label: 'Spices' },
  { value: 'other', label: 'Other' },
];

const EMPTY_INGREDIENT = {
  ingredient_name: '',
  quantity: '',
  unit: 'cups',
  category: 'produce',
  is_optional: false,
};

function parseTags(recipe) {
  if (!recipe?.tags) return '';
  try {
    const parsed = JSON.parse(recipe.tags);
    return Array.isArray(parsed) ? parsed.join(', ') : '';
  } catch {
    return typeof recipe.tags === 'string' ? recipe.tags : '';
  }
}

export default function RecipeEditor({ profile, currentUser, recipe, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const isEdit = !!recipe;

  const [form, setForm] = useState({
    name: '',
    description: '',
    instructions: '',
    prep_time_minutes: '',
    cook_time_minutes: '',
    servings: '',
    difficulty: 'easy',
    meal_type: 'dinner',
    tags: '',
    kid_friendly: false,
    source: '',
    notes: '',
  });

  const [ingredients, setIngredients] = useState([{ ...EMPTY_INGREDIENT }]);

  useEffect(() => {
    if (recipe) {
      setForm({
        name: recipe.name || '',
        description: recipe.description || '',
        instructions: recipe.instructions || '',
        prep_time_minutes: recipe.prep_time_minutes ?? '',
        cook_time_minutes: recipe.cook_time_minutes ?? '',
        servings: recipe.servings ?? '',
        difficulty: recipe.difficulty || 'easy',
        meal_type: recipe.meal_type || 'dinner',
        tags: parseTags(recipe),
        kid_friendly: !!recipe.kid_friendly,
        source: recipe.source || '',
        notes: recipe.notes || '',
      });
    }
  }, [recipe]);

  useEffect(() => {
    if (!recipe?.id) return;
    const loadIngredients = async () => {
      try {
        const all = await base44.entities.RecipeIngredient.list();
        const recipeIngredients = (Array.isArray(all) ? all : [])
          .filter((ri) => String(ri.recipe_id) === String(recipe.id))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        if (recipeIngredients.length > 0) {
          setIngredients(
            recipeIngredients.map((ri) => ({
              ingredient_name: ri.ingredient_name || '',
              quantity: ri.quantity || '',
              unit: ri.unit || 'cups',
              category: ri.category || 'produce',
              is_optional: !!ri.is_optional,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load recipe ingredients:', err);
      }
    };
    loadIngredients();
  }, [recipe?.id]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleIngredientChange = (index, field, value) => {
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addIngredient = () => {
    setIngredients((prev) => [...prev, { ...EMPTY_INGREDIENT }]);
  };

  const removeIngredient = (index) => {
    setIngredients((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const buildRecipePayload = () => {
    const tagsStr = form.tags.trim();
    const tagsJson = tagsStr
      ? JSON.stringify(tagsStr.split(',').map((t) => t.trim()).filter(Boolean))
      : '[]';

    return {
      profile_id: profile.id,
      name: form.name.trim(),
      description: form.description.trim(),
      instructions: form.instructions.trim(),
      prep_time_minutes: form.prep_time_minutes !== '' ? Number(form.prep_time_minutes) : null,
      cook_time_minutes: form.cook_time_minutes !== '' ? Number(form.cook_time_minutes) : null,
      servings: form.servings !== '' ? Number(form.servings) : null,
      difficulty: form.difficulty,
      meal_type: form.meal_type,
      tags: tagsJson,
      kid_friendly: form.kid_friendly,
      source: form.source.trim(),
      notes: form.notes.trim(),
    };
  };

  const createIngredientsForRecipe = async (recipeId) => {
    const validIngredients = ingredients.filter((ing) => ing.ingredient_name.trim());
    for (let i = 0; i < validIngredients.length; i++) {
      const ing = validIngredients[i];
      await base44.entities.RecipeIngredient.create({
        recipe_id: recipeId,
        profile_id: profile.id,
        ingredient_name: ing.ingredient_name.trim(),
        quantity: ing.quantity.trim(),
        unit: ing.unit,
        category: ing.category,
        is_optional: ing.is_optional,
        sort_order: i,
      });
    }
  };

  const deleteExistingIngredients = async (recipeId) => {
    const all = await base44.entities.RecipeIngredient.list();
    const existing = (Array.isArray(all) ? all : []).filter(
      (ri) => String(ri.recipe_id) === String(recipeId)
    );
    for (const ri of existing) {
      await base44.entities.RecipeIngredient.delete(ri.id);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildRecipePayload();

      if (isEdit) {
        await base44.entities.Recipe.update(recipe.id, payload);
        await deleteExistingIngredients(recipe.id);
        await createIngredientsForRecipe(recipe.id);
        return recipe.id;
      } else {
        const newRecipe = await base44.entities.Recipe.create(payload);
        await createIngredientsForRecipe(newRecipe.id);
        return newRecipe.id;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Recipe updated!' : 'Recipe created!');
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-ingredients'] });
      onSaved?.();
      onClose?.();
    },
    onError: (err) => {
      console.error('Failed to save recipe:', err);
      toast.error('Failed to save recipe. Please try again.');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Recipe name is required.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">
            {isEdit ? 'Edit Recipe' : 'Add Recipe'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-foreground font-medium text-base mb-2">Basic Info</h2>

            <div>
              <label className={labelClass}>
                Name <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. Mom's Famous Chili"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className={textareaClass}
                placeholder="Brief description of the recipe..."
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Instructions</label>
              <textarea
                className={textareaClass}
                placeholder="Step-by-step instructions..."
                rows={6}
                value={form.instructions}
                onChange={(e) => handleChange('instructions', e.target.value)}
              />
            </div>
          </div>

          {/* Details */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-foreground font-medium text-base mb-2">Details</h2>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Prep (min)</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="15"
                  min="0"
                  value={form.prep_time_minutes}
                  onChange={(e) => handleChange('prep_time_minutes', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Cook (min)</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="30"
                  min="0"
                  value={form.cook_time_minutes}
                  onChange={(e) => handleChange('cook_time_minutes', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Servings</label>
                <input
                  type="number"
                  className={inputClass}
                  placeholder="4"
                  min="1"
                  value={form.servings}
                  onChange={(e) => handleChange('servings', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Difficulty</label>
                <select
                  className={selectClass}
                  value={form.difficulty}
                  onChange={(e) => handleChange('difficulty', e.target.value)}
                >
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Meal Type</label>
                <select
                  className={selectClass}
                  value={form.meal_type}
                  onChange={(e) => handleChange('meal_type', e.target.value)}
                >
                  {MEAL_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Tags</label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. gluten-free, quick, family"
                value={form.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
              />
              <p className="text-muted-foreground/70 text-xs mt-1">Comma-separated</p>
            </div>

            <div>
              <label className={labelClass}>Kid Friendly</label>
              <button
                type="button"
                onClick={() => handleChange('kid_friendly', !form.kid_friendly)}
                className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  form.kid_friendly
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary border border-border text-muted-foreground hover:border-border'
                }`}
              >
                {form.kid_friendly ? 'Yes' : 'No'}
              </button>
            </div>

            <div>
              <label className={labelClass}>Source</label>
              <input
                type="text"
                className={inputClass}
                placeholder="URL or book name"
                value={form.source}
                onChange={(e) => handleChange('source', e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea
                className={textareaClass}
                placeholder="Any additional notes..."
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
            </div>
          </div>

          {/* Ingredients */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-foreground font-medium text-base">Ingredients</h2>
              <button
                type="button"
                onClick={addIngredient}
                className="min-h-[44px] px-3 py-2 rounded-lg bg-secondary border border-border text-primary hover:border-primary transition-colors flex items-center gap-1.5 text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Add Ingredient
              </button>
            </div>

            <div className="space-y-3">
              {ingredients.map((ing, index) => (
                <div
                  key={index}
                  className="bg-secondary/50 rounded-lg p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground/70 text-xs font-medium">
                      #{index + 1}
                    </span>
                    {ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-surface transition-colors"
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="Ingredient name"
                        value={ing.ingredient_name}
                        onChange={(e) =>
                          handleIngredientChange(index, 'ingredient_name', e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="Qty (e.g. 2)"
                        value={ing.quantity}
                        onChange={(e) =>
                          handleIngredientChange(index, 'quantity', e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <select
                        className={selectClass}
                        value={ing.unit}
                        onChange={(e) =>
                          handleIngredientChange(index, 'unit', e.target.value)
                        }
                      >
                        {UNIT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        className={selectClass}
                        value={ing.category}
                        onChange={(e) =>
                          handleIngredientChange(index, 'category', e.target.value)
                        }
                      >
                        {CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleIngredientChange(index, 'is_optional', !ing.is_optional)
                        }
                        className={`min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full ${
                          ing.is_optional
                            ? 'bg-primary/20 text-primary border border-primary/40'
                            : 'bg-secondary border border-border text-muted-foreground hover:border-border'
                        }`}
                      >
                        {ing.is_optional ? 'Optional' : 'Required'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] rounded-lg border border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex-1 min-h-[44px] rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saveMutation.isPending
                ? 'Saving...'
                : isEdit
                  ? 'Update Recipe'
                  : 'Save Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
