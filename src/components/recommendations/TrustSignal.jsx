import React from 'react';
import { ThumbsUp, Shield } from "lucide-react";

export default function TrustSignal({ business }) {
  const count = business.recommendation_count || 0;
  const stories = business.story_count || 0;
  const vouches = business.vouch_count || 0;

  if (count === 0) {
    return (
      <span className="text-sm text-muted-foreground/70 italic">New to LocalLane</span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm flex-wrap">
      <ThumbsUp className="h-4 w-4 text-primary" />
      <span className="text-foreground-soft font-medium">{count} recommended</span>
      {stories > 0 && (
        <>
          <span className="text-muted-foreground/70">·</span>
          <span className="text-muted-foreground">{stories} {stories === 1 ? 'story' : 'stories'}</span>
        </>
      )}
      {vouches > 0 && (
        <>
          <span className="text-muted-foreground/70">·</span>
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-primary-hover font-medium">{vouches} {vouches === 1 ? 'vouch' : 'vouches'}</span>
        </>
      )}
    </div>
  );
}
