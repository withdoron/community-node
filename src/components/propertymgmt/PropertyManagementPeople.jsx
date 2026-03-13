import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserCheck, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { base44 } from '@/api/base44Client';

import TenantList from './TenantList';
import TenantEditDialog from './TenantEditDialog';
import GuestList from './GuestList';
import GuestFormDialog from './GuestFormDialog';
import GuestStats from './GuestStats';

const SUB_TABS = [
  { key: 'tenants', label: 'Tenants', icon: UserCheck },
  { key: 'guests', label: 'Guests', icon: Users },
];

export default function PropertyManagementPeople({ profile }) {
  const profileId = profile?.id;

  // Data
  const [properties, setProperties] = useState([]);
  const [groups, setGroups] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // UI
  const [subTab, setSubTab] = useState('tenants');
  const [tenantEditTarget, setTenantEditTarget] = useState(null);
  const [guestFormOpen, setGuestFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Load data
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [prop, grp, gst] = await Promise.all([
          base44.entities.PMProperty.filter({ profile_id: profileId }),
          base44.entities.PMPropertyGroup.filter({ profile_id: profileId }),
          base44.entities.PMGuest.filter({ profile_id: profileId }),
        ]);
        if (!cancelled) {
          setProperties(prop || []);
          setGroups(grp || []);
          setGuests(gst || []);
        }
      } catch (err) {
        console.error('People data load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [profileId, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  // Property labels
  const groupsById = useMemo(() => {
    const m = {};
    (groups || []).forEach((g) => { m[g.id] = g; });
    return m;
  }, [groups]);

  const propertyLabels = useMemo(() => {
    const labels = {};
    (properties || []).forEach((p) => {
      const groupName = groupsById[p.group_id]?.name || '';
      labels[p.id] = groupName ? `${groupName} — ${p.name}` : p.name;
    });
    return labels;
  }, [properties, groupsById]);

  // Build tenant list from property records
  const tenants = useMemo(() => {
    return (properties || [])
      .filter((p) => p.tenant_name)
      .map((p) => ({
        property_id: p.id,
        tenant_name: p.tenant_name,
        tenant_email: p.tenant_email || '',
        tenant_phone: p.tenant_phone || '',
        lease_start: p.lease_start || null,
        lease_end: p.lease_end || null,
        propertyLabel: propertyLabels[p.id] || p.name,
        monthly_rent: p.monthly_rent,
        status: p.status,
      }))
      .sort((a, b) => (a.tenant_name || '').localeCompare(b.tenant_name || ''));
  }, [properties, propertyLabels]);

  // Sorted guests (most recent first)
  const sortedGuests = useMemo(() => {
    return [...(guests || [])].sort((a, b) => {
      const statusOrder = { checked_in: 0, confirmed: 1, checked_out: 2, cancelled: 3 };
      const sa = statusOrder[a.status] ?? 9;
      const sb = statusOrder[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      return (b.check_in || '').localeCompare(a.check_in || '');
    });
  }, [guests]);

  // ── Tenant CRUD (updates PMProperty) ──
  const handleSaveTenant = useCallback(
    async (propertyId, data) => {
      try {
        await base44.entities.PMProperty.update(propertyId, data);
        setTenantEditTarget(null);
        refresh();
      } catch (err) {
        console.error('Tenant save error:', err);
      }
    },
    []
  );

  // ── Guest CRUD ──
  const handleSaveGuest = useCallback(
    async (data) => {
      try {
        if (editingGuest) {
          await base44.entities.PMGuest.update(editingGuest.id, data);
        } else {
          await base44.entities.PMGuest.create({
            ...data,
            profile_id: profileId,
          });
        }
        setGuestFormOpen(false);
        setEditingGuest(null);
        refresh();
      } catch (err) {
        console.error('Guest save error:', err);
      }
    },
    [editingGuest, profileId]
  );

  const handleGuestStatusChange = useCallback(
    async (guest, newStatus) => {
      try {
        const updates = { status: newStatus };

        await base44.entities.PMGuest.update(guest.id, updates);

        // Auto-create income when checking out
        if (newStatus === 'checked_out' && guest.total_amount > 0) {
          try {
            let groupId = null;
            if (guest.property_id) {
              const prop = (properties || []).find((p) => p.id === guest.property_id);
              if (prop) groupId = prop.group_id;
            }
            await base44.entities.PMExpense.create({
              profile_id: profileId,
              group_id: groupId,
              property_id: guest.property_id || null,
              category: 'rent',
              description: `Guest: ${guest.guest_name || 'Unknown'} (${guest.booking_source || 'direct'})`,
              amount: guest.total_amount,
              date: guest.check_out || new Date().toISOString().slice(0, 10),
              type: 'income',
              reconciled: false,
              reimbursement_status: 'not_applicable',
              paid_by: 'property',
            });
          } catch (e) {
            // Non-critical — income creation is best-effort
          }
        }

        refresh();
      } catch (err) {
        console.error('Guest status change error:', err);
      }
    },
    [properties, profileId]
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await base44.entities.PMGuest.delete(deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      console.error('Guest delete error:', err);
    }
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-3 animate-pulse">
              <div className="h-3 w-16 bg-slate-700 rounded mb-2" />
              <div className="h-5 w-12 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4 animate-pulse">
            <div className="h-5 w-40 bg-slate-700 rounded mb-2" />
            <div className="h-4 w-24 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-tab toggle + action */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSubTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-md transition-colors min-h-[40px] ${
                  subTab === tab.key
                    ? 'bg-amber-500 text-black font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ml-0.5 ${
                  subTab === tab.key
                    ? 'bg-black/20 text-black'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {tab.key === 'tenants' ? tenants.length : guests.length}
                </span>
              </button>
            );
          })}
        </div>

        {subTab === 'guests' && (
          <Button
            onClick={() => {
              setEditingGuest(null);
              setGuestFormOpen(true);
            }}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Guest
          </Button>
        )}
      </div>

      {/* ── Tenants sub-tab ── */}
      {subTab === 'tenants' && (
        <TenantList
          tenants={tenants}
          onEdit={setTenantEditTarget}
        />
      )}

      {/* ── Guests sub-tab ── */}
      {subTab === 'guests' && (
        <>
          {guests.length > 0 && <GuestStats guests={guests} />}
          <GuestList
            guests={sortedGuests}
            propertyLabels={propertyLabels}
            onEdit={(g) => {
              setEditingGuest(g);
              setGuestFormOpen(true);
            }}
            onDelete={setDeleteTarget}
            onStatusAction={handleGuestStatusChange}
          />
        </>
      )}

      {/* ── Dialogs ── */}
      <TenantEditDialog
        open={!!tenantEditTarget}
        onClose={() => setTenantEditTarget(null)}
        tenant={tenantEditTarget}
        onSave={handleSaveTenant}
      />

      <GuestFormDialog
        open={guestFormOpen}
        onClose={() => {
          setGuestFormOpen(false);
          setEditingGuest(null);
        }}
        guest={editingGuest}
        properties={properties}
        groups={groups}
        onSave={handleSaveGuest}
      />

      {/* Guest delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-slate-900 border border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">
              Delete this guest?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently remove &ldquo;{deleteTarget?.guest_name}&rdquo;. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
