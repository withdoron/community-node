import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Coffee, Zap, Palette, Heart, Music, Wine, Lock, UtensilsCrossed, Salad, TreePine, Check } from "lucide-react";

const VIBES = [
  { id: 'chill', label: 'Chill & Cozy', icon: Coffee, description: 'Relaxed vibes, low-key spots' },
  { id: 'energy', label: 'High Energy', icon: Zap, description: 'Buzzing crowds, late nights' },
  { id: 'artsy', label: 'Intellectual/Artsy', icon: Palette, description: 'Culture, galleries, indie vibes' },
  { id: 'romantic', label: 'Romantic', icon: Heart, description: 'Date nights, intimate settings' }
];

const TASTES = [
  { id: 'live_music', label: 'Live Music', icon: Music },
  { id: 'cocktails', label: 'Craft Cocktails', icon: Wine },
  { id: 'speakeasies', label: 'Hidden Speakeasies', icon: Lock },
  { id: 'street_food', label: 'Street Food', icon: Salad },
  { id: 'fine_dining', label: 'Fine Dining', icon: UtensilsCrossed },
  { id: 'nature', label: 'Nature/Parks', icon: TreePine }
];

const BUDGET_LEVELS = [
  { value: 1, label: '$', description: 'Budget-friendly' },
  { value: 2, label: '$$', description: 'Moderate' },
  { value: 3, label: '$$$', description: 'Upscale' },
  { value: 4, label: '$$$$', description: 'Premium' }
];

export default function BuildLane() {
  const navigate = useNavigate();
  const [vibe, setVibe] = useState(null);
  const [tastes, setTastes] = useState([]);
  const [budget, setBudget] = useState(2);

  const toggleTaste = (tasteId) => {
    setTastes(prev =>
      prev.includes(tasteId)
        ? prev.filter(id => id !== tasteId)
        : [...prev, tasteId]
    );
  };

  const totalSelections = (vibe ? 1 : 0) + tastes.length;
  const canProceed = totalSelections >= 3;

  const handleComplete = () => {
    // Save preferences (could save to user entity)
    console.log({ vibe, tastes, budget });
    
    // Navigate to MyLane
    navigate(createPageUrl('MyLane'));
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-32">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 bg-amber-500/20 rounded-full mb-4">
            <Sparkles className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-4xl font-bold text-slate-100 mb-3">
            Let's Calibrate Your Lane
          </h1>
          <p className="text-slate-400 text-lg">
            Pick what speaks to you. We'll personalize your feed.
          </p>
          <p className="text-amber-500 text-sm mt-2">
            Select at least 3 preferences to continue
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-12">
        {/* Section 1: The Vibe */}
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-1">The Vibe</h2>
          <p className="text-slate-400 text-sm mb-4">Choose one that fits your style</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VIBES.map((vibeOption) => {
              const Icon = vibeOption.icon;
              const isSelected = vibe === vibeOption.id;
              return (
                <button
                  key={vibeOption.id}
                  onClick={() => setVibe(vibeOption.id)}
                  className={`
                    relative p-5 rounded-xl border-2 transition-all duration-200 text-left
                    ${isSelected
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-white/10 bg-slate-900 hover:border-amber-500/50'
                    }
                  `}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 h-6 w-6 bg-amber-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-black" />
                    </div>
                  )}
                  <Icon className={`h-8 w-8 mb-3 ${isSelected ? 'text-amber-500' : 'text-slate-400'}`} />
                  <h3 className={`font-semibold mb-1 ${isSelected ? 'text-amber-500' : 'text-slate-100'}`}>
                    {vibeOption.label}
                  </h3>
                  <p className="text-sm text-slate-400">{vibeOption.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: The Tastes */}
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-1">The Tastes</h2>
          <p className="text-slate-400 text-sm mb-4">Pick all that apply</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TASTES.map((taste) => {
              const Icon = taste.icon;
              const isSelected = tastes.includes(taste.id);
              return (
                <button
                  key={taste.id}
                  onClick={() => toggleTaste(taste.id)}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all duration-200
                    ${isSelected
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-white/10 bg-slate-900 hover:border-amber-500/50'
                    }
                  `}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 h-5 w-5 bg-amber-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-black" />
                    </div>
                  )}
                  <Icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-amber-500' : 'text-slate-400'}`} />
                  <p className={`text-sm font-medium ${isSelected ? 'text-amber-500' : 'text-slate-100'}`}>
                    {taste.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Budget */}
        <div>
          <h2 className="text-xl font-bold text-slate-100 mb-1">Budget</h2>
          <p className="text-slate-400 text-sm mb-6">What's your comfort zone?</p>
          
          <div className="grid grid-cols-4 gap-3">
            {BUDGET_LEVELS.map((level) => {
              const isSelected = budget === level.value;
              return (
                <button
                  key={level.value}
                  onClick={() => setBudget(level.value)}
                  className={`
                    p-4 rounded-xl border-2 transition-all duration-200 text-center
                    ${isSelected
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-white/10 bg-slate-900 hover:border-amber-500/50'
                    }
                  `}
                >
                  <div className={`text-2xl font-bold mb-1 ${isSelected ? 'text-amber-500' : 'text-slate-100'}`}>
                    {level.label}
                  </div>
                  <div className={`text-xs ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                    {level.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selection Counter */}
        <div className="text-center">
          <p className="text-slate-400 text-sm">
            {totalSelections} of 3 minimum selections made
          </p>
        </div>
      </div>

      {/* Sticky Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 p-4 z-50">
        <div className="max-w-3xl mx-auto">
          <Button
            onClick={handleComplete}
            disabled={!canProceed}
            className={`
              w-full py-4 text-lg font-bold rounded-xl transition-all duration-300
              ${canProceed
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg hover:shadow-xl'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            <Sparkles className="h-5 w-5 mr-2 inline" />
            Unlock Magic Planner
          </Button>
        </div>
      </div>
    </div>
  );
}