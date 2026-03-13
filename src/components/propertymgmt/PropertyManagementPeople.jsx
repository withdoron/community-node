import React from 'react';
import { UserCheck } from 'lucide-react';

export default function PropertyManagementPeople() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
        <UserCheck className="h-8 w-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-100 mb-2">People</h2>
      <p className="text-slate-400 text-sm text-center max-w-md">
        User management and permissions coming in Session 5.
        Invite owners, workers, and tenants with role-based access control.
      </p>
    </div>
  );
}
