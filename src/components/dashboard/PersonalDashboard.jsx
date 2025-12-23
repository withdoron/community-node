import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Rocket, Calendar, Heart } from "lucide-react";

export default function PersonalDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Personal Dashboard</h1>
        <p className="text-slate-400 mb-8">Welcome! You don't have any business associations yet.</p>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer" onClick={() => navigate(createPageUrl('BusinessOnboarding'))}>
            <div className="h-12 w-12 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4">
              <Rocket className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-slate-100">Start Hosting & Earning</h3>
            <p className="text-sm text-slate-400 mb-4">Launch a profile for your business, event group, or personal brand. Manage tickets, staff, and analytics in one place.</p>
            <Button className="mt-4 w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold">
              Create Organization
            </Button>
          </Card>

          <Card className="p-6 bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer" onClick={() => navigate(createPageUrl('Events'))}>
            <div className="h-12 w-12 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-slate-100">Browse Events</h3>
            <p className="text-sm text-slate-400 mb-4">Discover local events and activities in your area.</p>
            <Button className="mt-4 w-full bg-slate-800 text-slate-200 font-medium border border-transparent hover:border-amber-500 hover:text-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all duration-300">
              View Events
            </Button>
          </Card>

          <Card className="p-6 bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer" onClick={() => navigate(createPageUrl('Search'))}>
            <div className="h-12 w-12 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4">
              <Heart className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-slate-100">Saved Businesses</h3>
            <p className="text-sm text-slate-400 mb-4">View your favorite local businesses.</p>
            <Button className="mt-4 w-full bg-slate-800 text-slate-200 font-medium border border-transparent hover:border-amber-500 hover:text-amber-400 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all duration-300">
              View Saved
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}