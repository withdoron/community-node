import React from 'react';
import { Card } from "@/components/ui/card";
import { Rocket, Zap, Info } from "lucide-react";
import { format } from 'date-fns';
import { isLocationBoosted } from './locationUtils';

export default function LocationBoostBanner({ location }) {
  if (!location) return null;

  const isBoosted = isLocationBoosted(location);

  // Currently boosted
  if (isBoosted) {
    return (
      <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <div className="flex items-center gap-3">
          <Rocket className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-slate-900">This location is currently boosted!</p>
            <p className="text-sm text-slate-600">
              Expires {format(new Date(location.boost_end_at), 'MMM d, h:mm a')}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Auto-boost enabled but not currently boosted
  if (location.is_auto_boost_enabled) {
    return (
      <Card className="p-4 bg-emerald-50 border-emerald-200">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="font-medium text-slate-900">Auto-Boost is on</p>
            <p className="text-sm text-slate-600">
              We'll boost this location again as soon as it's eligible.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Not boosted, auto-boost off
  return (
    <Card className="p-4 bg-slate-50 border-slate-200">
      <div className="flex items-center gap-3">
        <Info className="h-5 w-5 text-slate-400" />
        <div>
          <p className="font-medium text-slate-900">Boost this location</p>
          <p className="text-sm text-slate-600">
            Move this location higher in search results.
          </p>
        </div>
      </div>
    </Card>
  );
}