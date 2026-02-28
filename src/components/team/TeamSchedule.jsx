import React from 'react';
import { Calendar } from 'lucide-react';

export default function TeamSchedule() {
  return (
    <div className="text-center py-12">
      <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-600" />
      <p className="text-slate-400 mb-1">No events scheduled</p>
      <p className="text-sm text-slate-500">Schedule and messaging coming soon.</p>
    </div>
  );
}
