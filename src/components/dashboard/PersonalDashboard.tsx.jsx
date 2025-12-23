import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Store, Calendar, Heart } from "lucide-react";

export default function PersonalDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Personal Dashboard</h1>
        <p className="text-slate-600 mb-8">Welcome! You don't have any business associations yet.</p>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(createPageUrl('BusinessOnboarding'))}>
            <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
              <Store className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">List Your Business</h3>
            <p className="text-sm text-slate-600">Create a business profile and start reaching local customers.</p>
            <Button className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-slate-900">
              Get Started
            </Button>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(createPageUrl('Events'))}>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Browse Events</h3>
            <p className="text-sm text-slate-600">Discover local events and activities in your area.</p>
            <Button variant="outline" className="mt-4 w-full">
              View Events
            </Button>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(createPageUrl('Search'))}>
            <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <Heart className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Saved Businesses</h3>
            <p className="text-sm text-slate-600">View your favorite local businesses.</p>
            <Button variant="outline" className="mt-4 w-full">
              View Saved
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}