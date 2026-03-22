import React, { useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building, Building2, Wrench, DollarSign, Clock,
  TrendingUp, AlertTriangle, Plus, ClipboardList, Megaphone,
} from 'lucide-react';
import WorkspaceGuide from '@/components/workspaces/WorkspaceGuide';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const fmtShortDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + (d.includes('T') ? '' : 'T12:00:00'));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function PropertyManagementHome({ profile, currentUser, onNavigateTab, memberRole, canEdit }) {
  // ─── Role guard ───────────────────────────────────
  if (!memberRole) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>You don't have access to this workspace.</p>
      </div>
    );
  }

  // ─── Query: Property Groups ─────────────────────
  const { data: groups = [] } = useQuery({
    queryKey: ['pm-groups', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.PMPropertyGroup.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Properties ──────────────────────────
  const { data: properties = [] } = useQuery({
    queryKey: ['pm-properties', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.PMProperty.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Expenses ────────────────────────────
  const { data: expenses = [] } = useQuery({
    queryKey: ['pm-expenses', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.PMExpense.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Labor ───────────────────────────────
  const { data: labor = [] } = useQuery({
    queryKey: ['pm-labor', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.PMLaborEntry.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Maintenance Requests ────────────────
  const { data: maintenance = [] } = useQuery({
    queryKey: ['pm-maintenance', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.PMMaintenanceRequest.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Settlements ─────────────────────────
  const { data: settlements = [] } = useQuery({
    queryKey: ['pm-settlements', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.PMSettlement.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Listings ──────────────────────────
  const { data: listings = [] } = useQuery({
    queryKey: ['pm-listings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.PMListing.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Guests ────────────────────────────
  const { data: guests = [] } = useQuery({
    queryKey: ['pm-guests', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.PMGuest.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Derived Stats ──────────────────────────────
  const totalMonthlyRent = useMemo(
    () => properties.reduce((sum, p) => sum + (p.monthly_rent || 0), 0),
    [properties]
  );

  const openMaintenance = useMemo(
    () => maintenance.filter((m) => m.status === 'open' || m.status === 'in_progress'),
    [maintenance]
  );

  const monthlyMgmtFee = useMemo(() => {
    if (groups.length === 0) return 0;
    return groups.reduce((sum, g) => {
      const groupProps = properties.filter((p) => p.group_id === g.id);
      const groupRent = groupProps.reduce((s, p) => s + (p.monthly_rent || 0), 0);
      return sum + groupRent * ((g.management_fee_pct || 0) / 100);
    }, 0);
  }, [groups, properties]);

  // Group properties by group_id for summaries
  const groupSummaries = useMemo(() => {
    return groups.map((group) => {
      const groupProps = properties.filter((p) => p.group_id === group.id);
      const grossRent = groupProps.reduce((s, p) => s + (p.monthly_rent || 0), 0);
      const occupiedCount = groupProps.filter((p) => p.status === 'occupied').length;
      return {
        ...group,
        properties: groupProps,
        grossRent,
        occupiedCount,
        totalUnits: groupProps.length,
      };
    });
  }, [groups, properties]);

  // Active listings count
  const activeListings = useMemo(
    () => listings.filter((l) => l.status === 'active').length,
    [listings]
  );

  // Active guests count (confirmed + checked_in)
  const activeGuests = useMemo(
    () => guests.filter((g) => g.status === 'confirmed' || g.status === 'checked_in').length,
    [guests]
  );

  // Recent activity (last 10 across expenses, labor, maintenance, guests)
  const recentActivity = useMemo(() => {
    const items = [];
    expenses.forEach((e) => items.push({ type: 'expense', date: e.date || e.created_date, data: e }));
    labor.forEach((l) => items.push({ type: 'labor', date: l.date || l.created_date, data: l }));
    maintenance.forEach((m) => items.push({ type: 'maintenance', date: m.reported_date || m.created_date, data: m }));
    guests.forEach((g) => items.push({ type: 'guest', date: g.check_in || g.created_date, data: g }));
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return items.slice(0, 10);
  }, [expenses, labor, maintenance, guests]);

  // Reserve health per group
  const reserveHealth = useMemo(() => {
    return groupSummaries.map((gs) => {
      const target = gs.emergency_reserve_target || 0;
      // Sum finalized settlement reserves for this group
      const groupSettlements = settlements.filter((s) => s.group_id === gs.id && s.status === 'finalized');
      const totalEmergencyReserve = groupSettlements.reduce((s, st) => s + (st.emergency_reserve || 0), 0);
      const totalMaintenanceReserve = groupSettlements.reduce((s, st) => s + (st.maintenance_reserve || 0), 0);
      return {
        groupName: gs.name,
        emergencyReserve: totalEmergencyReserve,
        maintenanceReserve: totalMaintenanceReserve,
        target,
        pct: target > 0 ? Math.min(100, (totalEmergencyReserve / target) * 100) : 0,
      };
    });
  }, [groupSummaries, settlements]);

  // ─── Workspace Guide (Activation Protocol Moment 3) ──────────
  const guideDismissed = profile?.guide_dismissed === true;
  const queryClient = useQueryClient();

  const dismissGuide = useMutation({
    mutationFn: async () => {
      await base44.entities.PMPropertyProfile.update(profile.id, { guide_dismissed: true });
    },
    onSuccess: () => {
      queryClient.setQueryData(['pm-profiles', profile?.user_id], (old) =>
        Array.isArray(old)
          ? old.map((p) => (p.id === profile?.id ? { ...p, guide_dismissed: true } : p))
          : old
      );
      queryClient.invalidateQueries(['pm-profiles']);
    },
    onError: (err) => console.error('Guide dismiss failed:', err),
  });

  const handleDismissGuide = useCallback(() => {
    dismissGuide.mutate();
  }, [dismissGuide]);

  // Smart completion: detect which guide steps are done
  const guideCompletedSteps = useMemo(() => {
    const done = [];
    // 'settings' — complete if workspace has a custom name
    if (profile?.workspace_name || profile?.business_name) {
      done.push('settings');
    }
    // 'properties' — complete if at least 1 property group exists
    if (groups.length > 0) {
      done.push('properties');
    }
    // 'expense' — complete if at least 1 expense exists
    if (expenses.length > 0) {
      done.push('expense');
    }
    // 'maintenance' — complete if at least 1 maintenance request exists
    if (maintenance.length > 0) {
      done.push('maintenance');
    }
    return done;
  }, [profile?.workspace_name, profile?.business_name, groups.length, expenses.length, maintenance.length]);

  return (
    <div className="space-y-6">
      {/* Workspace Guide — inline walkthrough for new users */}
      {!guideDismissed && (
        <WorkspaceGuide
          workspaceType="property_management"
          onDismiss={handleDismissGuide}
          onStepClick={(tab) => onNavigateTab?.(tab)}
          completedSteps={guideCompletedSteps}
        />
      )}

      {/* ─── Portfolio Stats Bar ──────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-slate-400">Total Monthly Rent</span>
          </div>
          <p className="text-2xl font-bold text-amber-500">{fmt(totalMonthlyRent)}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-slate-400">Properties</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">
            {properties.length}
            <span className="text-sm font-normal text-slate-400 ml-1">
              in {groups.length} {groups.length === 1 ? 'group' : 'groups'}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab?.('maintenance')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-slate-400">Open Requests</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{openMaintenance.length}</p>
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-slate-400">Mgmt Fee (est.)</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{fmt(monthlyMgmtFee)}</p>
        </div>
      </div>

      {/* ─── Quick Actions ────────────────────────── */}
      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => onNavigateTab?.('finances')}
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors text-sm min-h-[44px]"
        >
          <Plus className="h-4 w-4" /> Add Expense
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab?.('finances')}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-500 text-amber-500 hover:bg-amber-500/10 transition-colors text-sm font-medium min-h-[44px]"
        >
          <ClipboardList className="h-4 w-4" /> Log Labor
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab?.('settlements')}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent transition-colors text-sm font-medium min-h-[44px]"
        >
          <DollarSign className="h-4 w-4" /> New Settlement
        </button>
        <button
          type="button"
          onClick={() => onNavigateTab?.('listings')}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent transition-colors text-sm font-medium min-h-[44px]"
        >
          <Megaphone className="h-4 w-4" /> Create Listing
        </button>
      </div>

      {/* ─── Property Group Summaries ─────────────── */}
      {groupSummaries.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-100">Property Groups</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab?.('properties')}
              className="text-xs text-amber-500 hover:text-amber-400"
            >
              View all
            </button>
          </div>

          <div className="space-y-4">
            {groupSummaries.map((gs) => (
              <div key={gs.id} className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-slate-100">{gs.name}</p>
                    <p className="text-xs text-slate-400">
                      {gs.occupiedCount}/{gs.totalUnits} occupied · {gs.structure_type?.replace(/_/g, ' ') || '—'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-amber-500">{fmt(gs.grossRent)}/mo</span>
                </div>

                {/* Unit list */}
                <div className="space-y-1.5">
                  {gs.properties.map((prop) => (
                    <div key={prop.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-slate-300 truncate">{prop.name}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          prop.status === 'occupied'
                            ? 'bg-amber-500/20 text-amber-500'
                            : prop.status === 'maintenance'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-slate-700 text-slate-400'
                        }`}>
                          {prop.status}
                        </span>
                      </div>
                      <span className="text-slate-400 flex-shrink-0 ml-2">{fmt(prop.monthly_rent)}</span>
                    </div>
                  ))}
                </div>

                {/* Reserve percentages */}
                <div className="flex gap-4 mt-3 pt-2 border-t border-slate-700/50">
                  <span className="text-[10px] text-slate-500">
                    Mgmt: {gs.management_fee_pct || 0}%
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Maint: {gs.maintenance_reserve_pct || 0}%
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Emerg: {gs.emergency_reserve_pct || 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {groupSummaries.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <Building2 className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-4">No property groups yet</p>
          <button
            type="button"
            onClick={() => onNavigateTab?.('properties')}
            className="text-sm text-amber-500 hover:text-amber-400 font-medium"
          >
            Add your first property group
          </button>
        </div>
      )}

      {/* ─── Reserve Health ───────────────────────── */}
      {reserveHealth.some((r) => r.target > 0) && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-100">Reserve Health</h2>
          </div>

          <div className="space-y-4">
            {reserveHealth.filter((r) => r.target > 0).map((r, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300">{r.groupName}</span>
                  <span className="text-xs text-slate-400">
                    {fmt(r.emergencyReserve)} / {fmt(r.target)}
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Recent Activity ──────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">Recent Activity</h2>
        </div>

        {recentActivity.length === 0 ? (
          <p className="text-sm text-slate-500">
            No activity yet. Record an expense or log labor to see it here.
          </p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">{fmtShortDate(item.date)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.type === 'expense'
                      ? 'bg-amber-500/20 text-amber-500'
                      : item.type === 'labor'
                        ? 'bg-blue-500/20 text-blue-400'
                        : item.type === 'guest'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-slate-700 text-slate-400'
                  }`}>
                    {item.type}
                  </span>
                </div>
                <p className="text-sm text-slate-300 truncate">
                  {item.type === 'expense' && `${item.data.category || 'Expense'}: ${item.data.description || ''}`}
                  {item.type === 'labor' && `${item.data.worker_name || 'Labor'}: ${item.data.description || `${item.data.hours || 0}h`}`}
                  {item.type === 'maintenance' && `${item.data.title || 'Maintenance request'}`}
                  {item.type === 'guest' && `${item.data.guest_name || 'Guest'}: ${item.data.booking_source || 'direct'}`}
                </p>
                {item.type === 'expense' && (
                  <span className="text-xs text-amber-500 font-medium">{fmt(item.data.amount)}</span>
                )}
                {item.type === 'labor' && (
                  <span className="text-xs text-amber-500 font-medium">{fmt(item.data.total)}</span>
                )}
                {item.type === 'guest' && item.data.total_amount > 0 && (
                  <span className="text-xs text-amber-500 font-medium">{fmt(item.data.total_amount)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Finance Link Hook (future) ──────────── */}
      {profile?.linked_finance_workspace_id && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-400 text-center">Financial summary coming soon</p>
        </div>
      )}
    </div>
  );
}
