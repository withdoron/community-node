import React, { useState, useMemo, useEffect } from 'react';
import { Users, Plus, AlertTriangle } from 'lucide-react';
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
import OwnerCard from './OwnerCard';
import OwnerFormDialog from './OwnerFormDialog';
import OwnershipStakeFormDialog from './OwnershipStakeFormDialog';
import DistributionSplitFormDialog from './DistributionSplitFormDialog';

function sortOwnersByName(list) {
  return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export default function PropertyManagementOwners({ profile, currentUser }) {
  // Ownership guard
  if (profile && currentUser && profile.user_id !== currentUser.id) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>You don't have access to this workspace.</p>
      </div>
    );
  }

  const profileId = profile?.id;

  const [owners, setOwners] = useState([]);
  const [stakes, setStakes] = useState([]);
  const [splits, setSplits] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [stakeDialogOpen, setStakeDialogOpen] = useState(false);
  const [editingStake, setEditingStake] = useState(null);
  const [stakeOwnerId, setStakeOwnerId] = useState(null);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [editingSplit, setEditingSplit] = useState(null);
  const [splitOwnerId, setSplitOwnerId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [o, s, sp, g] = await Promise.all([
          base44.entities.PMOwner.filter({ profile_id: profileId }),
          base44.entities.PMOwnershipStake.filter({ profile_id: profileId }),
          base44.entities.PMDistributionSplit.filter({ profile_id: profileId }),
          base44.entities.PMPropertyGroup.filter({ profile_id: profileId }),
        ]);
        if (!cancelled) {
          setOwners(Array.isArray(o) ? o : []);
          setStakes(Array.isArray(s) ? s : []);
          setSplits(Array.isArray(sp) ? sp : []);
          setGroups(Array.isArray(g) ? g : []);
        }
      } catch (err) {
        console.error('Failed to load owners:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [profileId, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const ownershipTotalByGroup = useMemo(() => {
    const totals = {};
    stakes.forEach((s) => {
      totals[s.group_id] = (totals[s.group_id] || 0) + (Number(s.ownership_pct) || 0);
    });
    return totals;
  }, [stakes]);

  const sortedOwners = useMemo(() => sortOwnersByName(owners), [owners]);

  const getStakesForOwner = (ownerId) =>
    stakes.filter((s) => s.owner_id === ownerId);
  const getSplitsGiving = (ownerId) =>
    splits.filter((s) => s.from_owner_id === ownerId);
  const getSplitsReceiving = (ownerId) =>
    splits.filter((s) => s.to_owner_id === ownerId);
  const getFromOwnerStakes = (ownerId) =>
    stakes.filter((s) => s.owner_id === ownerId);

  // --- Owner CRUD ---

  const handleSaveOwner = async (data) => {
    setSaving(true);
    try {
      if (editingOwner) {
        await base44.entities.PMOwner.update(editingOwner.id, data);
      } else {
        await base44.entities.PMOwner.create({ ...data, profile_id: profileId });
      }
      setOwnerDialogOpen(false);
      setEditingOwner(null);
      refresh();
    } catch (err) {
      console.error('Save owner error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditOwner = (owner) => {
    setEditingOwner(owner);
    setOwnerDialogOpen(true);
  };

  const handleDeleteOwner = (owner) => {
    setDeleteTarget(owner);
    setDeleteType('owner');
  };

  // --- Stake CRUD ---

  const handleSaveStake = async (data) => {
    setSaving(true);
    try {
      if (editingStake) {
        await base44.entities.PMOwnershipStake.update(editingStake.id, data);
      } else {
        await base44.entities.PMOwnershipStake.create({ ...data, profile_id: profileId });
      }
      setStakeDialogOpen(false);
      setEditingStake(null);
      setStakeOwnerId(null);
      refresh();
    } catch (err) {
      console.error('Save stake error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddStake = (owner) => {
    setStakeOwnerId(owner.id);
    setEditingStake(null);
    setStakeDialogOpen(true);
  };

  const handleEditStake = (stake) => {
    setEditingStake(stake);
    setStakeOwnerId(stake.owner_id);
    setStakeDialogOpen(true);
  };

  const handleDeleteStake = (stake) => {
    setDeleteTarget(stake);
    setDeleteType('stake');
  };

  // --- Split CRUD ---

  const handleSaveSplit = async (data) => {
    setSaving(true);
    try {
      if (editingSplit) {
        await base44.entities.PMDistributionSplit.update(editingSplit.id, data);
      } else {
        await base44.entities.PMDistributionSplit.create({ ...data, profile_id: profileId });
      }
      setSplitDialogOpen(false);
      setEditingSplit(null);
      setSplitOwnerId(null);
      refresh();
    } catch (err) {
      console.error('Save split error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSplit = (owner) => {
    setSplitOwnerId(owner.id);
    setEditingSplit(null);
    setSplitDialogOpen(true);
  };

  const handleEditSplit = (split) => {
    setEditingSplit(split);
    setSplitOwnerId(split.from_owner_id);
    setSplitDialogOpen(true);
  };

  const handleDeleteSplit = (split) => {
    setDeleteTarget(split);
    setDeleteType('split');
  };

  // --- Delete confirm ---

  const confirmDelete = async () => {
    setSaving(true);
    try {
      if (deleteType === 'owner' && deleteTarget) {
        // Server-side cascade delete (owner + stakes + splits)
        const result = await base44.functions.invoke('managePMWorkspace', {
          action: 'delete_owner_cascade',
          profile_id: profileId,
          owner_id: deleteTarget.id,
        });
        if (result.error) throw new Error(result.error);
      } else if (deleteType === 'stake' && deleteTarget) {
        // Cascade: delete related splits for this owner+group combo
        const relatedSplits = splits.filter(
          (sp) => sp.from_owner_id === deleteTarget.owner_id && sp.group_id === deleteTarget.group_id
        );
        for (const sp of relatedSplits) await base44.entities.PMDistributionSplit.delete(sp.id);
        await base44.entities.PMOwnershipStake.delete(deleteTarget.id);
      } else if (deleteType === 'split' && deleteTarget) {
        await base44.entities.PMDistributionSplit.delete(deleteTarget.id);
      }
      setDeleteTarget(null);
      setDeleteType(null);
      refresh();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setSaving(false);
    }
  };

  const currentStakeOwnerId = stakeOwnerId || (editingStake && editingStake.owner_id);
  const currentSplitOwnerId = splitOwnerId || (editingSplit && editingSplit.from_owner_id);

  // --- Render ---

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-64 bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Owners</h2>
          <p className="text-sm text-slate-400 mt-1">
            {sortedOwners.length === 0
              ? 'No owners yet'
              : `${sortedOwners.length} owner${sortedOwners.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingOwner(null);
            setOwnerDialogOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2"
        >
          <Plus className="w-4 h-4" /> Add Owner
        </Button>
      </div>

      {/* Ownership stake warnings */}
      {groups.length > 0 && stakes.length > 0 && (() => {
        const warnings = groups
          .map((g) => {
            const total = Math.round((ownershipTotalByGroup[g.id] || 0) * 100) / 100;
            if (total === 100 || total === 0) return null;
            return { name: g.name, total };
          })
          .filter(Boolean);
        if (warnings.length === 0) return null;
        return (
          <div className="space-y-2">
            {warnings.map((w) => (
              <div
                key={w.name}
                className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
              >
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-400">
                  Ownership stakes for <span className="font-semibold">{w.name}</span> total{' '}
                  <span className="font-semibold">{w.total}%</span> — must equal 100% before settlement finalization.
                </p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Content */}
      {sortedOwners.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <Users className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-1">No owners yet</h3>
          <p className="text-slate-400 mb-6 text-center max-w-sm">
            Add property owners to set up ownership stakes and distributions
          </p>
          <Button
            onClick={() => setOwnerDialogOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold gap-2"
          >
            <Plus className="w-4 h-4" /> Add Owner
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedOwners.map((owner) => (
            <OwnerCard
              key={owner.id}
              owner={owner}
              stakes={getStakesForOwner(owner.id)}
              splitsGiving={getSplitsGiving(owner.id)}
              splitsReceiving={getSplitsReceiving(owner.id)}
              ownershipTotalByGroup={ownershipTotalByGroup}
              allGroups={groups}
              allOwners={owners}
              onEdit={handleEditOwner}
              onDelete={handleDeleteOwner}
              onAddStake={() => handleAddStake(owner)}
              onEditStake={handleEditStake}
              onDeleteStake={handleDeleteStake}
              onAddSplit={() => handleAddSplit(owner)}
              onEditSplit={handleEditSplit}
              onDeleteSplit={handleDeleteSplit}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <OwnerFormDialog
        open={ownerDialogOpen}
        onClose={() => {
          setOwnerDialogOpen(false);
          setEditingOwner(null);
        }}
        owner={editingOwner}
        onSave={handleSaveOwner}
      />

      <OwnershipStakeFormDialog
        open={stakeDialogOpen}
        onClose={() => {
          setStakeDialogOpen(false);
          setEditingStake(null);
          setStakeOwnerId(null);
        }}
        stake={editingStake}
        ownerId={currentStakeOwnerId}
        groups={groups}
        existingStakes={stakes}
        onSave={handleSaveStake}
      />

      <DistributionSplitFormDialog
        open={splitDialogOpen}
        onClose={() => {
          setSplitDialogOpen(false);
          setEditingSplit(null);
          setSplitOwnerId(null);
        }}
        split={editingSplit}
        fromOwnerId={currentSplitOwnerId}
        owners={owners}
        groups={groups}
        fromOwnerStakes={currentSplitOwnerId ? getFromOwnerStakes(currentSplitOwnerId) : []}
        onSave={handleSaveSplit}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-slate-900 border border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">
              {deleteType === 'owner' && 'Delete owner?'}
              {deleteType === 'stake' && 'Delete ownership stake?'}
              {deleteType === 'split' && 'Delete distribution split?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {deleteType === 'owner' && (
                <>
                  This will also delete all ownership stakes and distribution splits for this
                  owner. This action cannot be undone.
                </>
              )}
              {deleteType === 'stake' && (
                <>
                  This will delete this ownership stake and any distribution splits that use
                  this owner and group. This action cannot be undone.
                </>
              )}
              {deleteType === 'split' && (
                <>This will permanently delete this distribution split. This action cannot be undone.</>
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
