import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sliders, Heart, Star, Store, X } from "lucide-react";

export default function PersonalDashboard() {
  const navigate = useNavigate();
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [interests, setInterests] = useState({
    liveMusic: false,
    foodDrink: false,
    artCulture: false,
    workshops: false
  });
  const [radius, setRadius] = useState(25);

  const toggleInterest = (key) => {
    setInterests(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const savePreferences = () => {
    // TODO: Save to backend or local storage
    setIsCustomizeOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-100 mb-3">
            Welcome to Your Dashboard
          </h1>
          <p className="text-slate-400 text-lg">
            Personalize your experience and discover what matters to you
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Personalize Your Feed - Primary CTA */}
          <Card 
            className="group p-8 bg-slate-900 border border-amber-500/30 hover:border-amber-500 hover:bg-slate-800 transition-all duration-300 cursor-pointer"
            onClick={() => setIsCustomizeOpen(true)}
          >
            <div className="flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="h-14 w-14 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <Sliders className="h-7 w-7 text-amber-500 group-hover:text-amber-500" />
                </div>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Recommended
                </Badge>
              </div>
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-amber-500 mb-2 transition-colors">
                Personalize Your Feed
              </h3>
              <p className="text-slate-400 mb-6 flex-1">
                Tailor your experience. Set your interests and local radius.
              </p>
              <div className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2 rounded-lg text-center">
                Customize
              </div>
            </div>
          </Card>

          {/* My Saved Items */}
          <Card 
            className="group p-8 bg-slate-900 border border-white/10 hover:border-amber-500 hover:bg-slate-800 transition-all duration-300 cursor-pointer"
            onClick={() => navigate(createPageUrl('Directory'))}
          >
            <div className="flex flex-col">
              <div className="h-14 w-14 bg-white/5 rounded-xl flex items-center justify-center mb-4">
                <Heart className="h-7 w-7 text-amber-500 group-hover:text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-amber-500 mb-2 transition-colors">
                My Saved Items
              </h3>
              <p className="text-slate-400 mb-6 flex-1">
                Access your saved events and favorite businesses.
              </p>
              <div className="w-full bg-white/5 border border-white/10 hover:border-amber-500 hover:text-amber-500 text-white transition-all duration-300 py-2 rounded-lg text-center font-medium">
                View Saved
              </div>
            </div>
          </Card>

          {/* Membership Status */}
          <Card 
            className="group p-8 bg-slate-900 border border-white/10 hover:border-amber-500 hover:bg-slate-800 transition-all duration-300 cursor-pointer"
            onClick={() => navigate(createPageUrl('Home'))}
          >
            <div className="flex flex-col">
              <div className="h-14 w-14 bg-white/5 rounded-xl flex items-center justify-center mb-4">
                <Star className="h-7 w-7 text-amber-500 group-hover:text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-amber-500 mb-2 transition-colors">
                Membership Status
              </h3>
              <p className="text-slate-400 mb-2">
                Current Status: <span className="text-slate-200 font-medium">Local Explorer (Free)</span>
              </p>
              <p className="text-sm text-slate-500 mb-6 flex-1">
                Upgrade for exclusive perks and benefits
              </p>
              <div className="w-full bg-white/5 border border-white/10 hover:border-amber-500 hover:text-amber-500 text-white transition-all duration-300 py-2 rounded-lg text-center font-medium">
                Upgrade Membership
              </div>
            </div>
          </Card>

          {/* Host Center */}
          <Card 
            className="group p-8 bg-slate-900 border border-white/10 hover:border-amber-500 hover:bg-slate-800 transition-all duration-300 cursor-pointer"
            onClick={() => navigate(createPageUrl('BusinessOnboarding'))}
          >
            <div className="flex flex-col">
              <div className="h-14 w-14 bg-white/5 rounded-xl flex items-center justify-center mb-4">
                <Store className="h-7 w-7 text-amber-500 group-hover:text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 group-hover:text-amber-500 mb-2 transition-colors">
                Host Center
              </h3>
              <p className="text-slate-400 mb-6 flex-1">
                Want to list a business or event?
              </p>
              <div className="w-full bg-white/5 border border-white/10 hover:border-amber-500 hover:text-amber-500 text-white transition-all duration-300 py-2 rounded-lg text-center font-medium">
                Create Organization
              </div>
            </div>
          </Card>
        </div>

        {/* Preferences Modal */}
        {isCustomizeOpen && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsCustomizeOpen(false)}
          >
            <div 
              className="bg-slate-900 border border-amber-500/20 rounded-xl shadow-2xl w-full max-w-md p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Customize Your Feed</h2>
                <button
                  onClick={() => setIsCustomizeOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-6">
                {/* Interests Section */}
                <div>
                  <label className="text-sm font-semibold text-slate-300 mb-3 block">
                    Interests
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={interests.liveMusic}
                        onCheckedChange={() => toggleInterest('liveMusic')}
                        className="accent-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                      <span className="text-white">Live Music</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={interests.foodDrink}
                        onCheckedChange={() => toggleInterest('foodDrink')}
                        className="accent-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                      <span className="text-white">Food & Drink</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={interests.artCulture}
                        onCheckedChange={() => toggleInterest('artCulture')}
                        className="accent-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                      <span className="text-white">Art & Culture</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox
                        checked={interests.workshops}
                        onCheckedChange={() => toggleInterest('workshops')}
                        className="accent-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                      <span className="text-white">Workshops</span>
                    </label>
                  </div>
                </div>

                {/* Distance Section */}
                <div>
                  <label className="text-sm font-semibold text-slate-300 mb-3 block">
                    Distance: {radius} miles
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>5 mi</span>
                    <span>50 mi</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6">
                <Button
                  onClick={savePreferences}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-2 rounded-lg"
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}