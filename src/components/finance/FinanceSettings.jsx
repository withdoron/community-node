import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Settings, Save, Plus, X, Loader2, AlertTriangle, Trash2, RotateCcw, ChevronDown, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const TAX_SCHEDULES = [
  { id: 'none', label: 'None' },
  { id: 'schedule_c', label: 'Schedule C (Business)' },
  { id: 'schedule_e', label: 'Schedule E (Rental)' },
];

const DEFAULT_CATEGORIES = {
  personal: {
    income: ['Salary/Wages', 'Client Payment', 'Reimbursement', 'Gift', 'Government Benefits', 'Other Income'],
    expense: ['Housing', 'Food', 'Transportation', 'Healthcare', 'Children',
      'Education', 'Entertainment', 'Clothing', 'Giving/Tithing',
      'Debt Payments', 'Savings', 'Other'],
  },
  rental: {
    income: ['Rental Income', 'Late Fees', 'Other Income'],
    expense: ['Advertising', 'Auto/Travel', 'Cleaning', 'Commissions', 'Insurance',
      'Legal', 'Management Fees', 'Mortgage Interest', 'Repairs', 'Supplies',
      'Taxes', 'Utilities', 'Depreciation', 'Other'],
  },
  business: {
    income: ['Client Payment', 'Project Revenue', 'Consulting', 'Reimbursement', 'Other Income'],
    expense: ['Advertising', 'Car/Truck', 'Insurance', 'Legal', 'Office',
      'Supplies', 'Travel', 'Utilities', 'Software/Tools', 'Contractors', 'Other'],
  },
};

/** Convert any frequency to a monthly equivalent. */
function toMonthly(amount, frequency) {
  switch (frequency) {
    case 'weekly': return amount * 4.33;
    case 'biweekly': return amount * 2.17;
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'annual': return amount / 12;
    default: return amount;
  }
}

// ═══════════════════════════════════════════════════
export default function FinanceSettings({ profile, currentUser }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ─── Section 1: Workspace Profile ─────────────────
  const [workspaceName, setWorkspaceName] = useState(profile?.workspace_name || '');
  const [nameChanged, setNameChanged] = useState(false);

  const saveNameMutation = useMutation({
    mutationFn: () => base44.entities.FinancialProfile.update(profile.id, { workspace_name: workspaceName.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-profiles'] });
      toast.success('Workspace name saved');
      setNameChanged(false);
    },
    onError: (err) => toast.error(err?.message || 'Failed to save'),
  });

  // ─── Section 2: Contexts ──────────────────────────
  const [editingContext, setEditingContext] = useState(null); // { id, label, tax_schedule } or null
  const [newContextOpen, setNewContextOpen] = useState(false);
  const [newContextName, setNewContextName] = useState('');
  const [newContextTax, setNewContextTax] = useState('none');

  const contexts = profile?.contexts || {};

  const saveContextMutation = useMutation({
    mutationFn: async ({ contextId, updates }) => {
      const updatedContexts = { ...contexts, [contextId]: { ...contexts[contextId], ...updates } };
      return base44.entities.FinancialProfile.update(profile.id, { contexts: updatedContexts });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-profiles'] });
      setEditingContext(null);
      toast.success('Context updated');
    },
    onError: (err) => toast.error(err?.message || 'Failed to update'),
  });

  const addContextMutation = useMutation({
    mutationFn: async () => {
      const id = newContextName.trim().toLowerCase().replace(/\s+/g, '_');
      const updatedContexts = {
        ...contexts,
        [id]: { label: newContextName.trim(), tax_schedule: newContextTax, is_active: true },
      };
      const updatedCategories = {
        ...(profile?.categories || {}),
        [id]: { income: ['Other Income'], expense: ['Other'] },
      };
      return base44.entities.FinancialProfile.update(profile.id, {
        contexts: updatedContexts,
        categories: updatedCategories,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-profiles'] });
      setNewContextOpen(false);
      setNewContextName('');
      setNewContextTax('none');
      toast.success('Context added');
    },
    onError: (err) => toast.error(err?.message || 'Failed to add context'),
  });

  const toggleContextActive = useMutation({
    mutationFn: async (contextId) => {
      const ctx = contexts[contextId];
      const updatedContexts = { ...contexts, [contextId]: { ...ctx, is_active: !ctx.is_active } };
      return base44.entities.FinancialProfile.update(profile.id, { contexts: updatedContexts });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-profiles'] });
      toast.success('Context status updated');
    },
    onError: (err) => toast.error(err?.message || 'Failed to toggle'),
  });

  // ─── Section 3: Categories ────────────────────────
  const [expandedContexts, setExpandedContexts] = useState({});
  const [addingCategory, setAddingCategory] = useState(null); // { contextId, type }
  const [newCategoryName, setNewCategoryName] = useState('');

  const toggleExpand = (ctxId) => {
    setExpandedContexts((prev) => ({ ...prev, [ctxId]: !prev[ctxId] }));
  };

  const categories = profile?.categories || {};

  // Check if context has transactions (for delete warning)
  const { data: allTransactions = [] } = useQuery({
    queryKey: ['finance-transactions', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.Transaction.filter({ profile_id: profile.id }, '-date', 2000);
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  const getCategoryUsageCount = (contextId, categoryName) => {
    return allTransactions.filter((t) => t.context === contextId && t.category === categoryName).length;
  };

  const addCategoryMutation = useMutation({
    mutationFn: async ({ contextId, type, name }) => {
      const contextCats = { ...(categories[contextId] || { income: [], expense: [] }) };
      // Handle old flat format
      if (Array.isArray(contextCats)) {
        // Can't add to old format, skip
        throw new Error('Old category format detected. Please reset to defaults first.');
      }
      const list = [...(contextCats[type] || [])];
      if (list.includes(name)) throw new Error('Category already exists');
      list.push(name);
      contextCats[type] = list;
      const updatedCategories = { ...categories, [contextId]: contextCats };
      return base44.entities.FinancialProfile.update(profile.id, { categories: updatedCategories });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-profiles'] });
      setAddingCategory(null);
      setNewCategoryName('');
      toast.success('Category added');
    },
    onError: (err) => toast.error(err?.message || 'Failed to add category'),
  });

  const removeCategoryMutation = useMutation({
    mutationFn: async ({ contextId, type, name }) => {
      const contextCats = { ...(categories[contextId] || { income: [], expense: [] }) };
      if (Array.isArray(contextCats)) throw new Error('Old category format');
      const list = (contextCats[type] || []).filter((c) => c !== name);
      contextCats[type] = list;
      const updatedCategories = { ...categories, [contextId]: contextCats };
      return base44.entities.FinancialProfile.update(profile.id, { categories: updatedCategories });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-profiles'] });
      toast.success('Category removed');
    },
    onError: (err) => toast.error(err?.message || 'Failed to remove'),
  });

  const [resetContextConfirm, setResetContextConfirm] = useState(null);

  const resetCategoriesMutation = useMutation({
    mutationFn: async (contextId) => {
      const defaultCats = DEFAULT_CATEGORIES[contextId] || { income: ['Other Income'], expense: ['Other'] };
      const updatedCategories = { ...categories, [contextId]: defaultCats };
      return base44.entities.FinancialProfile.update(profile.id, { categories: updatedCategories });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-profiles'] });
      setResetContextConfirm(null);
      toast.success('Categories reset to defaults');
    },
    onError: (err) => toast.error(err?.message || 'Failed to reset'),
  });

  // ─── Section 4: Enough Number ─────────────────────
  const [enoughMode, setEnoughMode] = useState(profile?.enough_number_mode || 'auto');
  const [enoughManual, setEnoughManual] = useState(profile?.enough_number?.toString() || '');
  const [enoughChanged, setEnoughChanged] = useState(false);

  // Fetch recurring + debts for auto calculation display
  const { data: recurringItems = [] } = useQuery({
    queryKey: ['finance-recurring', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.RecurringTransaction.filter({ profile_id: profile.id }, 'description', 500);
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  const { data: debts = [] } = useQuery({
    queryKey: ['finance-debts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.Debt.filter({ profile_id: profile.id }, 'priority', 200);
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  const autoEnoughNumber = useMemo(() => {
    const activeRecurring = recurringItems.filter((r) => r.is_active !== false);
    const recurringExpenses = activeRecurring
      .filter((r) => r.type === 'expense')
      .reduce((s, r) => s + toMonthly(r.amount || 0, r.frequency || 'monthly'), 0);
    const activeDebts = debts.filter((d) => d.status !== 'paid_off');
    const debtMins = activeDebts.reduce((s, d) => s + (d.minimum_payment || 0), 0);
    return { total: recurringExpenses + debtMins, recurring: recurringExpenses, debtMins };
  }, [recurringItems, debts]);

  const saveEnoughMutation = useMutation({
    mutationFn: () => {
      const payload = {
        enough_number_mode: enoughMode,
        enough_number: enoughMode === 'manual' ? (parseFloat(enoughManual) || null) : null,
      };
      return base44.entities.FinancialProfile.update(profile.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-profiles'] });
      setEnoughChanged(false);
      toast.success('Enough Number settings saved');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save'),
  });

  // ─── Section 5: Danger Zone ───────────────────────
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const deleteWorkspaceMutation = useMutation({
    mutationFn: async () => {
      // Delete all associated data
      const txns = await base44.entities.Transaction.filter({ profile_id: profile.id }, 'id', 5000);
      const txnList = Array.isArray(txns) ? txns : txns ? [txns] : [];
      for (const t of txnList) {
        await base44.entities.Transaction.delete(t.id);
      }

      const recurring = await base44.entities.RecurringTransaction.filter({ profile_id: profile.id }, 'id', 500);
      const recList = Array.isArray(recurring) ? recurring : recurring ? [recurring] : [];
      for (const r of recList) {
        await base44.entities.RecurringTransaction.delete(r.id);
      }

      const debtList = await base44.entities.Debt.filter({ profile_id: profile.id }, 'id', 200);
      const dList = Array.isArray(debtList) ? debtList : debtList ? [debtList] : [];
      for (const d of dList) {
        // Delete debt payments for this debt
        try {
          const payments = await base44.entities.DebtPayment.filter({ debt_id: d.id }, 'id', 500);
          const pList = Array.isArray(payments) ? payments : payments ? [payments] : [];
          for (const p of pList) {
            await base44.entities.DebtPayment.delete(p.id);
          }
        } catch { /* ignore if no payments */ }
        await base44.entities.Debt.delete(d.id);
      }

      // Delete the profile itself
      await base44.entities.FinancialProfile.delete(profile.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-recurring'] });
      queryClient.invalidateQueries({ queryKey: ['finance-debts'] });
      toast.success('Finance workspace deleted');
      navigate(createPageUrl('BusinessDashboard') + '?landing=1');
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete workspace'),
  });

  // ─── Render ───────────────────────────────────────
  const createdDate = profile?.created_date || profile?.created_at;
  const formattedDate = createdDate
    ? new Date(createdDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Unknown';

  return (
    <div className="space-y-6">
      {/* Section 1: Workspace Profile */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">Workspace Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-slate-400">Workspace name</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={workspaceName}
                onChange={(e) => { setWorkspaceName(e.target.value); setNameChanged(true); }}
                className="flex-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {nameChanged && (
                <Button onClick={() => saveNameMutation.mutate()}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[40px]"
                  disabled={saveNameMutation.isPending}>
                  {saveNameMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Created</span>
            <span className="text-slate-300">{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Section 2: Contexts */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">Contexts</h2>
          <button type="button" onClick={() => setNewContextOpen(true)}
            className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1">
            <Plus className="h-3 w-3" /> Add Context
          </button>
        </div>

        <div className="space-y-3">
          {Object.entries(contexts).map(([id, ctx]) => (
            <div key={id} className={`border border-slate-800 rounded-lg p-3 ${!ctx.is_active ? 'opacity-50' : ''}`}>
              {editingContext?.id === id ? (
                // Inline edit mode
                <div className="space-y-3">
                  <div>
                    <Label className="text-slate-400 text-xs">Name</Label>
                    <Input value={editingContext.label}
                      onChange={(e) => setEditingContext({ ...editingContext, label: e.target.value })}
                      className="mt-1 bg-slate-800 border-slate-700 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500" />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Tax schedule</Label>
                    <select value={editingContext.tax_schedule}
                      onChange={(e) => setEditingContext({ ...editingContext, tax_schedule: e.target.value })}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500">
                      {TAX_SCHEDULES.map((ts) => <option key={ts.id} value={ts.id}>{ts.label}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => saveContextMutation.mutate({
                      contextId: id,
                      updates: { label: editingContext.label, tax_schedule: editingContext.tax_schedule },
                    })}
                      className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs min-h-[32px]"
                      disabled={saveContextMutation.isPending}>
                      {saveContextMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditingContext(null)}
                      className="border-slate-600 text-slate-300 text-xs min-h-[32px]">Cancel</Button>
                  </div>
                </div>
              ) : (
                // Display mode
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-100">{ctx.label}</p>
                    <p className="text-xs text-slate-500">
                      {TAX_SCHEDULES.find((ts) => ts.id === ctx.tax_schedule)?.label || 'None'}
                      {!ctx.is_active && <span className="ml-2 text-amber-500">Archived</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEditingContext({ id, label: ctx.label, tax_schedule: ctx.tax_schedule || 'none' })}
                      className="text-xs text-amber-500 hover:text-amber-400">Edit</button>
                    <button type="button" onClick={() => toggleContextActive.mutate(id)}
                      className={`text-xs ${ctx.is_active ? 'text-slate-400 hover:text-amber-500' : 'text-amber-500 hover:text-amber-400'}`}>
                      {ctx.is_active ? 'Archive' : 'Unarchive'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Context inline form */}
        {newContextOpen && (
          <div className="border border-amber-500/30 rounded-lg p-3 mt-3 space-y-3">
            <div>
              <Label className="text-slate-400 text-xs">Name</Label>
              <Input value={newContextName} onChange={(e) => setNewContextName(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="e.g. Side Hustle" autoFocus />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Tax schedule</Label>
              <select value={newContextTax} onChange={(e) => setNewContextTax(e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500">
                {TAX_SCHEDULES.map((ts) => <option key={ts.id} value={ts.id}>{ts.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={() => addContextMutation.mutate()}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs min-h-[32px]"
                disabled={!newContextName.trim() || addContextMutation.isPending}>
                {addContextMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setNewContextOpen(false)}
                className="border-slate-600 text-slate-300 text-xs min-h-[32px]">Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Categories */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-slate-100 mb-4">Categories</h2>

        <div className="space-y-3">
          {Object.entries(contexts).map(([ctxId, ctx]) => {
            const isExpanded = expandedContexts[ctxId];
            const ctxCats = categories[ctxId];
            // Handle old flat format
            const isOldFormat = Array.isArray(ctxCats);
            const incomeCats = isOldFormat ? [] : (ctxCats?.income || []);
            const expenseCats = isOldFormat ? (ctxCats || []) : (ctxCats?.expense || []);

            return (
              <div key={ctxId} className="border border-slate-800 rounded-lg overflow-hidden">
                {/* Accordion header */}
                <button type="button" onClick={() => toggleExpand(ctxId)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-800/50 transition-colors">
                  <span className="text-sm text-slate-100 font-medium">{ctx.label}</span>
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-4">
                    {isOldFormat && (
                      <p className="text-xs text-amber-500 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Old format detected. Reset to defaults to enable income categories.
                      </p>
                    )}

                    {/* Income Categories */}
                    {!isOldFormat && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-slate-400 uppercase tracking-wider">Income</p>
                          <button type="button"
                            onClick={() => { setAddingCategory({ contextId: ctxId, type: 'income' }); setNewCategoryName(''); }}
                            className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1">
                            <Plus className="h-3 w-3" /> Add
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {incomeCats.map((cat) => {
                            const usage = getCategoryUsageCount(ctxId, cat);
                            return (
                              <div key={cat} className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg text-xs text-slate-300 group">
                                <span>{cat}</span>
                                <button type="button"
                                  onClick={() => {
                                    if (usage > 0) {
                                      if (window.confirm(`${usage} transactions use "${cat}". They'll keep their label but it won't appear in dropdowns. Remove?`)) {
                                        removeCategoryMutation.mutate({ contextId: ctxId, type: 'income', name: cat });
                                      }
                                    } else {
                                      removeCategoryMutation.mutate({ contextId: ctxId, type: 'income', name: cat });
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        {addingCategory?.contextId === ctxId && addingCategory?.type === 'income' && (
                          <div className="flex gap-2 mt-2">
                            <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                              className="flex-1 bg-slate-800 border-slate-700 text-white text-xs h-8 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                              placeholder="Category name" autoFocus
                              onKeyDown={(e) => { if (e.key === 'Enter' && newCategoryName.trim()) addCategoryMutation.mutate({ contextId: ctxId, type: 'income', name: newCategoryName.trim() }); }} />
                            <Button type="button" onClick={() => addCategoryMutation.mutate({ contextId: ctxId, type: 'income', name: newCategoryName.trim() })}
                              className="bg-amber-500 hover:bg-amber-400 text-black text-xs h-8"
                              disabled={!newCategoryName.trim() || addCategoryMutation.isPending}>Add</Button>
                            <Button type="button" variant="outline" onClick={() => setAddingCategory(null)}
                              className="border-slate-600 text-slate-300 text-xs h-8">Cancel</Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expense Categories */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-slate-400 uppercase tracking-wider">Expense</p>
                        {!isOldFormat && (
                          <button type="button"
                            onClick={() => { setAddingCategory({ contextId: ctxId, type: 'expense' }); setNewCategoryName(''); }}
                            className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1">
                            <Plus className="h-3 w-3" /> Add
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {expenseCats.map((cat) => {
                          const usage = getCategoryUsageCount(ctxId, cat);
                          return (
                            <div key={cat} className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg text-xs text-slate-300 group">
                              <span>{cat}</span>
                              {!isOldFormat && (
                                <button type="button"
                                  onClick={() => {
                                    if (usage > 0) {
                                      if (window.confirm(`${usage} transactions use "${cat}". They'll keep their label but it won't appear in dropdowns. Remove?`)) {
                                        removeCategoryMutation.mutate({ contextId: ctxId, type: 'expense', name: cat });
                                      }
                                    } else {
                                      removeCategoryMutation.mutate({ contextId: ctxId, type: 'expense', name: cat });
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity">
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {addingCategory?.contextId === ctxId && addingCategory?.type === 'expense' && (
                        <div className="flex gap-2 mt-2">
                          <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                            className="flex-1 bg-slate-800 border-slate-700 text-white text-xs h-8 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                            placeholder="Category name" autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter' && newCategoryName.trim()) addCategoryMutation.mutate({ contextId: ctxId, type: 'expense', name: newCategoryName.trim() }); }} />
                          <Button type="button" onClick={() => addCategoryMutation.mutate({ contextId: ctxId, type: 'expense', name: newCategoryName.trim() })}
                            className="bg-amber-500 hover:bg-amber-400 text-black text-xs h-8"
                            disabled={!newCategoryName.trim() || addCategoryMutation.isPending}>Add</Button>
                          <Button type="button" variant="outline" onClick={() => setAddingCategory(null)}
                            className="border-slate-600 text-slate-300 text-xs h-8">Cancel</Button>
                        </div>
                      )}
                    </div>

                    {/* Reset to defaults */}
                    <div className="pt-2 border-t border-slate-800">
                      {resetContextConfirm === ctxId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Reset all categories to defaults?</span>
                          <Button type="button" onClick={() => resetCategoriesMutation.mutate(ctxId)}
                            className="bg-amber-500 hover:bg-amber-400 text-black text-xs h-7"
                            disabled={resetCategoriesMutation.isPending}>
                            {resetCategoriesMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setResetContextConfirm(null)}
                            className="border-slate-600 text-slate-300 text-xs h-7">Cancel</Button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setResetContextConfirm(ctxId)}
                          className="text-xs text-slate-500 hover:text-amber-500 flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" /> Reset to defaults
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Enough Number */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-slate-100 mb-4">Enough Number</h2>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <button type="button" onClick={() => { setEnoughMode('auto'); setEnoughChanged(true); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
              enoughMode === 'auto'
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300'
            }`}>
            Auto
          </button>
          <button type="button" onClick={() => { setEnoughMode('manual'); setEnoughChanged(true); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px] ${
              enoughMode === 'manual'
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300'
            }`}>
            Manual
          </button>
        </div>

        {enoughMode === 'auto' ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Calculated value</span>
              <span className="text-amber-500 font-semibold">{fmt(autoEnoughNumber.total)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Recurring expenses</span>
              <span className="text-slate-400">{fmt(autoEnoughNumber.recurring)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Debt minimums</span>
              <span className="text-slate-400">{fmt(autoEnoughNumber.debtMins)}</span>
            </div>
          </div>
        ) : (
          <div>
            <Label className="text-slate-400">Your custom Enough Number</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">$</span>
              <Input type="number" step="0.01" min="0" value={enoughManual}
                onChange={(e) => { setEnoughManual(e.target.value); setEnoughChanged(true); }}
                className="pl-8 text-xl bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="0.00" />
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 mt-3">
          Auto mode calculates your Enough Number from recurring expenses and debt minimums. Manual mode lets you set your own target.
        </p>

        {enoughChanged && (
          <Button type="button" onClick={() => saveEnoughMutation.mutate()}
            className="mt-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[40px]"
            disabled={saveEnoughMutation.isPending}>
            {saveEnoughMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        )}
      </div>

      {/* Section 5: Danger Zone */}
      <div className="bg-slate-900 border border-red-500/30 rounded-xl p-6">
        <h2 className="text-lg font-bold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-sm text-slate-400 mb-4">
          Permanently delete this workspace and all associated data.
        </p>
        <Button type="button" onClick={() => { setDeleteConfirmOpen(true); setDeleteConfirmText(''); }}
          className="bg-red-600 hover:bg-red-500 text-white min-h-[44px]">
          <Trash2 className="h-4 w-4 mr-2" /> Delete Workspace
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Finance Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              This will permanently delete your Finance workspace and all associated data:
            </p>
            <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
              <li>All transactions</li>
              <li>All recurring items</li>
              <li>All debts and payment history</li>
              <li>Your Enough Number configuration</li>
            </ul>
            <p className="text-sm text-red-400 font-medium">This cannot be undone.</p>
            <div>
              <Label className="text-slate-400 text-sm">Type "delete" to confirm</Label>
              <Input value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                placeholder="delete" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1" />
              <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)}
                className="border-slate-600 text-slate-300 min-h-[44px]">Cancel</Button>
              <Button type="button"
                onClick={() => deleteWorkspaceMutation.mutate()}
                disabled={deleteConfirmText !== 'delete' || deleteWorkspaceMutation.isPending}
                className="bg-red-600 hover:bg-red-500 text-white min-h-[44px] disabled:opacity-50">
                {deleteWorkspaceMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Delete Permanently
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
