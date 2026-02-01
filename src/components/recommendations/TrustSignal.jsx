import React from 'react';
import { ThumbsUp, Shield } from "lucide-react";

export default function TrustSignal({ business }) {
  const count = business.recommendation_count || business.review_count || 0;
  const stories = business.story_count || 0;
  const vouches = business.vouch_count || 0;

  if (count === 0) {
    return (
      <span className="text-sm text-slate-500 italic">New to LocalLane</span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm flex-wrap">
      <ThumbsUp className="h-4 w-4 text-amber-500" />
      <span className="text-slate-300 font-medium">{count} recommended</span>
      {stories > 0 && (
        <>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">{stories} {stories === 1 ? 'story' : 'stories'}</span>
        </>
      )}
      {vouches > 0 && (
        <>
          <span className="text-slate-600">·</span>
          <Shield className="h-4 w-4 text-amber-500" />
          <span className="text-amber-400 font-medium">{vouches} {vouches === 1 ? 'vouch' : 'vouches'}</span>
        </>
      )}
    </div>
  );
}
