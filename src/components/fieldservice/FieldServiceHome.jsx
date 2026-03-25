import React, { useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HardHat, FolderOpen, ClipboardList, Calendar, FileText, DollarSign, Users, Briefcase } from 'lucide-react';
import WorkspaceGuide from '@/components/workspaces/WorkspaceGuide';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const fmtShortDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + (d.includes('T') ? '' : 'T12:00:00'));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function FieldServiceHome({ profile, currentUser, onNavigateTab }) {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // ─── Query: Projects ─────────────────────────────
  const { data: projects = [] } = useQuery({
    queryKey: ['fs-projects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSProject.filter({ profile_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Material Entries (this month) ────────
  const { data: monthMaterials = [] } = useQuery({
    queryKey: ['fs-materials-month', profile?.id, monthStart],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSMaterialEntry.filter({ profile_id: profile.id });
        return (Array.isArray(list) ? list : list ? [list] : []).filter((m) => {
          const d = (m.created_date || '').split('T')[0];
          return d >= monthStart;
        });
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Labor Entries (this month) ───────────
  const { data: monthLabor = [] } = useQuery({
    queryKey: ['fs-labor-month', profile?.id, monthStart],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSLaborEntry.filter({ profile_id: profile.id });
        return (Array.isArray(list) ? list : list ? [list] : []).filter((l) => {
          const d = (l.created_date || '').split('T')[0];
          return d >= monthStart;
        });
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Daily Logs (recent 5) ───────────────
  const { data: recentLogs = [] } = useQuery({
    queryKey: ['fs-recent-logs', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSDailyLog.filter({ profile_id: profile.id }, '-date', 5);
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Estimates (outstanding) ─────────────
  const { data: estimates = [] } = useQuery({
    queryKey: ['fs-estimates', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSEstimate.filter({ profile_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Payments received ──────────────────
  const { data: payments = [] } = useQuery({
    queryKey: ['fs-payments-all', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSPayment.filter({ profile_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Documents (for guide completion) ───
  const { data: fsDocuments = [] } = useQuery({
    queryKey: ['fs-documents', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSDocument.filter({ profile_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Clients ────────────────────────────
  const { data: fsClients = [] } = useQuery({
    queryKey: ['fs-clients', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSClient.filter({ workspace_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Derived Stats ──────────────────────────────
  const teamCount = useMemo(() => {
    const w = profile?.workers_json;
    const arr = Array.isArray(w) ? w : (w && typeof w === 'object' && Array.isArray(w.items)) ? w.items : [];
    return arr.length;
  }, [profile?.workers_json]);

  const activeClients = useMemo(
    () => fsClients.filter((c) => c.status === 'active'),
    [fsClients]
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active'),
    [projects]
  );

  const outstandingEstimates = useMemo(
    () => estimates.filter((e) => e.status === 'sent' || e.status === 'viewed'),
    [estimates]
  );

  const paymentsReceived = useMemo(
    () => payments
      .filter((p) => p.status === 'received' || p.status === 'cleared')
      .reduce((s, p) => s + (p.amount || 0), 0),
    [payments]
  );

  const monthTotal = useMemo(() => {
    const matTotal = monthMaterials.reduce((s, m) => s + (m.total_cost || 0), 0);
    const labTotal = monthLabor.reduce((s, l) => s + (l.total_cost || 0), 0);
    return matTotal + labTotal;
  }, [monthMaterials, monthLabor]);

  // ─── Project name lookup ─────────────────────────
  const projectMap = useMemo(() => {
    const map = {};
    projects.forEach((p) => { map[p.id] = p; });
    return map;
  }, [projects]);

  // ─── Workspace Guide (Activation Protocol Moment 3) ──────────
  const guideDismissed = profile?.guide_dismissed === true;
  const queryClient = useQueryClient();

  const dismissGuide = useMutation({
    mutationFn: async () => {
      await base44.entities.FieldServiceProfile.update(profile.id, { guide_dismissed: true });
    },
    onSuccess: () => {
      queryClient.setQueryData(['fs-profile', profile?.id], (old) =>
        old ? { ...old, guide_dismissed: true } : old
      );
      queryClient.invalidateQueries(['fs-profile']);
    },
    onError: (err) => console.error('Guide dismiss failed:', err),
  });

  const handleDismissGuide = useCallback(() => {
    dismissGuide.mutate();
  }, [dismissGuide]);

  // Smart completion: detect which guide steps are done
  const completedSteps = useMemo(() => {
    const done = [];
    // 'settings' — complete if workspace has a custom name
    if (profile?.business_name && profile.business_name.trim().length > 0) {
      done.push('settings');
    }
    // 'client' — complete if at least 1 client exists
    if (fsClients.length > 0) {
      done.push('client');
    }
    // 'estimate' — complete if at least 1 estimate exists
    if (estimates.length > 0) {
      done.push('estimate');
    }
    // 'documents' — complete if at least 1 document exists
    if (fsDocuments.length > 0) {
      done.push('documents');
    }
    // 'log' — complete if at least 1 log exists
    if (recentLogs.length > 0) {
      done.push('log');
    }
    return done;
  }, [profile?.business_name, fsClients.length, estimates.length, fsDocuments.length, recentLogs.length]);

  return (
    <div className="space-y-6">
      {/* Workspace Guide — inline walkthrough for new users */}
      {!guideDismissed && (
        <WorkspaceGuide
          workspaceType="field_service"
          onDismiss={handleDismissGuide}
          onStepClick={(tab) => onNavigateTab?.(tab)}
          completedSteps={completedSteps}
        />
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-slate-400">Clients</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{activeClients.length}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-slate-400">Active Projects</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{activeProjects.length}</p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab?.('estimates')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-slate-400">Estimates</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{estimates.length}</p>
          {outstandingEstimates.length > 0 && (
            <p className="text-xs text-amber-400 mt-0.5">{outstandingEstimates.length} outstanding</p>
          )}
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardHat className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-slate-400">This Month</span>
          </div>
          <p className="text-2xl font-bold text-amber-500">{fmt(monthTotal)}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-slate-400">Received</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{fmt(paymentsReceived)}</p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab?.('people')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-slate-400">Team</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{teamCount}</p>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onNavigateTab?.('log')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors text-sm min-h-[44px]"
        >
          + Log Today's Work
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab?.('estimates')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-amber-500 text-amber-500 hover:bg-amber-500/10 transition-colors text-sm font-medium min-h-[44px]"
        >
          + New Estimate
        </button>
      </div>

      {/* Active Project Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-100">Active Projects</h2>
          </div>
          {activeProjects.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigateTab?.('projects')}
              className="text-xs text-amber-500 hover:text-amber-400"
            >
              View all
            </button>
          )}
        </div>

        {activeProjects.length === 0 ? (
          <p className="text-sm text-slate-500">
            No active projects yet. Create your first project or estimate to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {activeProjects.slice(0, 5).map((project) => {
              const spent = project.total_spent || 0;
              const budget = project.total_budget || 0;
              const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onNavigateTab?.('projects')}
                  className="w-full text-left bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{project.name}</p>
                      {project.client_name && (
                        <p className="text-xs text-slate-400">{project.client_name}</p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 flex-shrink-0 ml-2">
                      Active
                    </span>
                  </div>
                  {budget > 0 && (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{fmt(spent)} spent</span>
                        <span>{fmt(budget)} budget</span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">Recent Activity</h2>
        </div>

        {recentLogs.length === 0 ? (
          <p className="text-sm text-slate-500">
            No activity yet. Log your first day's work to see it here.
          </p>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log) => {
              const project = projectMap[log.project_id];
              const taskPreview = (() => {
                const t = log.tasks_completed;
                if (!t) return '';
                if (Array.isArray(t)) return t.join(', ');
                if (typeof t === 'string') {
                  const s = t.trim();
                  if (s.startsWith('[')) {
                    try { const p = JSON.parse(s); return Array.isArray(p) ? p.join(', ') : s; }
                    catch { return s; }
                  }
                  return s.slice(0, 100);
                }
                return '';
              })();
              return (
                <div
                  key={log.id}
                  className="bg-slate-800/50 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">{fmtShortDate(log.date)}</span>
                    {project && (
                      <span className="text-xs text-amber-500 truncate ml-2">{project.name}</span>
                    )}
                  </div>
                  {taskPreview && (
                    <p className="text-sm text-slate-300 line-clamp-2">{taskPreview}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Finance Link Hook (future) */}
      {profile?.linked_finance_workspace_id && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-400 text-center">Financial summary coming soon</p>
        </div>
      )}
    </div>
  );
}
