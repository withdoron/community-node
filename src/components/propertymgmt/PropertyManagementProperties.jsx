import React from 'react';
import { Building } from 'lucide-react';

export default function PropertyManagementProperties() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
        <Building className="h-8 w-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-100 mb-2">Properties</h2>
      <p className="text-slate-400 text-sm text-center max-w-md">
        Full property and unit management coming in Session 2.
        Manage property groups, individual units, tenant info, and lease tracking.
      </p>
    </div>
  );
}
