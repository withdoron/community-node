import React from 'react';
import { BookOpen } from 'lucide-react';

/** Parse tags from comma-separated string */
export function parseTags(tagsStr) {
  if (!tagsStr || typeof tagsStr !== 'string') return [];
  return tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
}

export default function PlayCard({ play, onClick }) {
  const tags = parseTags(play?.tags);
  const previewTags = tags.slice(0, 3);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:border-slate-700 transition-colors min-h-[44px]"
    >
      <div className="aspect-video bg-slate-800 overflow-hidden">
        {play?.diagram_image ? (
          <img src={play.diagram_image} alt={play.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-slate-600 text-lg flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              {play?.formation || 'No diagram'}
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white truncate flex-1">
            {play?.name}
            {play?.nickname ? <span className="text-slate-400 font-normal"> ({play.nickname})</span> : null}
          </h3>
          {play?.game_day && (
            <span className="bg-amber-500/20 text-amber-500 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
              Game Day
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded">
            {play?.formation || '—'}
          </span>
          {previewTags.map((tag) => (
            <span key={tag} className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded">
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
