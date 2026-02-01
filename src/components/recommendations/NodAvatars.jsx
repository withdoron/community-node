import React from 'react';

export default function NodAvatars({ recommendations = [], maxShow = 3 }) {
  if (!recommendations || recommendations.length === 0) return null;

  const visible = recommendations.slice(0, maxShow);
  const remaining = recommendations.length - maxShow;

  return (
    <div className="flex items-center">
      {visible.map((rec, idx) => (
        <div
          key={rec.id || idx}
          className={`h-8 w-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center ${idx > 0 ? '-ml-2' : ''}`}
          title={rec.user_name}
        >
          <span className="text-xs font-medium text-slate-300">
            {(rec.user_name || 'A')[0].toUpperCase()}
          </span>
        </div>
      ))}
      {remaining > 0 && (
        <div className="h-8 w-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center -ml-2">
          <span className="text-xs font-medium text-slate-400">+{remaining}</span>
        </div>
      )}
    </div>
  );
}
