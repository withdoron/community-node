import React, { useState, useMemo, useEffect } from 'react';
import { DollarSign, Hammer, BarChart3, Plus } from 'lucide-react';
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

import FinanceRunningTotals from './FinanceRunningTotals';
import FinanceTransactionList from './FinanceTransactionList';
import FinanceTransactionForm from './FinanceTransactionForm';
import FinanceSummaryView from './FinanceSummaryView';
import FinanceReceiptPreview from './FinanceReceiptPreview';
import FinanceLaborList from './FinanceLaborList';
import FinanceLaborForm from './FinanceLaborForm';
import FinanceLaborStats from './FinanceLaborStats';

const SUB_TABS = [
  { key: 'transactions', label: 'Transactions', icon: DollarSign },
  { key: 'labor', label: 'Labor', icon: Hammer },
  { key: 'summary', label: 'Summary', icon: BarChart3 },
];

export default function PropertyManagementFinances({ profile }) {
  const profileId = profile?.id;

  // Data
  const [expenses, setExpenses] = useState([]);
  const [laborEntries, setLaborEntries] = useState([]);
  const [groups, setGroups] = useState([]);
  const [properties, setProperties] = useState([]);
  const [owners, setOwners] = useState([]);
  const [ownershipStakes, setOwnershipStakes] = useState([]);
  const [distributionSplits, setDistributionSplits] = useState([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // UI state
  const [subTab, setSubTab] = useState('transactions');
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [laborFormOpen, setLaborFormOpen] = useState(false);
  const [editingLabor, setEditingLabor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'expense'|'labor', item }
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);
  const [txFilters, setTxFilters] = useState({});
  const [laborFilters, setLaborFilters] = useState({});

  // Load all data in parallel
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [exp, lab, grp, prop, own, stakes, splits, maint] = await Promise.all([
          base44.entities.PMExpense.filter({ profile_id: profileId }),
          base44.entities.PMLaborEntry.filter({ profile_id: profileId }),
          base44.entities.PMPropertyGroup.filter({ profile_id: profileId }),
          base44.entities.PMProperty.filter({ profile_id: profileId }),
          base44.entities.PMOwner.filter({ profile_id: profileId }),
          base44.entities.PMOwnershipStake.filter({ profile_id: profileId }),
          base44.entities.PMDistributionSplit.filter({ profile_id: profileId }),
          base44.entities.PMMaintenanceRequest.filter({ profile_id: profileId }),
        ]);
        if (!cancelled) {
          setExpenses(exp || []);
          setLaborEntries(lab || []);
          setGroups(grp || []);
          setProperties(prop || []);
          setOwners(own || []);
          setOwnershipStakes(stakes || []);
          setDistributionSplits(splits || []);
          setMaintenanceRequests(maint || []);
        }
      } catch (err) {
        console.error('Finance data load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [profileId, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  // ── Running totals ──
  const { totalIncome, totalExpenses, netTotal } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    (expenses || []).forEach((e) => {
      const amt = Number(e.amount) || 0;
      if (e.type === 'income') inc += amt;
      else exp += amt;
    });
    return { totalIncome: inc, totalExpenses: exp, netTotal: inc - exp };
  }, [expenses]);

  // ── Labor stats ──
  const laborStats = useMemo(() => {
    const entries = laborEntries || [];
    const totalHours = entries.reduce((s, e) => s + (Number(e.hours) || 0), 0);
    const totalCost = entries.reduce((s, e) => s + (Number(e.total) || 0), 0);
    const avgRate = totalHours > 0 ? totalCost / totalHours : 0;
    // Top worker by total cost
    const workerTotals = {};
    entries.forEach((e) => {
      if (!e.worker_name) return;
      workerTotals[e.worker_name] = (workerTotals[e.worker_name] || 0) + (Number(e.total) || 0);
    });
    let topWorker = '—';
    let topAmount = 0;
    Object.entries(workerTotals).forEach(([name, amt]) => {
      if (amt > topAmount) { topWorker = name; topAmount = amt; }
    });
    return { totalHours, totalCost, avgRate, topWorker };
  }, [laborEntries]);

  // ── Expense CRUD ──
  const handleSaveExpense = async (data) => {
    try {
      if (editingExpense) {
        await base44.entities.PMExpense.update(editingExpense.id, data);
      } else {
        await base44.entities.PMExpense.create({ ...data, profile_id: profileId });
      }
      setExpenseFormOpen(false);
      setEditingExpense(null);
      refresh();
    } catch (err) {
      console.error('Expense save error:', err);
    }
  };

  const handleReconcileToggle = async (expense) => {
    try {
      await base44.entities.PMExpense.update(expense.id, {
        reconciled: !expense.reconciled,
      });
      refresh();
    } catch (err) {
      console.error('Reconcile toggle error:', err);
    }
  };

  // ── Labor CRUD ──
  const handleSaveLabor = async (data) => {
    try {
      if (editingLabor) {
        await base44.entities.PMLaborEntry.update(editingLabor.id, data);
      } else {
        await base44.entities.PMLaborEntry.create({ ...data, profile_id: profileId });
      }
      setLaborFormOpen(false);
      setEditingLabor(null);
      refresh();
    } catch (err) {
      console.error('Labor save error:', err);
    }
  };

  // ── Delete ──
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'expense') {
        await base44.entities.PMExpense.delete(deleteTarget.item.id);
      } else {
        await base44.entities.PMLaborEntry.delete(deleteTarget.item.id);
      }
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
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4 animate-pulse">
              <div className="h-4 w-20 bg-slate-700 rounded mb-2" />
              <div className="h-6 w-24 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 w-full bg-slate-700 rounded mb-2" />
            <div className="h-4 w-2/3 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-tab toggle */}
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
              </button>
            );
          })}
        </div>

        {/* Add button (context-dependent) */}
        {subTab === 'transactions' && (
          <Button
            onClick={() => {
              setEditingExpense(null);
              setExpenseFormOpen(true);
            }}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Transaction
          </Button>
        )}
        {subTab === 'labor' && (
          <Button
            onClick={() => {
              setEditingLabor(null);
              setLaborFormOpen(true);
            }}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Labor Entry
          </Button>
        )}
      </div>

      {/* ── Transactions sub-tab ── */}
      {subTab === 'transactions' && (
        <>
          <FinanceRunningTotals
            income={totalIncome}
            expenses={totalExpenses}
            net={netTotal}
          />
          <FinanceTransactionList
            expenses={expenses}
            groups={groups}
            properties={properties}
            filters={txFilters}
            onFiltersChange={setTxFilters}
            onEdit={(exp) => {
              setEditingExpense(exp);
              setExpenseFormOpen(true);
            }}
            onDelete={(exp) => setDeleteTarget({ type: 'expense', item: exp })}
            onReconcileToggle={handleReconcileToggle}
            onReceiptClick={(url) => setReceiptPreviewUrl(url)}
          />
        </>
      )}

      {/* ── Labor sub-tab ── */}
      {subTab === 'labor' && (
        <>
          <FinanceLaborStats
            totalHours={laborStats.totalHours}
            totalCost={laborStats.totalCost}
            avgRate={laborStats.avgRate}
            topWorker={laborStats.topWorker}
          />
          <FinanceLaborList
            entries={laborEntries}
            properties={properties}
            groups={groups}
            filters={laborFilters}
            onFiltersChange={setLaborFilters}
            onEdit={(entry) => {
              setEditingLabor(entry);
              setLaborFormOpen(true);
            }}
            onDelete={(entry) => setDeleteTarget({ type: 'labor', item: entry })}
          />
        </>
      )}

      {/* ── Summary sub-tab ── */}
      {subTab === 'summary' && (
        <FinanceSummaryView
          groups={groups}
          properties={properties}
          expenses={expenses}
          laborEntries={laborEntries}
          owners={owners}
          ownershipStakes={ownershipStakes}
          distributionSplits={distributionSplits}
        />
      )}

      {/* ── Dialogs ── */}
      <FinanceTransactionForm
        open={expenseFormOpen}
        onClose={() => {
          setExpenseFormOpen(false);
          setEditingExpense(null);
        }}
        expense={editingExpense}
        groups={groups}
        properties={properties}
        onSave={handleSaveExpense}
      />

      <FinanceLaborForm
        open={laborFormOpen}
        onClose={() => {
          setLaborFormOpen(false);
          setEditingLabor(null);
        }}
        entry={editingLabor}
        properties={properties}
        groups={groups}
        maintenanceRequests={maintenanceRequests}
        previousEntries={laborEntries}
        onSave={handleSaveLabor}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-slate-900 border border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">
              Delete {deleteTarget?.type === 'expense' ? 'Transaction' : 'Labor Entry'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. The{' '}
              {deleteTarget?.type === 'expense' ? 'transaction' : 'labor entry'} will be
              permanently removed.
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

      {/* Receipt lightbox */}
      <FinanceReceiptPreview
        url={receiptPreviewUrl}
        onClose={() => setReceiptPreviewUrl(null)}
      />
    </div>
  );
}
