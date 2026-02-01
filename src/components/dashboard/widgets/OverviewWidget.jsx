import React from 'react';
import { Card } from "@/components/ui/card";
import { ThumbsUp, BookOpen, Eye } from "lucide-react";

export default function OverviewWidget({ business }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Recommendations</p>
            <p className="text-3xl font-bold text-white mt-1">
              {business.recommendation_count || business.review_count || 0}
            </p>
          </div>
          <div className="h-12 w-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <ThumbsUp className="h-6 w-6 text-amber-500" />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Stories</p>
            <p className="text-3xl font-bold text-white mt-1">
              {business.story_count || 0}
            </p>
          </div>
          <div className="h-12 w-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-amber-500" />
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Profile Views</p>
            <p className="text-3xl font-bold text-white mt-1">—</p>
          </div>
          <div className="h-12 w-12 bg-slate-800 rounded-lg flex items-center justify-center">
            <Eye className="h-6 w-6 text-slate-400" />
          </div>
        </div>
      </Card>
    </div>
  );
}
