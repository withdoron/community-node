import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Loader2, Wrench, ToggleLeft, BarChart3 } from 'lucide-react';
import ConfigSection from '@/components/admin/config/ConfigSection';
import { useConfig, useConfigMutation } from '@/hooks/useConfig';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const DEFAULT_FEATURE_TOGGLES = [
  { key: 'permits', label: 'Permits', description: 'Track permit requirements and status', default_on: true },
  { key: 'subs', label: 'Subcontractors', description: 'Manage subcontractor assignments and costs', default_on: true },
  { key: 'management_fees', label: 'Management Fees', description: 'Calculate and apply management fee percentages', default_on: true },
  { key: 'insurance_overhead', label: 'Insurance & Overhead', description: 'Track insurance and overhead costs', default_on: false },
  { key: 'payments', label: 'Payments', description: 'Process and track client payments', default_on: false },
  { key: 'timeline', label: 'Timeline', description: 'Visual project timeline and scheduling', default_on: true },
];

function StatsOverview({ isAdmin }) {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-fs-profiles'],
    queryFn: async () => {
      try {
        const list = await base44.entities.FieldServiceProfile.list('-created_date', 500);
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    enabled: isAdmin,
    retry: false,
  });

  const stats = useMemo(() => {
    const active = profiles.filter((p) => p.is_active !== false).length;
    let totalEstimates = 0;
    let totalProjects = 0;
    profiles.forEach((p) => {
      totalEstimates += p.estimate_count || 0;
      totalProjects += p.project_count || 0;
    });
    return { total: profiles.length, active, totalEstimates, totalProjects };
  }, [profiles]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 bg-slate-800 border-slate-700 animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-12 mb-2" />
            <div className="h-4 bg-slate-700 rounded w-20" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card className="p-4 bg-slate-800 border-slate-700">
        <p className="text-2xl font-bold text-amber-400">{stats.total}</p>
        <p className="text-xs text-slate-400 mt-1">Total Workspaces</p>
      </Card>
      <Card className="p-4 bg-slate-800 border-slate-700">
        <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
        <p className="text-xs text-slate-400 mt-1">Active</p>
      </Card>
      <Card className="p-4 bg-slate-800 border-slate-700">
        <p className="text-2xl font-bold text-slate-100">{stats.totalEstimates}</p>
        <p className="text-xs text-slate-400 mt-1">Total Estimates</p>
      </Card>
      <Card className="p-4 bg-slate-800 border-slate-700">
        <p className="text-2xl font-bold text-slate-100">{stats.totalProjects}</p>
        <p className="text-xs text-slate-400 mt-1">Total Projects</p>
      </Card>
    </div>
  );
}

function FeatureTogglesSection() {
  const { data: savedToggles = [], isLoading } = useConfig('workspace_defaults', 'field_service_feature_toggles');
  const mutation = useConfigMutation('workspace_defaults', 'field_service_feature_toggles');

  const toggles = useMemo(() => {
    if (!Array.isArray(savedToggles) || savedToggles.length === 0) {
      return DEFAULT_FEATURE_TOGGLES.map((t) => ({ ...t, enabled: t.default_on }));
    }
    return DEFAULT_FEATURE_TOGGLES.map((t) => {
      const saved = savedToggles.find((s) => s.key === t.key);
      return { ...t, enabled: saved ? saved.enabled : t.default_on };
    });
  }, [savedToggles]);

  const handleToggle = (key, checked) => {
    const updated = toggles.map((t) => ({
      key: t.key,
      label: t.label,
      description: t.description,
      default_on: t.default_on,
      enabled: t.key === key ? checked : t.enabled,
    }));
    mutation.mutate(updated, {
      onSuccess: () => toast.success('Default toggles updated'),
      onError: () => toast.error('Failed to save toggles'),
    });
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-slate-900 border-slate-700">
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-slate-900 border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <ToggleLeft className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-white">Default Feature Toggles</h3>
      </div>
      <p className="text-sm text-slate-400 mb-6">
        These defaults are applied when a new Field Service workspace is created. Workspace owners can customize them after creation.
      </p>
      <div className="space-y-3">
        {toggles.map((toggle) => (
          <div
            key={toggle.key}
            className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700"
          >
            <div className="flex-1 min-w-0 mr-3">
              <Label className="font-medium text-slate-100">{toggle.label}</Label>
              <p className="text-xs text-slate-400 mt-0.5">{toggle.description}</p>
            </div>
            <Switch
              checked={toggle.enabled}
              onCheckedChange={(checked) => handleToggle(toggle.key, checked)}
              disabled={mutation.isPending}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function FieldServiceDefaultsPanel({ isAdmin }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Wrench className="h-6 w-6 text-amber-500" />
          Field Service Defaults
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Platform-wide defaults for new Field Service workspaces. Existing workspaces keep their customized versions.
        </p>
      </div>

      <StatsOverview isAdmin={isAdmin} />

      <ConfigSection
        domain="workspace_defaults"
        configType="field_service_trade_categories"
        title="Default Trade Categories"
      />

      <FeatureTogglesSection />
    </div>
  );
}
