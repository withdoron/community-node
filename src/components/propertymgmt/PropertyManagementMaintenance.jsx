import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Wrench } from 'lucide-react';
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

import MaintenanceFilters from './MaintenanceFilters';
import MaintenanceRequestCard from './MaintenanceRequestCard';
import MaintenanceRequestForm from './MaintenanceRequestForm';
import MaintenanceCompleteDialog from './MaintenanceCompleteDialog';

const PRIORITY_ORDER = { emergency: 0, high: 1, medium: 2, low: 3 };

export default function PropertyManagementMaintenance({ profile }) {
  const profileId = profile?.id;

  // Data
  const [requests, setRequests] = useState([]);
  const [properties, setProperties] = useState([]);
  const [groups, setGroups] = useState([]);
  const [laborEntries, setLaborEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // UI
  const [activeStatus, setActiveStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completingRequest, setCompletingRequest] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Load data
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [req, prop, grp, lab] = await Promise.all([
          base44.entities.PMMaintenanceRequest.filter({ profile_id: profileId }),
          base44.entities.PMProperty.filter({ profile_id: profileId }),
          base44.entities.PMPropertyGroup.filter({ profile_id: profileId }),
          base44.entities.PMLaborEntry.filter({ profile_id: profileId }),
        ]);
        if (!cancelled) {
          setRequests(req || []);
          setProperties(prop || []);
          setGroups(grp || []);
          setLaborEntries(lab || []);
        }
      } catch (err) {
        console.error('Maintenance data load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [profileId, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  // Worker names for autocomplete (from labor entries)
  const workerNames = useMemo(() => {
    const names = new Set();
    (laborEntries || []).forEach((e) => {
      if (e.worker_name) names.add(e.worker_name);
    });
    return Array.from(names).sort();
  }, [laborEntries]);

  // Property labels
  const propertyLabels = useMemo(() => {
    const groupsById = {};
    (groups || []).forEach((g) => { groupsById[g.id] = g; });
    const labels = {};
    (properties || []).forEach((p) => {
      const groupName = groupsById[p.group_id]?.name || '—';
      labels[p.id] = `${groupName} — ${p.name}`;
    });
    return labels;
  }, [groups, properties]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { all: 0, submitted: 0, triaged: 0, assigned: 0, in_progress: 0, complete: 0, cancelled: 0 };
    (requests || []).forEach((r) => {
      counts.all++;
      if (counts[r.status] !== undefined) counts[r.status]++;
    });
    return counts;
  }, [requests]);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...(requests || [])];
    if (activeStatus !== 'all') {
      list = list.filter((r) => r.status === activeStatus);
    }
    if (selectedPriority !== 'all') {
      list = list.filter((r) => r.priority === selectedPriority);
    }
    // Sort: emergency first, then by date descending
    list.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 9;
      const pb = PRIORITY_ORDER[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      return (b.reported_date || '').localeCompare(a.reported_date || '');
    });
    return list;
  }, [requests, activeStatus, selectedPriority]);

  // ── CRUD ──
  const handleSaveRequest = async (data) => {
    try {
      if (editingRequest) {
        await base44.entities.PMMaintenanceRequest.update(editingRequest.id, data);
      } else {
        await base44.entities.PMMaintenanceRequest.create({
          ...data,
          profile_id: profileId,
        });
      }
      setFormOpen(false);
      setEditingRequest(null);
      refresh();
    } catch (err) {
      console.error('Maintenance save error:', err);
    }
  };

  const handleStatusChange = async (request, newStatus) => {
    try {
      await base44.entities.PMMaintenanceRequest.update(request.id, {
        status: newStatus,
      });
      refresh();
    } catch (err) {
      console.error('Status change error:', err);
    }
  };

  const handleMarkComplete = (request) => {
    setCompletingRequest(request);
    setCompleteDialogOpen(true);
  };

  const handleCompleteSubmit = async (data) => {
    if (!completingRequest) return;
    try {
      // Update the request
      await base44.entities.PMMaintenanceRequest.update(completingRequest.id, {
        status: data.status,
        actual_cost: data.actual_cost,
        completed_date: data.completed_date,
        notes: data.notes,
        completion_photos: data.completion_photos,
      });

      // Create expense if flagged
      if (data.logExpense && data.expenseData) {
        // Resolve group_id from property
        let groupId = null;
        if (data.expenseData.property_id) {
          const prop = (properties || []).find(
            (p) => p.id === data.expenseData.property_id
          );
          if (prop) groupId = prop.group_id;
        }
        await base44.entities.PMExpense.create({
          ...data.expenseData,
          group_id: groupId,
          profile_id: profileId,
        });
      }

      // Create labor entry if flagged
      if (data.logLabor && data.laborData) {
        await base44.entities.PMLaborEntry.create({
          ...data.laborData,
          profile_id: profileId,
        });
      }

      setCompleteDialogOpen(false);
      setCompletingRequest(null);
      refresh();
    } catch (err) {
      console.error('Complete request error:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await base44.entities.PMMaintenanceRequest.delete(deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4 animate-pulse">
            <div className="h-5 w-48 bg-slate-700 rounded mb-3" />
            <div className="h-4 w-full bg-slate-700 rounded mb-2" />
            <div className="h-4 w-2/3 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-100">Maintenance</h2>
        <Button
          onClick={() => {
            setEditingRequest(null);
            setFormOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Request
        </Button>
      </div>

      {/* Filters */}
      <MaintenanceFilters
        activeStatus={activeStatus}
        statusCounts={statusCounts}
        selectedPriority={selectedPriority}
        onStatusChange={setActiveStatus}
        onPriorityChange={setSelectedPriority}
      />

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <Wrench className="h-7 w-7 text-amber-500" />
          </div>
          {requests.length === 0 ? (
            <>
              <p className="text-slate-300 font-medium mb-1">No maintenance requests yet</p>
              <p className="text-slate-500 text-sm text-center max-w-xs">
                Create your first maintenance request to start tracking repairs and upkeep.
              </p>
            </>
          ) : (
            <p className="text-slate-400 text-sm">No requests match your filters</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <MaintenanceRequestCard
              key={req.id}
              request={req}
              propertyLabel={propertyLabels[req.property_id] || '—'}
              onEdit={(r) => {
                setEditingRequest(r);
                setFormOpen(true);
              }}
              onDelete={(r) => setDeleteTarget(r)}
              onStatusChange={handleStatusChange}
              onMarkComplete={handleMarkComplete}
            />
          ))}
        </div>
      )}

      {/* ── Dialogs ── */}
      <MaintenanceRequestForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingRequest(null);
        }}
        request={editingRequest}
        properties={properties}
        groups={groups}
        workerNames={workerNames}
        onSave={handleSaveRequest}
      />

      <MaintenanceCompleteDialog
        open={completeDialogOpen}
        onClose={() => {
          setCompleteDialogOpen(false);
          setCompletingRequest(null);
        }}
        request={completingRequest}
        onSave={handleCompleteSubmit}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-slate-900 border border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">
              Delete Maintenance Request?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently remove &ldquo;{deleteTarget?.title}&rdquo; and cannot be undone.
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
