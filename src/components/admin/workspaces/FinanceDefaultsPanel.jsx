import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Calculator, Loader2 } from 'lucide-react';

export default function FinanceDefaultsPanel({ isAdmin }) {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-finance-profiles'],
    queryFn: async () => {
      try {
        const list = await base44.entities.FinancialProfile.list('-created_date', 500);
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
          <Calculator className="h-6 w-6 text-amber-500" />
          Finance Defaults
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Platform-wide defaults for new Finance workspaces.
        </p>
      </div>

      <Card className="p-4 bg-slate-800 border-slate-700 inline-block">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        ) : (
          <>
            <p className="text-2xl font-bold text-amber-400">{profiles.length}</p>
            <p className="text-xs text-slate-400 mt-1">Total Finance Workspaces</p>
          </>
        )}
      </Card>

      <Card className="p-6 bg-slate-900 border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-2">Finance Defaults</h3>
        <p className="text-slate-400 text-sm">
          Spending categories, context defaults. Coming soon.
        </p>
      </Card>
    </div>
  );
}
