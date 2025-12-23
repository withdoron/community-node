import React from 'react';
import { Card } from "@/components/ui/card";
import { Star, Eye, MessageSquare, TrendingUp } from "lucide-react";

interface OverviewWidgetProps {
  business: any;
}

export default function OverviewWidget({ business }: OverviewWidgetProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Average Rating</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              {business.average_rating?.toFixed(1) || '0.0'}
            </p>
          </div>
          <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
            <Star className="h-6 w-6 text-amber-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Total Reviews</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              {business.review_count || 0}
            </p>
          </div>
          <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Profile Views</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              {business.views_last_7_days || 0}
            </p>
          </div>
          <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Eye className="h-6 w-6 text-emerald-600" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Boost Credits</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">
              {(business.boost_credits_this_period || 0) - (business.boosts_used_this_period || 0)}
            </p>
          </div>
          <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </Card>
    </div>
  );
}