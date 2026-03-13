import React from 'react';
import { Wrench } from 'lucide-react';

export default function PropertyManagementMaintenance() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
        <Wrench className="h-8 w-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-100 mb-2">Maintenance</h2>
      <p className="text-slate-400 text-sm text-center max-w-md">
        Maintenance request management coming in Session 4.
        Full lifecycle tracking from tenant submission through completion with cost tracking.
      </p>
    </div>
  );
}
