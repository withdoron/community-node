import React from 'react';
import { Card } from "@/components/ui/card";
import { format } from 'date-fns';

export default function StoryCard({ recommendation }) {
  return (
    <Card className="p-5 border-slate-800">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-slate-300">
            {(recommendation.user_name || 'A')[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-100">{recommendation.user_name || 'Community Member'}</p>
          <p className="text-xs text-slate-500">
            {recommendation.created_date && format(new Date(recommendation.created_date), 'MMM d, yyyy')}
          </p>
          {recommendation.service_used && (
            <span className="inline-block mt-1.5 bg-slate-800 text-slate-400 text-xs rounded-full px-2 py-0.5">
              {recommendation.service_used}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-400 mt-4 leading-relaxed">{recommendation.content}</p>

      {recommendation.photos?.length > 0 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {recommendation.photos.map((photo, idx) => (
            <img
              key={idx}
              src={photo}
              alt={`Photo ${idx + 1}`}
              className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
            />
          ))}
        </div>
      )}
    </Card>
  );
}
