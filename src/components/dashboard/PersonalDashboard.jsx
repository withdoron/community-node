import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sliders, Heart, Star, Store } from "lucide-react";

export default function PersonalDashboard() {
  const navigate = useNavigate();

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
          <Card className="p-8 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30 hover:border-amber-500/50 transition-all">
            <div className="flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="h-14 w-14 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <Sliders className="h-7 w-7 text-amber-500" />
                </div>
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Recommended
                </Badge>
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">
                Personalize Your Feed
              </h3>
              <p className="text-slate-400 mb-6 flex-1">
                Tailor your experience. Set your interests and local radius.
              </p>
              <Button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                Customize
              </Button>
            </div>
          </Card>

          {/* My Saved Items */}
          <Card className="p-8 bg-slate-900 border-slate-800 hover:border-amber-500/50 transition-all">
            <div className="flex flex-col">
              <div className="h-14 w-14 bg-rose-500/10 rounded-xl flex items-center justify-center mb-4">
                <Heart className="h-7 w-7 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">
                My Saved Items
              </h3>
              <p className="text-slate-400 mb-6 flex-1">
                Access your saved events and favorite businesses.
              </p>
              <Button 
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200"
                onClick={() => navigate(createPageUrl('Directory'))}
              >
                View Saved
              </Button>
            </div>
          </Card>

          {/* Membership Status */}
          <Card className="p-8 bg-slate-900 border-slate-800 hover:border-amber-500/50 transition-all">
            <div className="flex flex-col">
              <div className="h-14 w-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                <Star className="h-7 w-7 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">
                Membership Status
              </h3>
              <p className="text-slate-400 mb-2">
                Current Status: <span className="text-slate-200 font-medium">Local Explorer (Free)</span>
              </p>
              <p className="text-sm text-slate-500 mb-6 flex-1">
                Upgrade for exclusive perks and benefits
              </p>
              <Button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200">
                Upgrade Membership
              </Button>
            </div>
          </Card>

          {/* Host Center */}
          <Card className="p-8 bg-slate-900 border-slate-800 hover:border-amber-500/50 transition-all">
            <div className="flex flex-col">
              <div className="h-14 w-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                <Store className="h-7 w-7 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">
                Host Center
              </h3>
              <p className="text-slate-400 mb-6 flex-1">
                Want to list a business or event?
              </p>
              <Button 
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200"
                onClick={() => navigate(createPageUrl('BusinessOnboarding'))}
              >
                Create Organization
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}