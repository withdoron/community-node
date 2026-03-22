import React, { useState, useMemo, useEffect } from 'react';
import { Building2, Plus, Home } from 'lucide-react';
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
import { toast } from 'sonner';
import PropertyGroupCard from './PropertyGroupCard';
import PropertyGroupFormDialog from './PropertyGroupFormDialog';
import PropertyUnitFormDialog from './PropertyUnitFormDialog';
import StandalonePropertyDialog from './StandalonePropertyDialog';

function sortGroupsByName(groups) {
  return [...groups].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

function sortUnits(units) {
  return [...units].sort((a, b) => {
    const labelA = (a.unit_label || a.name || '').toString();
    const labelB = (b.unit_label || b.name || '').toString();
    if (labelA !== labelB) return labelA.localeCompare(labelB, undefined, { numeric: true });
    return (a.name || '').localeCompare(b.name || '');
  });
}

export default function PropertyManagementProperties({ profile, currentUser, memberRole, canEdit }) {
  // Role guard
  if (!memberRole) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>You don't have access to this workspace.</p>
      </div>
    );
  }

  const profileId = profile?.id;

  const [groups, setGroups] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [standaloneDialogOpen, setStandaloneDialogOpen] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [addUnitGroupId, setAddUnitGroupId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [g, p] = await Promise.all([
          base44.entities.PMPropertyGroup.filter({ profile_id: profileId }),
          base44.entities.PMProperty.filter({ profile_id: profileId }),
        ]);
        if (!cancelled) {
          setGroups(Array.isArray(g) ? g : []);
          setProperties(Array.isArray(p) ? p : []);
        }
      } catch (err) {
        console.error('Failed to load properties:', err);
        toast.error('Failed to load properties. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [profileId, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const groupsById = useMemo(() => {
    const map = {};
    groups.forEach((g) => { map[g.id] = g; });
    return map;
  }, [groups]);

  const propertiesByGroupId = useMemo(() => {
    const map = {};
    properties.forEach((p) => {
      const gid = p.group_id || '__standalone__';
      if (!map[gid]) map[gid] = [];
      map[gid].push(p);
    });
    Object.keys(map).forEach((gid) => {
      map[gid] = sortUnits(map[gid]);
    });
    return map;
  }, [properties]);

  const sortedGroups = useMemo(() => sortGroupsByName(groups), [groups]);

  const unitsForGroup = (g) => propertiesByGroupId[g.id] || [];
  const groupForUnitDialog = addUnitGroupId
    ? groupsById[addUnitGroupId]
    : editingUnit && editingUnit.group_id
      ? groupsById[editingUnit.group_id]
      : null;

  // --- Handlers ---

  const handleSaveGroup = async (data) => {
    setSaving(true);
    try {
      if (editingGroup) {
        await base44.entities.PMPropertyGroup.update(editingGroup.id, data);
      } else {
        await base44.entities.PMPropertyGroup.create({ ...data, profile_id: profileId });
      }
      setGroupDialogOpen(false);
      setEditingGroup(null);
      toast.success('Property group saved.');
      refresh();
    } catch (err) {
      console.error('Save group error:', err);
      toast.error('Failed to save property group. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUnit = async (data) => {
    setSaving(true);
    try {
      if (editingUnit) {
        await base44.entities.PMProperty.update(editingUnit.id, data);
      } else {
        await base44.entities.PMProperty.create({ ...data, profile_id: profileId });
      }
      setUnitDialogOpen(false);
      setEditingUnit(null);
      setAddUnitGroupId(null);
      toast.success('Unit saved.');
      refresh();
    } catch (err) {
      console.error('Save unit error:', err);
      toast.error('Failed to save unit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStandalone = async (formData) => {
    setSaving(true);
    try {
      const group = await base44.entities.PMPropertyGroup.create({
        profile_id: profileId,
        name: formData.name,
        address: formData.address,
        structure_type: 'single',
        management_fee_pct: 10,
        maintenance_reserve_pct: 10,
        emergency_reserve_pct: 5,
        has_insurance: false,
      });
      await base44.entities.PMProperty.create({
        profile_id: profileId,
        name: formData.name,
        group_id: group.id,
        address: formData.address,
        property_type: 'single_family',
        monthly_rent: formData.monthly_rent,
        status: formData.status,
        tenant_name: formData.tenant_name,
        tenant_email: formData.tenant_email,
        tenant_phone: formData.tenant_phone,
        lease_start: formData.lease_start,
        lease_end: formData.lease_end,
        has_garage: formData.has_garage,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        notes: formData.notes,
      });
      setStandaloneDialogOpen(false);
      toast.success('Property created.');
      refresh();
    } catch (err) {
      console.error('Standalone create error:', err);
      toast.error('Failed to create property. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setGroupDialogOpen(true);
  };

  const handleDeleteGroup = (group) => {
    setDeleteTarget(group);
    setDeleteType('group');
  };

  const handleAddUnit = (group) => {
    setAddUnitGroupId(group.id);
    setEditingUnit(null);
    setUnitDialogOpen(true);
  };

  const handleEditUnit = (unit) => {
    setEditingUnit(unit);
    setAddUnitGroupId(unit.group_id || null);
    setUnitDialogOpen(true);
  };

  const handleDeleteUnit = (unit) => {
    setDeleteTarget(unit);
    setDeleteType('unit');
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      if (deleteType === 'group' && deleteTarget) {
        // Server-side cascade delete (group + units + related financial records)
        const result = await base44.functions.invoke('managePMWorkspace', {
          action: 'delete_group_cascade',
          profile_id: profileId,
          group_id: deleteTarget.id,
        });
        if (result.error) throw new Error(result.error);
      } else if (deleteType === 'unit' && deleteTarget) {
        await base44.entities.PMProperty.delete(deleteTarget.id);
      }
      setDeleteTarget(null);
      setDeleteType(null);
      toast.success('Deleted.');
      refresh();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // --- Render ---

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-40 bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Properties</h2>
          <p className="text-sm text-slate-400 mt-1">
            {sortedGroups.length === 0
              ? 'No property groups yet'
              : `${sortedGroups.length} group${sortedGroups.length !== 1 ? 's' : ''}, ${properties.length} unit${properties.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setEditingGroup(null);
              setGroupDialogOpen(true);
            }}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2"
          >
            <Plus className="w-4 h-4" /> Add Property Group
          </Button>
          <Button
            variant="outline"
            onClick={() => setStandaloneDialogOpen(true)}
            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100 gap-2"
          >
            <Home className="w-4 h-4" /> Add Standalone
          </Button>
        </div>
      </div>

      {/* Content */}
      {sortedGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <Building2 className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-1">No properties yet</h3>
          <p className="text-slate-400 mb-6 text-center max-w-sm">
            Add a property group or standalone property to get started
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => setGroupDialogOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2"
            >
              <Plus className="w-4 h-4" /> Add Property Group
            </Button>
            <Button
              variant="outline"
              onClick={() => setStandaloneDialogOpen(true)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100 gap-2"
            >
              <Home className="w-4 h-4" /> Add Standalone
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map((group) => (
            <PropertyGroupCard
              key={group.id}
              group={group}
              units={unitsForGroup(group)}
              onEdit={handleEditGroup}
              onDelete={handleDeleteGroup}
              onAddUnit={() => handleAddUnit(group)}
              onEditUnit={handleEditUnit}
              onDeleteUnit={handleDeleteUnit}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <PropertyGroupFormDialog
        open={groupDialogOpen}
        onClose={() => {
          setGroupDialogOpen(false);
          setEditingGroup(null);
        }}
        group={editingGroup}
        onSave={handleSaveGroup}
      />

      <PropertyUnitFormDialog
        open={unitDialogOpen}
        onClose={() => {
          setUnitDialogOpen(false);
          setEditingUnit(null);
          setAddUnitGroupId(null);
        }}
        unit={editingUnit}
        groupId={addUnitGroupId || (editingUnit && editingUnit.group_id) || null}
        groupAddress={groupForUnitDialog ? groupForUnitDialog.address : ''}
        onSave={handleSaveUnit}
      />

      <StandalonePropertyDialog
        open={standaloneDialogOpen}
        onClose={() => setStandaloneDialogOpen(false)}
        onSave={handleSaveStandalone}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-slate-900 border border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">
              {deleteType === 'group' ? 'Delete property group?' : 'Delete unit?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {deleteType === 'group' ? (
                <>
                  This will permanently delete &quot;{deleteTarget?.name}&quot; and all units within
                  it. This action cannot be undone.
                </>
              ) : (
                <>
                  This will permanently delete &quot;{deleteTarget?.name}&quot;. This action cannot
                  be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-500 text-white"
              disabled={saving}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
