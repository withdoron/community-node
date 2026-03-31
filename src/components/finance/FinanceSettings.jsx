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
  Settings, Save, Plus, X, Loader2, AlertTriangle, Trash2, RotateCcw,
  ChevronDown, ChevronRight, Home, Briefcase, PenLine, PieChart,
} from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const TAX_SCHEDULES = [
  { id: 'none', label: 'None' },
  { id: 'schedule_c', label: 'Schedule C (Business)' },
  { id: 'schedule_e', label: 'Schedule E (Rental)' },
  { id: 'other', label: 'Other' },
];

const DEFAULT_CATEGORIES = {
  personal: {
    income: [
      'Paycheck', 'Side income', 'Reimbursement', 'Gift',
      'Government benefits', 'Other income',
    ],
    expense: [
      'Housing (rent/mortgage)', 'Groceries', 'Dining out',
      'Gas & transportation', 'Utilities', 'Phone & internet',
      'Health & medical', 'Insurance', 'Kids & family',
      'Subscriptions & apps', 'Clothing', 'Fun & entertainment',
      'Giving & tithing', 'Savings & investments', 'Debt payments', 'Other',
    ],
  },
};

const RENTAL_CATEGORIES = {
  income: ['Rental income', 'Late fees', 'Other income'],
  expense: [
    'Advertising', 'Auto & travel', 'Cleaning & maintenance', 'Commissions',
    'Insurance', 'Legal & professional', 'Management fees', 'Mortgage interest',
    'Repairs', 'Supplies', 'Taxes', 'Utilities', 'Depreciation', 'Other',
  ],
};

const BUSINESS_CATEGORIES = {
  income: ['Client payment', 'Project revenue', 'Consulting', 'Reimbursement', 'Other income'],
  expense: [
    'Advertising & marketing', 'Vehicle', 'Insurance', 'Legal & professional',
    'Office', 'Supplies', 'Travel', 'Utilities', 'Software & tools', 'Contractors', 'Other',
  ],
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

function getTaxLabel(id) {
  return TAX_SCHEDULES.find((ts) => ts.id === id)?.label || 'None';
}

// ═══════════════════════════════════════════════════
export default function FinanceSettings({ profile, currentUser }) {
  // Ownership guard
  if (profile && currentUser && profile.user_id !== currentUser.id) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>You don't have access to this workspace.</p>
      </div>
    );
  }

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
  const [editingContext, setEditingContext] = useState(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templateStep, setTemplateStep] = useState('choose');
  const [businessNameInput, setBusinessNameInput] = useState('');
  const [customNameInput, setCustomNameInput] = useState('');
  const [customTaxInput, setCustomTaxInput] = useState('none');

  const contexts = profile?.contexts || {};
  const categories = profile?.categories || {};

  const activeContextCount = useMemo(
    () => Object.values(contexts).filter((ctx) => ctx.is_active).length,
    [contexts]
  );

  const hasBusinessContext = useMemo(
    () => Object.values(contexts).some((ctx) => ctx.tax_schedule === 'schedule_c' && ctx.is_active),
    [contexts]
  );

  const openTemplatePicker = () => {
    setTemplateStep('choose');
    setBusinessNameInput('');
    setCustomNameInput('');
    setCustomTaxInput('none');
    setTemplatePickerOpen(true);
  };

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
    mutationFn: async ({ name, taxSchedule, categorySet }) => {
      const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const updatedContexts = {
        ...contexts,
        [id]: { label: name.trim(), tax_schedule: taxSchedule, is_active: true, linked_workspace_id: null },
      };
      const updatedCategories = {
        ...categories,
        [id]: categorySet,
      };
      return base44.entities.FinancialProfile.update(profile.id, {
        contexts: updatedContexts,
        categories: updatedCategories,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['finance-profiles'] });
      setTemplatePickerOpen(false);
      if (variables.taxSchedule === 'schedule_c') {
        toast.success('Business context added. Profit First allocation view is now available below.');
      } else {
        toast.success('Context added');
      }
    },
    onError: (err) => toast.error(err?.message || 'Failed to add context'),
  });

  const handleAddRental = () => {
    addContextMutation.mutate({
      name: 'Rental Property',
      taxSchedule: 'schedule_e',
      categorySet: RENTAL_CATEGORIES,
    });
  };

  const handleAddBusiness = () => {
    addContextMutation.mutate({
      name: businessNameInput.trim() || 'My Business',
      taxSchedule: 'schedule_c',
      categorySet: BUSINESS_CATEGORIES,
    });
  };

  const handleAddCustom = () => {
    addContextMutation.mutate({
      name: customNameInput.trim(),
      taxSchedule: customTaxInput,
      categorySet: { income: ['Other income'], expense: ['Other'] },
    });
  };

  const toggleContextActive = useMutation({
    mutationFn: async (contextId) => {
      const ctx = contexts[contextId];
      // Prevent archiving last active context
      if (ctx.is_active && activeContextCount <= 1) {
        throw new Error('Cannot archive the last active context');
      }
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
  const [addingCategory, setAddingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  const toggleExpand = (ctxId) => {
    setExpandedContexts((prev) => ({ ...prev, [ctxId]: !prev[ctxId] }));
  };

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
      if (Array.isArray(contextCats)) {
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
      const ctx = contexts[contextId];
      let defaultCats;
      if (ctx?.tax_schedule === 'schedule_e') {
        defaultCats = RENTAL_CATEGORIES;
      } else if (ctx?.tax_schedule === 'schedule_c') {
        defaultCats = BUSINESS_CATEGORIES;
      } else {
        defaultCats = DEFAULT_CATEGORIES[contextId] || { income: ['Other income'], expense: ['Other'] };
      }
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

  // ─── Section 4: Profit First ──────────────────────
  const [pfEnabled, setPfEnabled] = useState(!!profile?.profit_first_enabled);
  const [pfTargets, setPfTargets] = useState({
    profit: profile?.profit_first_targets?.profit ?? 5,
    owners_pay: profile?.profit_first_targets?.owners_pay ?? 50,
    tax_reserve: profile?.profit_first_targets?.tax_reserve ?? 15,
    operating_expenses: profile?.profit_first_targets?.operating_expenses ?? 30,
  });
  const [pfChanged, setPfChanged] = useState(false);

  const pfTotal = pfTargets.profit + pfTargets.owners_pay + pfTargets.tax_reserve + pfTargets.operating_expenses;

  const updatePfTarget = (key, value) => {
    const num = parseFloat(value) || 0;
    setPfTargets((prev) => ({ ...prev, [key]: num }));
    setPfChanged(true);
  };

  const togglePfEnabled = () => {
    setPfEnabled((prev) => !prev);
    setPfChanged(true);
  };

  const savePfMutation = useMutation({
    mutationFn: () => base44.entities.FinancialProfile.update(profile.id, {
      profit_first_enabled: pfEnabled,
      profit_first_targets: pfTargets,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-profiles'] });
      setPfChanged(false);
      toast.success('Profit First settings saved');
    },
    onError: () => {
      // Silently handle — field may not exist yet
      setPfChanged(false);
    },
  });

  // ─── Section 5: Enough Number ─────────────────────
  const [enoughMode, setEnoughMode] = useState(profile?.enough_number_mode || 'auto');
  const [enoughManual, setEnoughManual] = useState(profile?.enough_number?.toString() || '');
  const [enoughChanged, setEnoughChanged] = useState(false);

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
      toast.success('Monthly Target settings saved');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save'),
  });

  // ─── Section 6: Danger Zone ───────────────────────
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const deleteWorkspaceMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('manageFinanceWorkspace', {
        action: 'delete_workspace_cascade',
        profile_id: profile.id,
      });
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-recurring'] });
      queryClient.invalidateQueries({ queryKey: ['finance-debts'] });
      toast.success('Finance workspace deleted');
      navigate(createPageUrl('MyLane'));
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete workspace'),
  });

  // ─── Helpers ────────────────────────────────────────
  const createdDate = profile?.created_date || profile?.created_at;
  const formattedDate = createdDate
    ? new Date(createdDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Unknown';

  const getCategoryCount = (ctxId) => {
    const ctxCats = categories[ctxId];
    if (!ctxCats) return 0;
    if (Array.isArray(ctxCats)) return ctxCats.length;
    return (ctxCats.income?.length || 0) + (ctxCats.expense?.length || 0);
  };

  // ─── Render ───────────────────────────────────────
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
          <button type="button" onClick={openTemplatePicker}
            className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1">
            <Plus className="h-3 w-3" /> Add Context
          </button>
        </div>

        <div className="space-y-3">
          {Object.entries(contexts).map(([id, ctx]) => (
            <div key={id} className={`border rounded-lg p-4 transition-colors ${
              ctx.is_active ? 'border-slate-800' : 'border-slate-800/50 opacity-50'
            }`}>
              {editingContext?.id === id ? (
                /* Inline edit mode */
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
                      className="border-slate-600 text-slate-300 hover:bg-transparent text-xs min-h-[32px]">Cancel</Button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-100">{ctx.label}</p>
                      {!ctx.is_active && (
                        <span className="text-[10px] bg-slate-800 text-amber-500 px-1.5 py-0.5 rounded">Archived</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {ctx.tax_schedule && ctx.tax_schedule !== 'none' && (
                        <span className="text-xs text-slate-500">{getTaxLabel(ctx.tax_schedule)}</span>
                      )}
                      <span className="text-xs text-slate-600">
                        {getCategoryCount(id)} categories
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button"
                      onClick={() => setEditingContext({ id, label: ctx.label, tax_schedule: ctx.tax_schedule || 'none' })}
                      className="text-xs text-amber-500 hover:text-amber-400">Edit</button>
                    <button type="button"
                      onClick={() => toggleContextActive.mutate(id)}
                      disabled={ctx.is_active && activeContextCount <= 1}
                      className={`text-xs transition-colors ${
                        ctx.is_active && activeContextCount <= 1
                          ? 'text-slate-600 cursor-not-allowed'
                          : ctx.is_active
                            ? 'text-slate-400 hover:text-amber-500'
                            : 'text-amber-500 hover:text-amber-400'
                      }`}
                      title={ctx.is_active && activeContextCount <= 1 ? 'Cannot archive the last active context' : ''}>
                      {ctx.is_active ? 'Archive' : 'Unarchive'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Categories */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-slate-100 mb-4">Categories</h2>

        <div className="space-y-3">
          {Object.entries(contexts).map(([ctxId, ctx]) => {
            const isExpanded = expandedContexts[ctxId];
            const ctxCats = categories[ctxId];
            const isOldFormat = Array.isArray(ctxCats);
            const incomeCats = isOldFormat ? [] : (ctxCats?.income || []);
            const expenseCats = isOldFormat ? (ctxCats || []) : (ctxCats?.expense || []);

            return (
              <div key={ctxId} className="border border-slate-800 rounded-lg overflow-hidden">
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
                              className="border-slate-600 text-slate-300 hover:bg-transparent text-xs h-8">Cancel</Button>
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
                            className="border-slate-600 text-slate-300 hover:bg-transparent text-xs h-8">Cancel</Button>
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
                            className="border-slate-600 text-slate-300 hover:bg-transparent text-xs h-7">Cancel</Button>
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

      {/* Section 4: Profit First (only when Business context exists) */}
      {hasBusinessContext && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-100">Profit First</h2>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-slate-200">Show allocation view on Home tab</p>
              <p className="text-xs text-slate-500">See how your business revenue is distributed</p>
            </div>
            <button
              type="button"
              onClick={togglePfEnabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                pfEnabled ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-slate-100 transition-transform ${
                pfEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Target Percentages (only when enabled) */}
          {pfEnabled && (
            <div className="space-y-4 mt-4 pt-4 border-t border-slate-800">
              <p className="text-sm text-slate-300 font-medium">Target Allocation Percentages</p>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'profit', label: 'Profit' },
                  { key: 'owners_pay', label: "Owner's Pay" },
                  { key: 'tax_reserve', label: 'Tax Reserve' },
                  { key: 'operating_expenses', label: 'Operating Expenses' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <Label className="text-slate-400 text-xs">{label}</Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={pfTargets[key]}
                        onChange={(e) => updatePfTarget(key, e.target.value)}
                        className="pr-8 bg-slate-800 border-slate-700 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Total</span>
                <span className={`font-semibold ${pfTotal === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {pfTotal}%
                </span>
              </div>
              {pfTotal !== 100 && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Targets should add up to 100%
                </p>
              )}

              <p className="text-xs text-slate-500 mt-2">
                Based on Mike Michalowicz's Profit First method. These show how your business revenue
                is allocated vs. your targets. The mirror shows your reality — it doesn't enforce rules.
              </p>
            </div>
          )}

          {pfChanged && (
            <Button type="button" onClick={() => savePfMutation.mutate()}
              className="mt-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[40px]"
              disabled={savePfMutation.isPending}>
              {savePfMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
          )}
        </div>
      )}

      {/* Section 5: Enough Number */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-slate-100 mb-4">Monthly Target</h2>

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
            <Label className="text-slate-400">Your custom Monthly Target</Label>
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
          Auto mode calculates your Monthly Target from recurring expenses and debt minimums. Manual mode lets you set your own target.
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

      {/* Section 6: Danger Zone */}
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

      {/* ═══ Dialogs ═══ */}

      {/* Template Picker Dialog */}
      <Dialog open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              {templateStep === 'choose' && 'Add a Context'}
              {templateStep === 'business_name' && 'Name Your Business Context'}
              {templateStep === 'custom_name' && 'Create Custom Context'}
            </DialogTitle>
          </DialogHeader>

          {templateStep === 'choose' && (
            <div className="space-y-3">
              {/* Rental Property */}
              <button type="button" onClick={handleAddRental}
                disabled={addContextMutation.isPending}
                className="w-full bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-xl p-4 text-left transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Home className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">Rental Property</p>
                    <p className="text-xs text-slate-400">Schedule E categories pre-filled</p>
                  </div>
                </div>
              </button>

              {/* Business / LLC */}
              <button type="button" onClick={() => setTemplateStep('business_name')}
                className="w-full bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-xl p-4 text-left transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">Business / LLC</p>
                    <p className="text-xs text-slate-400">Schedule C categories + Profit First view</p>
                  </div>
                </div>
              </button>

              {/* Custom */}
              <button type="button" onClick={() => setTemplateStep('custom_name')}
                className="w-full bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-xl p-4 text-left transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <PenLine className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-100">Custom</p>
                    <p className="text-xs text-slate-400">Start blank, add your own categories</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {templateStep === 'business_name' && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Business name</Label>
                <Input value={businessNameInput}
                  onChange={(e) => setBusinessNameInput(e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="My Business" autoFocus />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setTemplateStep('choose')}
                  className="border-slate-600 text-slate-300 hover:bg-transparent min-h-[40px]">Back</Button>
                <Button type="button" onClick={handleAddBusiness}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[40px]"
                  disabled={!businessNameInput.trim() || addContextMutation.isPending}>
                  {addContextMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </div>
          )}

          {templateStep === 'custom_name' && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-400">Context name</Label>
                <Input value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="e.g. Side Hustle" autoFocus />
              </div>
              <div>
                <Label className="text-slate-400">Tax schedule (optional)</Label>
                <select value={customTaxInput} onChange={(e) => setCustomTaxInput(e.target.value)}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500">
                  {TAX_SCHEDULES.map((ts) => <option key={ts.id} value={ts.id}>{ts.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setTemplateStep('choose')}
                  className="border-slate-600 text-slate-300 hover:bg-transparent min-h-[40px]">Back</Button>
                <Button type="button" onClick={handleAddCustom}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[40px]"
                  disabled={!customNameInput.trim() || addContextMutation.isPending}>
                  {addContextMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              <li>Your Monthly Target configuration</li>
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
                className="border-slate-600 text-slate-300 hover:bg-transparent min-h-[44px]">Cancel</Button>
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
