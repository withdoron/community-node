import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UtensilsCrossed, Loader2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

// ═══ Step Indicator ═══

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i + 1 === current
              ? 'w-8 bg-amber-500'
              : i + 1 < current
                ? 'w-2 bg-amber-500/60'
                : 'w-2 bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
}

// ═══ Invite code generator ═══

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 8; i++) code += chars[arr[i] % chars.length];
  return code;
}

// ═══ Constants ═══

const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'none',
];

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const WORKSPACE_FEATURES = [
  'Personal recipe book',
  'Ingredient tracking',
  'Favorites and meal types',
];

// ═══ Main Component ═══

export default function MealPrepOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  // Step 1: Your Kitchen
  const [workspaceName, setWorkspaceName] = useState('My Kitchen');
  const [householdSize, setHouseholdSize] = useState('');

  // Step 2: Preferences
  const [selectedDiets, setSelectedDiets] = useState([]);
  const [skillLevel, setSkillLevel] = useState('beginner');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // ─── Toggle diet tag ────────────────────────────────
  const toggleDiet = (diet) => {
    if (diet === 'none') {
      setSelectedDiets((prev) => (prev.includes('none') ? [] : ['none']));
      return;
    }
    setSelectedDiets((prev) => {
      const without = prev.filter((d) => d !== 'none');
      return without.includes(diet)
        ? without.filter((d) => d !== diet)
        : [...without, diet];
    });
  };

  // ─── Create workspace mutation ────────────────────
  const createWorkspace = useMutation({
    mutationFn: async () => {
      const profile = await base44.entities.MealPrepProfile.create({
        user_id: currentUser.id,
        workspace_name: workspaceName.trim() || 'My Kitchen',
        household_size: parseInt(householdSize) || 1,
        dietary_tags: selectedDiets.length > 0 ? JSON.stringify(selectedDiets) : '[]',
        skill_level: skillLevel || 'beginner',
        favorite_stores: '[]',
        invite_code: generateInviteCode(),
      });
      return profile;
    },
    onSuccess: () => {
      toast.success('Kitchen space created');
      navigate(createPageUrl('MyLane'));
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to create space');
    },
  });

  // ─── Validation ─────────────────────────────────
  const step1Valid = workspaceName.trim().length > 0;

  // ─── Loading gate ─────────────────────────────────
  if (!currentUser?.id) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <UtensilsCrossed className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Create a Meal Prep Space</h1>
            <p className="text-sm text-slate-400">
              {step === 1 && 'Set up your kitchen'}
              {step === 2 && 'Tell us your preferences'}
              {step === 3 && "Your kitchen is ready"}
            </p>
          </div>
        </div>

        <StepIndicator current={step} total={3} />

        {/* ═══ Step 1: Your Kitchen ═══ */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-1">
                Your Kitchen
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Name your kitchen and tell us about your household.
              </p>

              <div className="space-y-4">
                <div>
                  <Label className="text-slate-400">Kitchen name *</Label>
                  <Input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="My Kitchen"
                    autoFocus
                  />
                </div>

                <div>
                  <Label className="text-slate-400">Household size</Label>
                  <Input
                    type="number"
                    min="1"
                    value={householdSize}
                    onChange={(e) => setHouseholdSize(e.target.value)}
                    className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="4"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 min-h-[44px] disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ Step 2: Preferences ═══ */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-1">
                Preferences
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                You can always change these later in Settings.
              </p>

              <div className="space-y-6">
                {/* Dietary tags */}
                <div>
                  <Label className="text-slate-400 mb-3 block">Dietary preferences</Label>
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
                            ? 'bg-amber-500 text-black'
                            : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500'
                        }`}
                      >
                        {diet.charAt(0).toUpperCase() + diet.slice(1)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skill level */}
                <div>
                  <Label className="text-slate-400 mb-3 block">Cooking skill level</Label>
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
                            ? 'bg-amber-500 text-black'
                            : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500'
                        }`}
                      >
                        {level.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 min-h-[44px]"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ Step 3: Your Kitchen is Ready ═══ */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-1">
                Your Kitchen is Ready
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Here's what you've set up.
              </p>

              {/* Summary */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Kitchen</span>
                  <span className="text-slate-100 font-medium">{workspaceName || 'My Kitchen'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Household size</span>
                  <span className="text-slate-100">{householdSize || '1'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Dietary preferences</span>
                  <span className="text-slate-100">
                    {selectedDiets.length > 0
                      ? selectedDiets.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
                      : 'None selected'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Skill level</span>
                  <span className="text-amber-500 font-medium">
                    {skillLevel.charAt(0).toUpperCase() + skillLevel.slice(1)}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-6">
                <p className="text-sm text-slate-300 mb-3">Your space includes:</p>
                <ul className="space-y-2">
                  {WORKSPACE_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-400">
                      <Check className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => createWorkspace.mutate()}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 min-h-[44px]"
                disabled={createWorkspace.isPending}
              >
                {createWorkspace.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create Space'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
