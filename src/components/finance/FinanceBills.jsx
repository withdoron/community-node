import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { sanitizeText } from '@/utils/sanitize';
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
import { Repeat, Plus, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const FREQUENCIES = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Every 2 Weeks' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'annual', label: 'Annual' },
];

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

const DEFAULT_INCOME_CATS = ['Salary/Wages', 'Client Payment', 'Reimbursement', 'Gift', 'Other Income'];

/** Resolve categories for a given context+type from profile, with migration for old flat format. */
function resolveCategories(profile, context, type) {
  const contextCats = profile?.categories?.[context];
  if (!contextCats) return [];
  if (contextCats.income || contextCats.expense) return contextCats[type] || [];
  if (Array.isArray(contextCats)) return type === 'expense' ? contextCats : DEFAULT_INCOME_CATS;
  return [];
}

// ─── Form ──────────────────────────────────────────
function RecurringForm({ open, onOpenChange, profile, currentUser, recurring }) {
  const queryClient = useQueryClient();
  const isEdit = !!recurring;

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [context, setContext] = useState('');
  const [category, setCategory] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setType(recurring?.type || 'expense');
      setAmount(recurring?.amount?.toString() || '');
      setDescription(recurring?.description || '');
      setFrequency(recurring?.frequency || 'monthly');
      setDayOfMonth(recurring?.day_of_month?.toString() || '1');
      const defaultCtx = recurring?.context || Object.keys(profile?.contexts || {})[0] || '';
      setContext(defaultCtx);
      setCategory(recurring?.category || '');
      setNextDate(recurring?.next_date?.split?.('T')?.[0] || recurring?.next_date || '');
      setConfirmDelete(false);
    }
  }, [open, recurring, profile]);

  const activeContexts = Object.entries(profile?.contexts || {})
    .filter(([, ctx]) => ctx.is_active)
    .map(([id, ctx]) => ({ id, label: ctx.label }));

  const singleContext = activeContexts.length <= 1;
  const availableCategories = resolveCategories(profile, context, type);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        profile_id: profile.id,
        user_id: currentUser.id,
        type,
        amount: parseFloat(amount),
        description: sanitizeText(description.trim()),
        frequency,
        day_of_month: parseInt(dayOfMonth, 10) || 1,
        context,
        category,
        next_date: nextDate || null,
        is_active: recurring?.is_active ?? true,
      };
      if (isEdit) {
        return base44.entities.RecurringTransaction.update(recurring.id, payload);
      }
      return base44.entities.RecurringTransaction.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-recurring'] });
      toast.success(isEdit ? 'Recurring item updated' : 'Recurring item added');
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to save');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.RecurringTransaction.delete(recurring.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-recurring'] });
      toast.success('Recurring item deleted');
      onOpenChange(false);
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) { toast.error('Description is required'); return; }
    if (!amount || parseFloat(amount) <= 0) { toast.error('Amount must be greater than 0'); return; }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEdit ? 'Edit Recurring Item' : 'Add Recurring Item'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setType('income'); setCategory(''); }}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${
                type === 'income' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : 'bg-secondary text-muted-foreground border border-border hover:text-foreground-soft'}`}>
              Income
            </button>
            <button type="button" onClick={() => { setType('expense'); setCategory(''); }}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${
                type === 'expense' ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                  : 'bg-secondary text-muted-foreground border border-border hover:text-foreground-soft'}`}>
              Expense
            </button>
          </div>

          {/* Amount */}
          <div>
            <Label className="text-muted-foreground">Amount *</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
              <Input type="number" step="0.01" min="0" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-xl bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
                placeholder="0.00" autoFocus required />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-muted-foreground">Description *</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              className="mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
              placeholder="e.g. Rent, Spotify, Paycheck" required />
          </div>

          {/* Frequency */}
          <div>
            <Label className="text-muted-foreground">Frequency</Label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
              className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-ring">
              {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>

          {/* Day of month (only for monthly/quarterly/annual) */}
          {['monthly', 'quarterly', 'annual'].includes(frequency) && (
            <div>
              <Label className="text-muted-foreground">Day of month</Label>
              <Input type="number" min="1" max="31" value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="mt-1 bg-secondary border-border text-foreground focus:border-primary focus:ring-1 focus:ring-ring" />
            </div>
          )}

          {/* Next date */}
          <div>
            <Label className="text-muted-foreground">Next occurrence</Label>
            <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)}
              className="mt-1 bg-secondary border-border text-foreground focus:border-primary focus:ring-1 focus:ring-ring" />
          </div>

          {/* Context — hidden when single context */}
          {!singleContext && (
            <div>
              <Label className="text-muted-foreground">Context</Label>
              <select value={context} onChange={(e) => { setContext(e.target.value); setCategory(''); }}
                className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-ring">
                {activeContexts.map((ctx) => <option key={ctx.id} value={ctx.id}>{ctx.label}</option>)}
              </select>
            </div>
          )}

          {/* Category */}
          <div>
            <Label className="text-muted-foreground">Category</Label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-ring">
              <option value="">Select category</option>
              {availableCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {isEdit && !confirmDelete && (
              <Button type="button" variant="outline" onClick={() => setConfirmDelete(true)}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 min-h-[44px]">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {isEdit && confirmDelete && (
              <Button type="button" onClick={() => deleteMutation.mutate()}
                className="bg-red-600 hover:bg-red-500 text-foreground min-h-[44px]" disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Delete'}
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="border-border text-foreground-soft hover:border-primary hover:text-primary min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold min-h-[44px]"
              disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? 'Update' : 'Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Tab ──────────────────────────────────────
export default function FinanceBills({ profile, currentUser }) {
  // Ownership guard
  if (profile && currentUser && profile.user_id !== currentUser.id) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>You don't have access to this workspace.</p>
      </div>
    );
  }

  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['finance-recurring', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.RecurringTransaction.filter(
        { profile_id: profile.id },
        'description',
        500
      );
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // Toggle active/inactive
  const toggleMutation = useMutation({
    mutationFn: async (item) => {
      return base44.entities.RecurringTransaction.update(item.id, {
        is_active: !item.is_active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-recurring'] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to toggle'),
  });

  // Summaries
  const summary = useMemo(() => {
    const active = items.filter((i) => i.is_active !== false);
    const monthlyExpenses = active
      .filter((i) => i.type === 'expense')
      .reduce((s, i) => s + toMonthly(i.amount || 0, i.frequency || 'monthly'), 0);
    const monthlyIncome = active
      .filter((i) => i.type === 'income')
      .reduce((s, i) => s + toMonthly(i.amount || 0, i.frequency || 'monthly'), 0);
    return { monthlyExpenses, monthlyIncome, count: active.length };
  }, [items]);

  const getFrequencyLabel = (freq) => FREQUENCIES.find((f) => f.id === freq)?.label || freq;

  const openAdd = () => { setEditingItem(null); setFormOpen(true); };
  const openEdit = (item) => { setEditingItem(item); setFormOpen(true); };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const activeItems = items.filter((i) => i.is_active !== false);
  const inactiveItems = items.filter((i) => i.is_active === false);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Monthly Recurring Expenses</p>
          <p className="text-lg font-bold text-red-400">{fmt(summary.monthlyExpenses)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Monthly Recurring Income</p>
          <p className="text-lg font-bold text-emerald-400">{fmt(summary.monthlyIncome)}</p>
        </div>
      </div>

      {/* Active items */}
      {activeItems.length === 0 && inactiveItems.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Repeat className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">
            No recurring items yet. Add bills, subscriptions, or regular income to start tracking.
          </p>
          <button type="button" onClick={openAdd}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors min-h-[44px]">
            <Plus className="h-4 w-4" /> Add Recurring Item
          </button>
        </div>
      ) : (
        <>
          {activeItems.length > 0 && (
            <div className="space-y-2">
              {activeItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {/* Toggle button */}
                  <button type="button" onClick={() => toggleMutation.mutate(item)}
                    className="flex-shrink-0 h-5 w-5 rounded border border-primary bg-primary flex items-center justify-center"
                    title="Pause this item">
                    <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  {/* Card */}
                  <button type="button" onClick={() => openEdit(item)}
                    className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl p-4 text-left transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{item.description}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                            {getFrequencyLabel(item.frequency)}
                          </span>
                          {item.category && (
                            <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`text-sm font-semibold flex-shrink-0 ml-3 ${
                        item.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {item.type === 'income' ? '+' : '-'}{fmt(item.amount)}
                        <span className="text-xs text-muted-foreground/70 block text-right">
                          {fmt(toMonthly(item.amount || 0, item.frequency || 'monthly'))}/mo
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Inactive (paused) items */}
          {inactiveItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground/70 uppercase tracking-wider">Paused</p>
              {inactiveItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 opacity-50">
                  <button type="button" onClick={() => toggleMutation.mutate(item)}
                    className="flex-shrink-0 h-5 w-5 rounded border border-border bg-transparent"
                    title="Resume this item" />
                  <button type="button" onClick={() => openEdit(item)}
                    className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl p-4 text-left transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                        <span className="text-xs bg-secondary text-muted-foreground/70 px-2 py-0.5 rounded-full">
                          {getFrequencyLabel(item.frequency)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground/70 flex-shrink-0 ml-3">
                        {fmt(item.amount)}
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add button */}
          <div className="flex justify-center pt-2">
            <button type="button" onClick={openAdd}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors min-h-[44px]">
              <Plus className="h-4 w-4" /> Add Recurring Item
            </button>
          </div>
        </>
      )}

      <RecurringForm
        open={formOpen}
        onOpenChange={setFormOpen}
        profile={profile}
        currentUser={currentUser}
        recurring={editingItem}
      />
    </div>
  );
}
