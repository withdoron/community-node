import React from 'react';
import { Megaphone } from 'lucide-react';

export default function PropertyManagementListings() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
        <Megaphone className="h-8 w-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-100 mb-2">Listings</h2>
      <p className="text-slate-400 text-sm text-center max-w-md">
        Vacancy listings and guest management coming in Session 5.
        Publish rental listings and track prospective tenants.
      </p>
    </div>
  );
}
