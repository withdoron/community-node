import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function MyLaneBreadcrumb({ spaceName, onBack }) {
  if (!spaceName) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm mb-4">
      <button
        type="button"
        onClick={onBack}
        className="text-amber-500 hover:text-amber-400 font-medium transition-colors"
      >
        MyLane
      </button>
      <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
      <span className="text-slate-300">{spaceName}</span>
    </div>
  );
}
