import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Calculator, Plus } from 'lucide-react';
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
import { calculateSettlement } from './utils/calculateSettlement';

import SettlementCard from './SettlementCard';
import SettlementDetail from './SettlementDetail';
import SettlementCreateDialog from './SettlementCreateDialog';
import SettlementFinalizeDialog from './SettlementFinalizeDialog';

export default function PropertyManagementSettlements({ profile, currentUser, memberRole, canEdit }) {
  // Role guard
  if (!memberRole) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>You don't have access to this workspace.</p>
      </div>
    );
  }

  const profileId = profile?.id;

  // Data
  const [settlements, setSettlements] = useState([]);
  const [groups, setGroups] = useState([]);
  const [properties, setProperties] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [laborEntries, setLaborEntries] = useState([]);
  const [owners, setOwners] = useState([]);
  const [ownershipStakes, setOwnershipStakes] = useState([]);
  const [distributionSplits, setDistributionSplits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // UI
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [finalizeTarget, setFinalizeTarget] = useState(null);
  const [finalizeWarningTarget, setFinalizeWarningTarget] = useState(null);
  const [unfinalizeTarget, setUnfinalizeTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Load all data in parallel
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [sett, grp, prop, exp, lab, own, stakes, splits] =
          await Promise.all([
            base44.entities.PMSettlement.filter({ profile_id: profileId }),
            base44.entities.PMPropertyGroup.filter({ profile_id: profileId }),
            base44.entities.PMProperty.filter({ profile_id: profileId }),
            base44.entities.PMExpense.filter({ profile_id: profileId }),
            base44.entities.PMLaborEntry.filter({ profile_id: profileId }),
            base44.entities.PMOwner.filter({ profile_id: profileId }),
            base44.entities.PMOwnershipStake.filter({ profile_id: profileId }),
            base44.entities.PMDistributionSplit.filter({
              profile_id: profileId,
            }),
          ]);
        if (!cancelled) {
          setSettlements(sett || []);
          setGroups(grp || []);
          setProperties(prop || []);
          setExpenses(exp || []);
          setLaborEntries(lab || []);
          setOwners(own || []);
          setOwnershipStakes(stakes || []);
          setDistributionSplits(splits || []);
        }
      } catch (err) {
        console.error('Settlements data load error:', err);
        toast.error('Failed to load settlements. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [profileId, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  // All data bundle for calculateSettlement
  const allData = useMemo(
    () => ({
      groups,
      properties,
      expenses,
      laborEntries,
      owners,
      ownershipStakes,
      distributionSplits,
    }),
    [
      groups,
      properties,
      expenses,
      laborEntries,
      owners,
      ownershipStakes,
      distributionSplits,
    ]
  );

  const groupsById = useMemo(() => {
    const m = {};
    groups.forEach((g) => {
      m[g.id] = g;
    });
    return m;
  }, [groups]);

  const sortedSettlements = useMemo(() => {
    return [...settlements].sort((a, b) => {
      const aMonth =
        a.month != null && typeof a.month === 'string' ? a.month : '';
      const bMonth =
        b.month != null && typeof b.month === 'string' ? b.month : '';
      return bMonth.localeCompare(aMonth);
    });
  }, [settlements]);

  // Manager name for distribution display
  const managerName = useMemo(() => {
    const manager = owners.find(
      (o) =>
        (o.role || '').toLowerCase() === 'manager' ||
        (o.role || '').toLowerCase() === 'both'
    );
    return manager?.name || null;
  }, [owners]);

  // ── Create settlement ──
  const handleSaveNew = async (payload) => {
    try {
      await base44.entities.PMSettlement.create({
        ...payload,
        profile_id: profileId,
      });
      setNewDialogOpen(false);
      toast.success('Settlement created.');
      refresh();
    } catch (err) {
      console.error('Settlement create error:', err);
      toast.error('Failed to create settlement. Please try again.');
    }
  };

  // ── Carry forward recurring expenses (server-side with dedup) ──
  const handleCarryForwardExpenses = useCallback(
    async (selectedCandidates, groupId, monthStr) => {
      try {
        const result = await base44.functions.invoke('managePMWorkspace', {
          action: 'carry_forward_recurring',
          profile_id: profileId,
          group_id: groupId,
          month: monthStr,
          expenses: selectedCandidates.map((exp) => ({
            property_id: exp.property_id || null,
            category: exp.category,
            description: exp.description || '',
            amount: Number(exp.amount) || 0,
          })),
        });
        if (result.error) throw new Error(result.error);
        toast.success('Recurring expenses carried forward.');
      } catch (err) {
        console.error('Carry forward error:', err);
        toast.error('Failed to carry forward expenses. Please try again.');
      }
      refresh();
    },
    [profileId]
  );

  // ── Property label helper ──
  const getPropertyLabel = useCallback(
    (propertyId) => {
      if (!propertyId) return 'Shared';
      const p = properties.find((x) => x.id === propertyId);
      return p?.name || 'Unit';
    },
    [properties]
  );

  // ── Expense reconcile toggle (from waterfall) ──
  const handleExpenseReconcileToggle = useCallback(
    async (expense) => {
      try {
        await base44.entities.PMExpense.update(expense.id, {
          reconciled: !expense.reconciled,
        });
        refresh();
      } catch (err) {
        console.error('Reconcile toggle error:', err);
        toast.error('Failed to update reconciliation. Please try again.');
      }
    },
    []
  );

  // ── Finalize (server-side validated) ──
  const handleFinalize = useCallback(
    async (settlement) => {
      try {
        // Calculate values client-side, then validate + lock server-side
        const calculated = calculateSettlement(
          settlement.group_id,
          settlement.month,
          allData
        );
        if (!calculated) return;

        const result = await base44.functions.invoke('managePMWorkspace', {
          action: 'finalize_settlement',
          profile_id: profileId,
          settlement_id: settlement.id,
          calculated_data: {
            gross_rent: calculated.gross_rent,
            total_fixed_expenses: calculated.total_fixed_expenses,
            management_fee: calculated.management_fee,
            maintenance_reserve: calculated.maintenance_reserve,
            emergency_reserve: calculated.emergency_reserve,
            total_labor_costs: calculated.total_labor_costs,
            total_reimbursements: calculated.total_reimbursements ?? 0,
            net_distributable: calculated.net_distributable,
            distributions: calculated.distributions,
          },
        });
        if (result.error) throw new Error(result.error);
        toast.success('Settlement finalized.');
        refresh();
      } catch (err) {
        console.error('Finalize error:', err);
        toast.error('Failed to finalize settlement. Please try again.');
      }
    },
    [allData, profileId]
  );

  // ── Unfinalize (server-side) ──
  const handleUnfinalize = useCallback(async (settlement) => {
    try {
      const result = await base44.functions.invoke('managePMWorkspace', {
        action: 'unfinalize_settlement',
        profile_id: profileId,
        settlement_id: settlement.id,
      });
      if (result.error) throw new Error(result.error);
      setUnfinalizeTarget(null);
      toast.success('Settlement reopened.');
      refresh();
    } catch (err) {
      console.error('Unfinalize error:', err);
      toast.error('Failed to reopen settlement. Please try again.');
    }
  }, [profileId]);

  // ── Delete ──
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await base44.entities.PMSettlement.delete(deleteTarget.id);
      setDeleteTarget(null);
      toast.success('Settlement deleted.');
      refresh();
    } catch (err) {
      console.error('Settlement delete error:', err);
      toast.error('Failed to delete settlement. Please try again.');
    }
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-card border border-border rounded-lg animate-pulse" />
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-lg p-4 animate-pulse"
          >
            <div className="h-6 w-40 bg-surface rounded mb-2" />
            <div className="h-4 w-24 bg-surface rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Settlements</h2>
          <p className="text-sm text-muted-foreground">
            {settlements.length === 0
              ? 'No settlements yet'
              : `${settlements.length} settlement${settlements.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          onClick={() => setNewDialogOpen(true)}
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Settlement
        </Button>
      </div>

      {/* Empty state */}
      {settlements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Calculator className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground-soft mb-1">
            No settlements yet
          </h3>
          <p className="text-muted-foreground mb-6 text-center max-w-sm">
            Run your first monthly settlement to see the financial waterfall
          </p>
        </div>
      )}

      {/* Settlement list */}
      {sortedSettlements.length > 0 && (
        <div className="space-y-3">
          {sortedSettlements.map((s) => {
            const calculated = calculateSettlement(
              s.group_id,
              s.month,
              allData
            );
            return (
              <div key={s.id}>
                <SettlementCard
                  settlement={s}
                  groupName={groupsById[s.group_id]?.name}
                  isExpanded={expandedId === s.id}
                  onToggleExpand={() =>
                    setExpandedId((id) => (id === s.id ? null : s.id))
                  }
                  onDelete={setDeleteTarget}
                  onFinalize={setFinalizeTarget}
                  onUnfinalize={setUnfinalizeTarget}
                  liveNetDistributable={calculated?.net_distributable}
                />
                {expandedId === s.id &&
                  (() => {
                    const isDraft = s.status === 'draft';
                    const displaySettlement = isDraft
                      ? calculateSettlement(s.group_id, s.month, allData) || s
                      : s;
                    return (
                      <SettlementDetail
                        settlement={displaySettlement}
                        groupName={groupsById[s.group_id]?.name}
                        managerName={managerName}
                        group={groupsById[s.group_id]}
                        isDraft={isDraft}
                        onExpenseReconcileToggle={
                          isDraft ? handleExpenseReconcileToggle : undefined
                        }
                      />
                    );
                  })()}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dialogs ── */}
      <SettlementCreateDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        groups={groups}
        allExpenses={expenses}
        existingSettlements={settlements}
        onSave={handleSaveNew}
        onCarryForwardExpenses={handleCarryForwardExpenses}
        getPropertyLabel={getPropertyLabel}
      />

      <SettlementFinalizeDialog
        open={!!finalizeTarget}
        onClose={() => setFinalizeTarget(null)}
        settlement={finalizeTarget}
        groupName={
          finalizeTarget ? groupsById[finalizeTarget.group_id]?.name : null
        }
        onFinalize={async () => {
          if (!finalizeTarget) return;
          // Check for unreconciled expenses
          const monthExpenses = (expenses || []).filter(
            (e) =>
              e.group_id === finalizeTarget.group_id &&
              String(e.date || '').slice(0, 7) === finalizeTarget.month
          );
          const unreconciledCount = monthExpenses.filter(
            (e) => !e.reconciled
          ).length;
          if (unreconciledCount > 0) {
            setFinalizeWarningTarget(finalizeTarget);
            setFinalizeTarget(null);
          } else {
            await handleFinalize(finalizeTarget);
            setFinalizeTarget(null);
          }
        }}
      />

      {/* Unreconciled warning */}
      <AlertDialog
        open={!!finalizeWarningTarget}
        onOpenChange={(open) => !open && setFinalizeWarningTarget(null)}
      >
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Unreconciled Expenses
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {finalizeWarningTarget &&
                (() => {
                  const monthExpenses = (expenses || []).filter(
                    (e) =>
                      e.group_id === finalizeWarningTarget.group_id &&
                      String(e.date || '').slice(0, 7) ===
                        finalizeWarningTarget.month
                  );
                  const unreconciledCount = monthExpenses.filter(
                    (e) => !e.reconciled
                  ).length;
                  return `${unreconciledCount} of ${monthExpenses.length} expense${monthExpenses.length !== 1 ? 's' : ''} haven't been reconciled against bank statements. Finalize anyway?`;
                })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-border text-foreground-soft hover:bg-surface hover:text-foreground">
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (finalizeWarningTarget) {
                  handleFinalize(finalizeWarningTarget);
                  setFinalizeWarningTarget(null);
                }
              }}
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold"
            >
              Finalize Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unfinalize confirmation */}
      <AlertDialog
        open={!!unfinalizeTarget}
        onOpenChange={(open) => !open && setUnfinalizeTarget(null)}
      >
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Reopen settlement?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will reopen the settlement for editing and reset any
              reimbursements back to pending. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-border text-foreground-soft hover:bg-surface hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                unfinalizeTarget && handleUnfinalize(unfinalizeTarget)
              }
              className="border-border text-foreground-soft hover:bg-secondary hover:text-foreground"
            >
              Reopen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Delete this draft settlement?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-border text-foreground-soft hover:bg-surface hover:text-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-500 text-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
