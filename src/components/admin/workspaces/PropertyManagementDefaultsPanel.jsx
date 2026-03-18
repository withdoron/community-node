import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Home, Loader2 } from 'lucide-react';

export default function PropertyManagementDefaultsPanel({ isAdmin }) {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-pm-profiles'],
    queryFn: async () => {
      try {
        const list = await base44.entities.PropertyManagementProfile.list('-created_date', 500);
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    enabled: isAdmin,
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Home className="h-6 w-6 text-amber-500" />
          Property Management Defaults
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Platform-wide defaults for new Property Management workspaces.
        </p>
      </div>

      <Card className="p-4 bg-slate-800 border-slate-700 inline-block">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        ) : (
          <>
            <p className="text-2xl font-bold text-amber-400">{profiles.length}</p>
            <p className="text-xs text-slate-400 mt-1">Total PM Workspaces</p>
          </>
        )}
      </Card>

      <Card className="p-6 bg-slate-900 border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-2">Property Management Defaults</h3>
        <p className="text-slate-400 text-sm">
          Property types, lease terms, maintenance categories. Coming soon.
        </p>
      </Card>
    </div>
  );
}
