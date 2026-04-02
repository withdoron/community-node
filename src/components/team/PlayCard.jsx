import React from 'react';
import { BookOpen } from 'lucide-react';
import PlayRenderer from '@/components/field/PlayRenderer';

/** Parse tags from comma-separated string */
export function parseTags(tagsStr) {
  if (!tagsStr || typeof tagsStr !== 'string') return [];
  return tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
}

export default function PlayCard({ play, assignments = [], onClick }) {
  const tags = parseTags(play?.tags);
  const previewTags = tags.slice(0, 3);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-border transition-colors min-h-[44px]"
    >
      <div className="aspect-[2/1] bg-secondary overflow-hidden">
        {(play?.use_renderer === true || play?.use_renderer === 'true') && assignments.length > 0 ? (
          <PlayRenderer play={play} assignments={assignments} mode="mini" className="w-full h-full" />
        ) : play?.diagram_image ? (
          <img src={play.diagram_image} alt={play.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground/50 text-lg flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              {play?.formation || 'No diagram'}
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground truncate flex-1">
            {play?.name}
            {play?.nickname ? <span className="text-muted-foreground font-normal"> ({play.nickname})</span> : null}
          </h3>
          {play?.status === 'experimental' && (
            <span className="bg-teal-500/20 text-teal-400 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
              Idea
            </span>
          )}
          {play?.game_day && (play?.status || 'active') !== 'experimental' && (
            <span className="bg-primary/20 text-primary text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
              Game Day
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="bg-secondary text-foreground-soft text-xs px-2 py-0.5 rounded">
            {play?.formation || '—'}
          </span>
          {previewTags.map((tag) => (
            <span key={tag} className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded">
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
        {play?.created_by_name && play?.status === 'experimental' && (
          <p className="text-muted-foreground/70 text-xs mt-1">by {play.created_by_name}</p>
        )}
      </div>
    </div>
  );
}
