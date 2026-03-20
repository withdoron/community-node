import React from 'react';
import { Music } from 'lucide-react';

export default function FrequencyStation() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
          <Music className="h-10 w-10 text-amber-500" />
        </div>
        <h1 className="text-3xl font-bold text-slate-100 mb-3">Frequency Station</h1>
        <p className="text-slate-400 text-lg leading-relaxed mb-6">
          The community's radio station. Write what's on your heart. We turn it into music.
        </p>
        <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-500 text-sm font-medium">
          Coming Soon
        </span>
      </div>
    </div>
  );
}
