import React from 'react';
import { ThumbsUp } from "lucide-react";

export default function TrustSignal({ business }) {
  // Support both new recommendation fields and legacy review_count for backward compat
  const count = business.recommendation_count || business.review_count || 0;
  const stories = business.story_count || 0;

  if (count === 0) {
    return (
      <span className="text-sm text-slate-500 italic">New to LocalLane</span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <ThumbsUp className="h-4 w-4 text-amber-500" />
      <span className="text-slate-300 font-medium">{count} recommended</span>
      {stories > 0 && (
        <>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">{stories} {stories === 1 ? 'story' : 'stories'}</span>
        </>
      )}
    </div>
  );
}
