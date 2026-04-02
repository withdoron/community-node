import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Loader2, Wrench, ToggleLeft, BarChart3, FileText } from 'lucide-react';
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
          <Card key={i} className="p-4 bg-secondary border-border animate-pulse">
            <div className="h-8 bg-surface rounded w-12 mb-2" />
            <div className="h-4 bg-surface rounded w-20" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card className="p-4 bg-secondary border-border">
        <p className="text-2xl font-bold text-primary-hover">{stats.total}</p>
        <p className="text-xs text-muted-foreground mt-1">Total Workspaces</p>
      </Card>
      <Card className="p-4 bg-secondary border-border">
        <p className="text-2xl font-bold text-emerald-400">{stats.active}</p>
        <p className="text-xs text-muted-foreground mt-1">Active</p>
      </Card>
      <Card className="p-4 bg-secondary border-border">
        <p className="text-2xl font-bold text-foreground">{stats.totalEstimates}</p>
        <p className="text-xs text-muted-foreground mt-1">Total Estimates</p>
      </Card>
      <Card className="p-4 bg-secondary border-border">
        <p className="text-2xl font-bold text-foreground">{stats.totalProjects}</p>
        <p className="text-xs text-muted-foreground mt-1">Total Projects</p>
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
      <Card className="p-6 bg-card border-border">
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <ToggleLeft className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Default Feature Toggles</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        These defaults are applied when a new Field Service workspace is created. Workspace owners can customize them after creation.
      </p>
      <div className="space-y-3">
        {toggles.map((toggle) => (
          <div
            key={toggle.key}
            className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border"
          >
            <div className="flex-1 min-w-0 mr-3">
              <Label className="font-medium text-foreground">{toggle.label}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{toggle.description}</p>
            </div>
            <Switch
              checked={toggle.enabled}
              onCheckedChange={(checked) => handleToggle(toggle.key, checked)}
              disabled={mutation.isPending}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function DocumentStatsCard({ isAdmin }) {
  // .list() + client-side aggregation — no .filter() due to Base44 SDK quirk
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['admin-fs-documents-stats'],
    queryFn: async () => {
      try {
        const all = await base44.entities.FSDocument.list();
        return Array.isArray(all) ? all : [];
      } catch { return []; }
    },
    enabled: isAdmin,
    retry: false,
  });

  const stats = useMemo(() => {
    let drafts = 0;
    let awaiting = 0;
    let signed = 0;
    let archived = 0;
    for (const d of documents) {
      const s = d.status === 'sent' ? 'awaiting_signature' : (d.status || 'draft');
      if (s === 'draft') drafts++;
      else if (s === 'awaiting_signature') awaiting++;
      else if (s === 'signed') signed++;
      else if (s === 'archived') archived++;
    }
    return { total: documents.length, drafts, awaiting, signed, archived };
  }, [documents]);

  if (isLoading) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Document Activity</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-secondary rounded-lg p-3 border border-border">
          <p className="text-xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-secondary rounded-lg p-3 border border-border">
          <p className="text-xl font-bold text-muted-foreground">{stats.drafts}</p>
          <p className="text-xs text-muted-foreground/70">Drafts</p>
        </div>
        <div className="bg-secondary rounded-lg p-3 border border-border">
          <p className="text-xl font-bold text-primary-hover">{stats.awaiting}</p>
          <p className="text-xs text-muted-foreground">Awaiting Sig</p>
        </div>
        <div className="bg-secondary rounded-lg p-3 border border-border">
          <p className="text-xl font-bold text-emerald-400">{stats.signed}</p>
          <p className="text-xs text-muted-foreground">Signed</p>
        </div>
        <div className="bg-secondary rounded-lg p-3 border border-border">
          <p className="text-xl font-bold text-muted-foreground/50">{stats.archived}</p>
          <p className="text-xs text-muted-foreground/70">Archived</p>
        </div>
      </div>
    </Card>
  );
}

export default function FieldServiceDefaultsPanel({ isAdmin }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wrench className="h-6 w-6 text-primary" />
          Field Service Defaults
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Platform-wide defaults for new Field Service workspaces. Existing workspaces keep their customized versions.
        </p>
      </div>

      <StatsOverview isAdmin={isAdmin} />

      <DocumentStatsCard isAdmin={isAdmin} />

      <ConfigSection
        domain="workspace_defaults"
        configType="field_service_trade_categories"
        title="Default Trade Categories"
      />

      <FeatureTogglesSection />
    </div>
  );
}
