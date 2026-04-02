// WORKSPACE ADMIN — LAYER 2 (Platform Admin)
//
// Three layers of workspace administration:
// Layer 1: Workspace owner settings (per-workspace, already built)
//   → Each workspace owner manages their own settings, trades, toggles
// Layer 2: Platform admin (this file, Doron)
//   → Manages ALL workspaces, configures platform-wide defaults
// Layer 3: Dynamic inheritance
//   → Platform defaults seed new workspaces via getWorkspaceDefaults()
//   → Existing workspaces keep their customized versions
//
// Fractal principle: same settings pattern at workspace and platform scale.
// What's true of the part is true of the whole.

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Wrench, Home, Users, Calculator, Layers } from 'lucide-react';
import { format } from 'date-fns';

const WORKSPACE_TYPES = [
  { key: 'field_service', label: 'Field Service', entity: 'FieldServiceProfile', icon: Wrench, route: 'field-service' },
  { key: 'property_management', label: 'Property Mgmt', entity: 'PropertyManagementProfile', icon: Home, route: 'property-management' },
  { key: 'team', label: 'Team', entity: 'TeamProfile', icon: Users, route: 'team' },
  { key: 'finance', label: 'Finance', entity: 'FinancialProfile', icon: Calculator, route: 'finance' },
];

function useWorkspaceList(entityName, isAdmin) {
  return useQuery({
    queryKey: ['admin-workspaces', entityName],
    queryFn: async () => {
      try {
        const list = await base44.entities[entityName].list('-created_date', 500);
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    enabled: isAdmin,
    retry: false,
  });
}

export default function AllWorkspacesPanel({ isAdmin }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  const fsQuery = useWorkspaceList('FieldServiceProfile', isAdmin);
  const pmQuery = useWorkspaceList('PropertyManagementProfile', isAdmin);
  const teamQuery = useWorkspaceList('TeamProfile', isAdmin);
  const financeQuery = useWorkspaceList('FinancialProfile', isAdmin);

  const isLoading = fsQuery.isLoading || pmQuery.isLoading || teamQuery.isLoading || financeQuery.isLoading;

  const allWorkspaces = useMemo(() => {
    const tag = (list, type) =>
      list.map((w) => ({
        id: w.id,
        name: w.workspace_name || w.business_name || w.name || 'Unnamed',
        type,
        owner_email: w.owner_email || w.user_email || w.email || '—',
        is_active: w.is_active !== false,
        created_date: w.created_date,
      }));

    return [
      ...tag(fsQuery.data || [], 'field_service'),
      ...tag(pmQuery.data || [], 'property_management'),
      ...tag(teamQuery.data || [], 'team'),
      ...tag(financeQuery.data || [], 'finance'),
    ];
  }, [fsQuery.data, pmQuery.data, teamQuery.data, financeQuery.data]);

  const typeCounts = useMemo(() => {
    const counts = { all: allWorkspaces.length };
    WORKSPACE_TYPES.forEach((t) => {
      counts[t.key] = allWorkspaces.filter((w) => w.type === t.key).length;
    });
    return counts;
  }, [allWorkspaces]);

  const filtered = useMemo(() => {
    return allWorkspaces.filter((w) => {
      if (typeFilter !== 'all' && w.type !== typeFilter) return false;
      if (statusFilter === 'active' && !w.is_active) return false;
      if (statusFilter === 'inactive' && w.is_active) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!w.name.toLowerCase().includes(q) && !w.owner_email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allWorkspaces, typeFilter, statusFilter, search]);

  const getTypeConfig = (type) => WORKSPACE_TYPES.find((t) => t.key === type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">All Workspaces</h2>
          <p className="text-muted-foreground text-sm mt-1">{allWorkspaces.length} total across all types</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary border-border text-foreground"
          />
        </div>
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        {[{ key: 'all', label: 'All' }, ...WORKSPACE_TYPES].map((t) => (
          <button
            key={t.key}
            onClick={() => setTypeFilter(t.key)}
            className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
              typeFilter === t.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground-soft hover:bg-surface'
            }`}
          >
            {t.label} ({typeCounts[t.key] || 0})
          </button>
        ))}
        <div className="border-l border-border mx-1" />
        {['all', 'active', 'inactive'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground-soft hover:bg-surface'
            }`}
          >
            {s === 'all' ? 'All Status' : s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 bg-card border-border text-center">
          <Layers className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No workspaces found</h3>
          <p className="text-muted-foreground mt-2">
            {allWorkspaces.length === 0
              ? 'No workspaces have been created yet.'
              : 'No workspaces match your filters.'}
          </p>
        </Card>
      ) : (
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-soft">Workspace</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-soft">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-soft hidden sm:table-cell">Owner</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-soft">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-soft hidden sm:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => {
                  const typeConfig = getTypeConfig(w.type);
                  const TypeIcon = typeConfig?.icon || Layers;
                  return (
                    <tr
                      key={`${w.type}-${w.id}`}
                      onClick={() => navigate(`/Admin/workspaces/${typeConfig?.route || w.type}`)}
                      className="border-b border-border hover:bg-secondary/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-foreground font-medium">{w.name}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-sm text-foreground-soft">
                          <TypeIcon className="h-3.5 w-3.5 text-primary" />
                          {typeConfig?.label || w.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground truncate max-w-[150px] hidden sm:table-cell">
                        {w.owner_email}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={
                            w.is_active
                              ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                              : 'bg-surface text-muted-foreground border-border'
                          }
                        >
                          {w.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                        {w.created_date
                          ? format(new Date(w.created_date), 'MMM d, yyyy')
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
