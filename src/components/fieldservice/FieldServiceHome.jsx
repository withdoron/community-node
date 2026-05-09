import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HardHat, FolderOpen, ClipboardList, FileText, DollarSign, Users, Briefcase } from 'lucide-react';
import WorkspaceGuide from '@/components/workspaces/WorkspaceGuide';
import { invalidateFSProfiles } from '@/utils/fsFeatures';
import { useWorkspacePeople } from '@/hooks/useWorkspacePeople';
import ProjectTileDrillIn from './ProjectTileDrillIn';
import { excludeDeleted } from '@/utils/softDelete';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d + (d.includes('T') ? '' : 'T12:00:00'))
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return d; }
};

const fmtShortDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + (d.includes('T') ? '' : 'T12:00:00'));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function FieldServiceHome({ profile, currentUser, onNavigateTab }) {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // ─── Tile drill-in state (Seedling A) ────────────
  // Mirrors Project Detail's setDrillIn pattern (FieldServiceProjects.jsx:145).
  // null = closed; otherwise one of: 'clients' | 'projects' | 'estimates' |
  // 'spent_month' | 'received' | 'team'. The drillConfig dispatch lower
  // builds the popup contents per active tile. Clicking a tile sets the
  // drill-in instead of (previously) navigating away — honest audit-the-
  // number behavior matches Project Detail.
  const [drillIn, setDrillIn] = useState(null);

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
        return excludeDeleted(Array.isArray(list) ? list : list ? [list] : []).filter((m) => {
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
        return excludeDeleted(Array.isArray(list) ? list : list ? [list] : []).filter((l) => {
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
        return excludeDeleted(Array.isArray(list) ? list : list ? [list] : []);
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
        return excludeDeleted(Array.isArray(list) ? list : list ? [list] : []);
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
  // Team count + roster pull from useWorkspacePeople (canonical workers_json
  // parser) instead of inline parseWrappedArray. Living Feet (DEC-146) — same
  // helper FieldServicePeople uses; no duplicate parsing path.
  const { allPeople: teamPeople } = useWorkspacePeople(profile);
  const teamCount = teamPeople.length;

  const activeClients = useMemo(
    () => fsClients.filter((c) => c.status === 'active'),
    [fsClients]
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active'),
    [projects]
  );

  // Outstanding = sent or viewed by client (un-actioned). Excludes draft
  // (still being authored) and accepted/declined/signed (terminal states).
  const outstandingEstimates = useMemo(
    () => estimates.filter((e) => e.status === 'sent' || e.status === 'viewed'),
    [estimates]
  );

  const closedEstimates = useMemo(
    () => estimates.filter((e) => e.status !== 'sent' && e.status !== 'viewed'),
    [estimates]
  );

  // Direction filter is load-bearing: FSPayment carries both Sub Payments
  // (direction: 'paid', money OUT to subs/vendors) and Client Payments
  // (direction: 'received', money IN from clients), and the Log writes
  // status: 'received' for ALL of them — `status` is the lifecycle marker
  // (vs pending/cleared), not "received income". Without the direction
  // filter, paid-out sub payments leak into the Received tile and the
  // contractor sees a fake income number. Mirrors summarizePayments() in
  // useFSPayments.js — gold-standard helper used by Project Detail's
  // matching tile. The (p.direction || 'received') default tolerates pre-
  // Item-4 legacy records that pre-date the field; schema default is
  // 'received' so this is belt-and-suspenders.
  const paymentsReceived = useMemo(
    () => payments
      .filter((p) => (p.status === 'received' || p.status === 'cleared')
                  && (p.direction || 'received') === 'received')
      .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
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

  // ─── Drill-in row builders (Seedling A) ──────────
  // Six tile breakdowns, one row builder each. Each row's onClick navigates
  // to the source record's actual context via the localStorage prefill
  // pattern (DEC-209 honest navigation; DEC-146 useConsumePrefill consumed
  // by the destination tab). Setting drillIn = null on click closes the
  // popup before the tab switch so the user lands clean.
  //
  // Five existing prefill keys + four new (added this commit):
  //   existing: fs-estimate-prefill-id, fs-log-prefill-log-id,
  //             fs-log-prefill-type, fs-document-prefill-id,
  //             fs-document-prefill-project-id
  //   new:      fs-people-prefill-client-id, fs-people-prefill-worker-id,
  //             fs-projects-prefill-project-id,
  //             fs-projects-prefill-payment-id
  // All consumed via useConsumePrefill in their respective destination tabs.
  const goToClient = useCallback((clientId) => {
    if (clientId) localStorage.setItem('fs-people-prefill-client-id', clientId);
    setDrillIn(null);
    onNavigateTab?.('people');
  }, [onNavigateTab]);

  const goToWorker = useCallback((workerId) => {
    if (workerId) localStorage.setItem('fs-people-prefill-worker-id', workerId);
    setDrillIn(null);
    onNavigateTab?.('people');
  }, [onNavigateTab]);

  const goToProject = useCallback((projectId) => {
    if (projectId) localStorage.setItem('fs-projects-prefill-project-id', projectId);
    setDrillIn(null);
    onNavigateTab?.('projects');
  }, [onNavigateTab]);

  const goToProjectWithPayment = useCallback((projectId, paymentId) => {
    if (projectId) localStorage.setItem('fs-projects-prefill-project-id', projectId);
    if (paymentId) localStorage.setItem('fs-projects-prefill-payment-id', paymentId);
    setDrillIn(null);
    onNavigateTab?.('projects');
  }, [onNavigateTab]);

  const goToEstimatePreview = useCallback((estimateId) => {
    if (estimateId) localStorage.setItem('fs-estimate-prefill-id', estimateId);
    setDrillIn(null);
    onNavigateTab?.('estimates');
  }, [onNavigateTab]);

  const goToLogForRecord = useCallback((dailyLogId) => {
    if (dailyLogId) localStorage.setItem('fs-log-prefill-log-id', dailyLogId);
    setDrillIn(null);
    onNavigateTab?.('log');
  }, [onNavigateTab]);

  const workspaceLabel = profile?.workspace_name?.trim() || 'Workspace';

  const ESTIMATE_STATUS_LABEL = {
    draft: 'Draft', sent: 'Sent', viewed: 'Viewed',
    accepted: 'Accepted', signed: 'Signed', declined: 'Declined',
  };
  const ROLE_LABEL = {
    worker: 'Worker', subcontractor: 'Subcontractor', vendor: 'Vendor',
  };

  // Clients tile rows — active clients, sorted by name.
  const clientRows = useMemo(
    () => [...activeClients]
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map((c) => ({
        key: `client-${c.id}`,
        primary: c.name || c.company_name || 'Unnamed client',
        secondary: c.company_name && c.name
          ? c.company_name
          : (c.email || c.phone || ''),
        amount: '',  // count tile — no per-row currency
        onClick: () => goToClient(c.id),
      })),
    [activeClients, goToClient]
  );

  // Active Projects tile rows — sorted by name; budget context inline.
  const activeProjectRows = useMemo(
    () => [...activeProjects]
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map((p) => {
        const budget = parseFloat(p.total_budget) || 0;
        const spent = parseFloat(p.total_spent) || 0;
        return {
          key: `proj-${p.id}`,
          primary: p.name || 'Untitled project',
          secondary: p.client_name || '',
          amount: budget > 0 ? fmt(budget) : '',
          trailing: budget > 0 && spent > 0 ? `${fmt(spent)} spent` : undefined,
          onClick: () => goToProject(p.id),
        };
      }),
    [activeProjects, goToProject]
  );

  // Estimates tile rows — outstanding first, then closed/signed/declined.
  // Both groups click to Estimates tab via existing fs-estimate-prefill-id.
  const buildEstimateRow = (e, group) => ({
    key: `est-${e.id}`,
    primary: e.title || `Estimate ${e.estimate_number || ''}`.trim() || 'Estimate',
    secondary: `${e.estimate_number || 'EST'}${e.client_name ? ` · ${e.client_name}` : ''}${e.date ? ` · ${fmtDate(e.date)}` : ''}`,
    amount: fmt(parseFloat(e.total) || 0),
    amountClass: group === 'outstanding' ? 'text-primary-hover' : 'text-foreground',
    trailing: ESTIMATE_STATUS_LABEL[e.status] || e.status || '',
    onClick: () => goToEstimatePreview(e.id),
  });
  const estimateRows = useMemo(() => {
    const out = [...outstandingEstimates]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .map((e) => buildEstimateRow(e, 'outstanding'));
    const closed = [...closedEstimates]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .map((e) => buildEstimateRow(e, 'closed'));
    return [...out, ...closed];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outstandingEstimates, closedEstimates, goToEstimatePreview]);

  // Spent This Month tile rows — combined materials + labor for the current
  // month, sorted by created_date desc. Click navigates to parent FSDailyLog
  // for editing via fs-log-prefill-log-id.
  const monthSpentRows = useMemo(() => {
    const all = [
      ...monthMaterials.map((m) => ({ kind: 'Materials', entry: m })),
      ...monthLabor.map((l) => ({ kind: 'Labor', entry: l })),
    ].sort((a, b) =>
      (b.entry.created_date || '').localeCompare(a.entry.created_date || '')
    );
    return all.map(({ kind, entry }) => ({
      key: `${kind.toLowerCase()}-${entry.id}`,
      primary: entry.description || kind,
      secondary: `${kind}${entry.created_date ? ` · ${fmtDate(entry.created_date)}` : ''}`,
      amount: fmt(parseFloat(entry.total_cost) || 0),
      amountClass: 'text-primary',
      onClick: entry.daily_log_id
        ? () => goToLogForRecord(entry.daily_log_id)
        : undefined,
    }));
  }, [monthMaterials, monthLabor, goToLogForRecord]);

  // Received tile rows — same filter as paymentsReceived total above (status
  // settled AND direction received with legacy fallback). Sorted by date
  // desc. Click navigates to that payment's Project Detail with the row
  // ring-flashed via paired fs-projects-prefill-project-id +
  // fs-projects-prefill-payment-id keys (FieldServiceProjects consumes both
  // and triggers the scroll-flash after detail mounts).
  const receivedRows = useMemo(
    () => payments
      .filter((p) => (p.status === 'received' || p.status === 'cleared')
                  && (p.direction || 'received') === 'received')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .map((p) => ({
        key: `pay-${p.id}`,
        primary: p.party_name || 'Client payment',
        secondary: `${p.date ? fmtDate(p.date) : ''}${p.method ? ` · ${p.method}` : ''}${p.reference ? ` · #${p.reference}` : ''}`.replace(/^ · /, ''),
        amount: fmt(parseFloat(p.amount) || 0),
        amountClass: 'text-emerald-400',
        onClick: p.project_id
          ? () => goToProjectWithPayment(p.project_id, p.id)
          : undefined,
      })),
    [payments, goToProjectWithPayment]
  );

  // Team tile rows — workers + subs + vendors from workers_json. Click opens
  // the person edit modal via fs-people-prefill-worker-id (no separate
  // worker detail surface; modal IS the detail surface).
  const teamRows = useMemo(
    () => [...teamPeople]
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map((w) => ({
        key: `worker-${w.id}`,
        primary: w.name || 'Unnamed',
        secondary: w.business_name || ROLE_LABEL[w.role] || '',
        amount: '',
        trailing: ROLE_LABEL[w.role] || '',
        onClick: w.id ? () => goToWorker(w.id) : undefined,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teamPeople, goToWorker]
  );

  // ─── Drill-in config dispatch ────────────────────
  // Mirrors FieldServiceProjects.jsx:1396-1447 drillConfig pattern. One
  // entry per drillable tile. Same shape ProjectTileDrillIn already
  // accepts — no primitive extension needed.
  const drillConfig = {
    clients: {
      title: 'Clients',
      subtitle: `${workspaceLabel} · Active client roster`,
      total: String(activeClients.length),
      rows: clientRows,
      emptyMessage: 'No clients yet.',
    },
    projects: {
      title: 'Active Projects',
      subtitle: `${workspaceLabel} · Projects in progress`,
      total: String(activeProjects.length),
      rows: activeProjectRows,
      emptyMessage: 'No active projects yet. Create your first project or estimate to get started.',
    },
    estimates: {
      title: 'Estimates',
      subtitle: `${workspaceLabel} · ${outstandingEstimates.length} outstanding · ${estimates.length} total`,
      total: String(estimates.length),
      rows: estimateRows,
      emptyMessage: 'No estimates yet.',
      footer: outstandingEstimates.length > 0
        ? 'Outstanding estimates (sent or viewed by client) listed first; signed and closed estimates below.'
        : undefined,
    },
    spent_month: {
      title: 'Spent This Month',
      subtitle: `${workspaceLabel} · Materials and labor logged this month`,
      total: fmt(monthTotal),
      rows: monthSpentRows,
      emptyMessage: 'No materials or labor logged this month yet.',
      footer: 'Spend tracked from materials and labor cost lines. Subcontractor payments tracked separately under Paid Out on Project Detail.',
    },
    received: {
      title: 'Received',
      subtitle: `${workspaceLabel} · Settled income across all projects`,
      total: fmt(paymentsReceived),
      rows: receivedRows,
      emptyMessage: 'No received payments yet. Once a client pays, log it from the Log tab → Client Payment.',
      footer: 'Pending payments are not counted until status flips to received or cleared.',
    },
    team: {
      title: 'Team',
      subtitle: `${workspaceLabel} · Workers, subs, and vendors`,
      total: String(teamCount),
      rows: teamRows,
      emptyMessage: 'No team members yet.',
    },
  };
  const drillCurrent = drillIn ? drillConfig[drillIn] : null;

  // ─── Workspace Guide (Activation Protocol Moment 3) ──────────
  const guideDismissed = profile?.guide_dismissed === true;
  const queryClient = useQueryClient();

  const dismissGuide = useMutation({
    mutationFn: async () => {
      await base44.entities.FieldServiceProfile.update(profile.id, { guide_dismissed: true });
    },
    onSuccess: () => {
      // The `profile` prop reaches FieldServiceHome via MyLane's
      // getMyLaneProfiles server function, cached under
      // `['mylane-profiles-v2', userId]` (DEC-196). The previous bare
      // `['fs-profile']` key matched no live query, so the dismiss UI never
      // updated until React Query's 5-min staleTime expired or a hard reload
      // pulled fresh data. invalidateFSProfiles() centralizes the canonical
      // key so the next cache-key change touches one helper, not 10 sites.
      invalidateFSProfiles(queryClient, currentUser?.id);
    },
    onError: (err) => console.error('Guide dismiss failed:', err),
  });

  const handleDismissGuide = useCallback(() => {
    dismissGuide.mutate();
  }, [dismissGuide]);

  // Smart completion: detect which guide steps are done from real entity data.
  // 'settings' detection is forgiving — any signal that the contractor has
  // personalized the workspace counts (business_name, owner_name, custom
  // workspace_name distinct from the "My Field Service" default, logo, brand
  // color, license number, hourly rate, or workers configured). Earlier the
  // check required business_name specifically, which under-reported completion
  // for contractors who set workspace_name + owner_name but skipped the
  // separate business_name field.
  const completedSteps = useMemo(() => {
    const done = [];
    const wsName = (profile?.workspace_name || '').trim();
    const wsCustomized = wsName.length > 0 && wsName !== 'My Field Service';
    const workersCount = (() => {
      const w = profile?.workers_json;
      const arr = Array.isArray(w) ? w : (w && typeof w === 'object' && Array.isArray(w.items)) ? w.items : [];
      return arr.length;
    })();
    const settingsTouched =
      (profile?.business_name && profile.business_name.trim().length > 0) ||
      (profile?.owner_name && profile.owner_name.trim().length > 0) ||
      wsCustomized ||
      !!profile?.logo_url ||
      !!profile?.brand_color ||
      (profile?.license_number && profile.license_number.trim().length > 0) ||
      (parseFloat(profile?.hourly_rate) || 0) > 0 ||
      workersCount > 0;
    if (settingsTouched) done.push('settings');
    if (fsClients.length > 0) done.push('client');
    if (estimates.length > 0) done.push('estimate');
    if (fsDocuments.length > 0) done.push('documents');
    if (recentLogs.length > 0) done.push('log');
    return done;
  }, [
    profile?.business_name, profile?.owner_name, profile?.workspace_name,
    profile?.logo_url, profile?.brand_color, profile?.license_number,
    profile?.hourly_rate, profile?.workers_json,
    fsClients.length, estimates.length, fsDocuments.length, recentLogs.length,
  ]);

  // Auto-dismiss the guide once all five steps are detected complete. The
  // contractor has already done the work; the guide has nothing left to point
  // at. Single-fire — once dismissed, the persistent flag keeps it gone.
  // Guard with !dismissGuide.isPending so we don't double-fire while the
  // first mutation is in flight.
  useEffect(() => {
    if (
      !guideDismissed &&
      !dismissGuide.isPending &&
      completedSteps.length === 5
    ) {
      dismissGuide.mutate();
    }
  }, [guideDismissed, completedSteps.length, dismissGuide]);

  return (
    <div className="space-y-6">
      {/* Workspace Guide — inline walkthrough for new users.
          Auto-dismisses once all five steps are complete (see useEffect above).
          Manually re-enable from Settings → Workspace Guide toggle. */}
      {!guideDismissed && (
        <WorkspaceGuide
          workspaceType="field_service"
          onDismiss={handleDismissGuide}
          onStepClick={(tab) => onNavigateTab?.(tab)}
          completedSteps={completedSteps}
        />
      )}

      {/* Stats Bar — every tile is a drill-through surface (Seedling A).
          Click opens ProjectTileDrillIn with the constituent records and a
          clarifying note about scope/semantics. Row clicks inside each
          popup navigate to the source record's actual context via
          localStorage prefill (DEC-209 honest navigation). Replaces the
          previous bare onNavigateTab handlers — those routed to a generic
          tab without explaining what the number was made of. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        <button
          type="button"
          onClick={() => setDrillIn('clients')}
          className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-colors min-h-[44px]"
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Clients</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{activeClients.length}</p>
        </button>

        <button
          type="button"
          onClick={() => setDrillIn('projects')}
          className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-colors min-h-[44px]"
        >
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Active Projects</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{activeProjects.length}</p>
        </button>

        <button
          type="button"
          onClick={() => setDrillIn('estimates')}
          className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-colors min-h-[44px]"
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Estimates</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{estimates.length}</p>
          {outstandingEstimates.length > 0 && (
            <p className="text-xs text-primary-hover mt-0.5">{outstandingEstimates.length} outstanding</p>
          )}
        </button>

        <button
          type="button"
          onClick={() => setDrillIn('spent_month')}
          className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-colors min-h-[44px]"
        >
          <div className="flex items-center gap-2 mb-2">
            <HardHat className="h-4 w-4 text-primary" />
            {/* Renamed from "This Month" — actual semantic is outgoing
                materials/labor cost, not income. The previous label sitting
                next to "Received" invited mental-model confusion. */}
            <span className="text-xs text-muted-foreground">Spent This Month</span>
          </div>
          <p className="text-2xl font-bold text-primary">{fmt(monthTotal)}</p>
        </button>

        <button
          type="button"
          onClick={() => setDrillIn('received')}
          className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-colors min-h-[44px]"
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Received</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{fmt(paymentsReceived)}</p>
        </button>

        <button
          type="button"
          onClick={() => setDrillIn('team')}
          className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 transition-colors min-h-[44px]"
        >
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Team</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{teamCount}</p>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onNavigateTab?.('log')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors text-sm min-h-[44px]"
        >
          + Log Today's Work
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab?.('estimates')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-primary text-primary hover:bg-primary/10 transition-colors text-sm font-medium min-h-[44px]"
        >
          + New Estimate
        </button>
      </div>

      {/* Active Project Cards */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Active Projects</h2>
          </div>
          {activeProjects.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigateTab?.('projects')}
              className="text-xs text-primary hover:text-primary-hover"
            >
              View all
            </button>
          )}
        </div>

        {activeProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground/70">
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
                  className="w-full text-left bg-secondary/50 rounded-lg p-4 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                      {project.client_name && (
                        <p className="text-xs text-muted-foreground">{project.client_name}</p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary flex-shrink-0 ml-2">
                      Active
                    </span>
                  </div>
                  {budget > 0 && (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground/70">
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
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Recent Activity</h2>
        </div>

        {recentLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground/70">
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
                  className="bg-secondary/50 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground/70">{fmtShortDate(log.date)}</span>
                    {project && (
                      <span className="text-xs text-primary truncate ml-2">{project.name}</span>
                    )}
                  </div>
                  {taskPreview && (
                    <p className="text-sm text-foreground-soft line-clamp-2">{taskPreview}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Finance Link Hook (future) */}
      {profile?.linked_finance_workspace_id && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground text-center">Financial summary coming soon</p>
        </div>
      )}

      {/* Tile drill-in modal — single component for every tile, mounted at
          the FieldServiceHome root so it overlays the whole Desk page.
          Mirrors FieldServiceProjects.jsx:2545. */}
      <ProjectTileDrillIn
        open={!!drillIn}
        onClose={() => setDrillIn(null)}
        title={drillCurrent?.title}
        subtitle={drillCurrent?.subtitle}
        total={drillCurrent?.total}
        rows={drillCurrent?.rows}
        math={drillCurrent?.math}
        emptyMessage={drillCurrent?.emptyMessage}
        footer={drillCurrent?.footer}
      />
    </div>
  );
}
