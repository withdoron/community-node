import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
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
import { Landmark, Plus, Loader2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + (d.includes('T') ? '' : 'T12:00:00'));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── Debt Form ─────────────────────────────────────
function DebtForm({ open, onOpenChange, profile, currentUser, debt }) {
  const queryClient = useQueryClient();
  const isEdit = !!debt;

  const [name, setName] = useState('');
  const [originalAmount, setOriginalAmount] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  React.useEffect(() => {
    if (open) {
      setName(debt?.name || '');
      setOriginalAmount(debt?.original_amount?.toString() || '');
      setCurrentBalance(debt?.current_balance?.toString() || '');
      setInterestRate(debt?.interest_rate?.toString() || '');
      setMinimumPayment(debt?.minimum_payment?.toString() || '');
      setNotes(debt?.notes || '');
      setConfirmDelete(false);
    }
  }, [open, debt]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        profile_id: profile.id,
        user_id: currentUser.id,
        name: name.trim(),
        original_amount: parseFloat(originalAmount) || 0,
        current_balance: parseFloat(currentBalance) || 0,
        interest_rate: parseFloat(interestRate) || 0,
        minimum_payment: parseFloat(minimumPayment) || 0,
        status: 'active',
        priority: debt?.priority ?? 999,
        notes: notes.trim() || null,
      };
      if (isEdit) {
        return base44.entities.Debt.update(debt.id, payload);
      }
      return base44.entities.Debt.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-debts'] });
      toast.success(isEdit ? 'Debt updated' : 'Debt added');
      onOpenChange(false);
    },
    onError: (err) => toast.error(err?.message || 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Debt.delete(debt.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-debts'] });
      toast.success('Debt deleted');
      onOpenChange(false);
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!currentBalance || parseFloat(currentBalance) <= 0) { toast.error('Current balance is required'); return; }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {isEdit ? 'Edit Debt' : 'Add Debt'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-slate-400">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="e.g. Credit Card, Student Loan" autoFocus required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400">Original Amount</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input type="number" step="0.01" min="0" value={originalAmount}
                  onChange={(e) => setOriginalAmount(e.target.value)}
                  className="pl-7 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="0.00" />
              </div>
            </div>
            <div>
              <Label className="text-slate-400">Current Balance *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input type="number" step="0.01" min="0" value={currentBalance}
                  onChange={(e) => setCurrentBalance(e.target.value)}
                  className="pl-7 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="0.00" required />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400">Interest Rate (%)</Label>
              <Input type="number" step="0.01" min="0" max="100" value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="0.00" />
            </div>
            <div>
              <Label className="text-slate-400">Minimum Payment</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input type="number" step="0.01" min="0" value={minimumPayment}
                  onChange={(e) => setMinimumPayment(e.target.value)}
                  className="pl-7 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="0.00" />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-slate-400">Notes (optional)</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="Any additional details..." />
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
                className="bg-red-600 hover:bg-red-500 text-white min-h-[44px]" disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Delete'}
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
              disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? 'Update' : 'Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Log Payment Form ──────────────────────────────
function LogPaymentForm({ open, onOpenChange, debt, profile, currentUser }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (open) {
      setAmount(debt?.minimum_payment?.toString() || '');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [open, debt]);

  const payMutation = useMutation({
    mutationFn: async () => {
      const payAmount = parseFloat(amount);

      // 1. Create the Transaction record (expense)
      const txn = await base44.entities.Transaction.create({
        profile_id: profile.id,
        user_id: currentUser.id,
        type: 'expense',
        amount: payAmount,
        date,
        description: `Debt payment — ${debt.name}`,
        category: 'Debt Payments',
        context: Object.keys(profile?.contexts || {})[0] || 'personal',
        notes: notes.trim() || null,
        source_node: 'debt_payment',
        is_recurring_instance: false,
      });

      // 2. Create DebtPayment record
      await base44.entities.DebtPayment.create({
        debt_id: debt.id,
        user_id: currentUser.id,
        amount: payAmount,
        date,
        notes: notes.trim() || null,
        transaction_id: txn.id,
      });

      // 3. Update Debt balance
      const newBalance = Math.max(0, (debt.current_balance || 0) - payAmount);
      await base44.entities.Debt.update(debt.id, {
        current_balance: newBalance,
        status: newBalance <= 0 ? 'paid_off' : 'active',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-debts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      toast.success('Payment logged');
      onOpenChange(false);
    },
    onError: (err) => toast.error(err?.message || 'Failed to log payment'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { toast.error('Amount must be greater than 0'); return; }
    payMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            Log Payment — {debt?.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-slate-400">Amount</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">$</span>
              <Input type="number" step="0.01" min="0" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-xl bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="0.00" autoFocus required />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Balance: {fmt(debt?.current_balance)} · Min: {fmt(debt?.minimum_payment)}
            </p>
          </div>
          <div>
            <Label className="text-slate-400">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500" required />
          </div>
          <div>
            <Label className="text-slate-400">Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)}
              className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="e.g. Extra payment this month" />
          </div>
          <div className="flex gap-3 pt-2">
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
              disabled={payMutation.isPending}>
              {payMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Tab ──────────────────────────────────────
export default function FinanceDebts({ profile, currentUser }) {
  const queryClient = useQueryClient();
  const [debtFormOpen, setDebtFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [payFormOpen, setPayFormOpen] = useState(false);
  const [payingDebt, setPayingDebt] = useState(null);

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['finance-debts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.Debt.filter(
        { profile_id: profile.id },
        'priority',
        200
      );
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // Move priority
  const reorderMutation = useMutation({
    mutationFn: async ({ debtId, direction }) => {
      const sorted = [...activeDebts].sort((a, b) => (a.priority || 999) - (b.priority || 999));
      const idx = sorted.findIndex((d) => d.id === debtId);
      if (idx < 0) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      // Swap priorities
      await base44.entities.Debt.update(sorted[idx].id, { priority: swapIdx });
      await base44.entities.Debt.update(sorted[swapIdx].id, { priority: idx });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance-debts'] }),
    onError: (err) => toast.error(err?.message || 'Failed to reorder'),
  });

  const activeDebts = useMemo(() =>
    debts.filter((d) => d.status !== 'paid_off').sort((a, b) => (a.priority || 999) - (b.priority || 999)),
    [debts]
  );

  const paidDebts = useMemo(() => debts.filter((d) => d.status === 'paid_off'), [debts]);

  const summary = useMemo(() => {
    const totalDebt = activeDebts.reduce((s, d) => s + (d.current_balance || 0), 0);
    const monthlyMins = activeDebts.reduce((s, d) => s + (d.minimum_payment || 0), 0);
    return { totalDebt, monthlyMins, count: activeDebts.length };
  }, [activeDebts]);

  const openAdd = () => { setEditingDebt(null); setDebtFormOpen(true); };
  const openEdit = (d) => { setEditingDebt(d); setDebtFormOpen(true); };
  const openPay = (d) => { setPayingDebt(d); setPayFormOpen(true); };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Total Debt</p>
          <p className="text-lg font-bold text-red-400">{fmt(summary.totalDebt)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Monthly Mins</p>
          <p className="text-lg font-bold text-amber-500">{fmt(summary.monthlyMins)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Active</p>
          <p className="text-lg font-bold text-slate-100">{summary.count}</p>
        </div>
      </div>

      {/* Debt list */}
      {activeDebts.length === 0 && paidDebts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <Landmark className="h-8 w-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">
            No debts tracked yet — that's great, or add them to start your payoff plan.
          </p>
          <button type="button" onClick={openAdd}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors min-h-[44px]">
            <Plus className="h-4 w-4" /> Add Debt
          </button>
        </div>
      ) : (
        <>
          {activeDebts.map((debt, idx) => {
            const paidPercent = debt.original_amount > 0
              ? Math.max(0, Math.min(100, ((debt.original_amount - debt.current_balance) / debt.original_amount) * 100))
              : 0;

            return (
              <div key={debt.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                {/* Header row */}
                <div className="flex items-start gap-3">
                  {/* Priority arrows */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0 pt-0.5">
                    <button type="button" disabled={idx === 0}
                      onClick={() => reorderMutation.mutate({ debtId: debt.id, direction: 'up' })}
                      className={`p-0.5 rounded ${idx === 0 ? 'text-slate-700' : 'text-slate-400 hover:text-amber-500'}`}>
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={idx === activeDebts.length - 1}
                      onClick={() => reorderMutation.mutate({ debtId: debt.id, direction: 'down' })}
                      className={`p-0.5 rounded ${idx === activeDebts.length - 1 ? 'text-slate-700' : 'text-slate-400 hover:text-amber-500'}`}>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  <button type="button" onClick={() => openEdit(debt)} className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{debt.name}</p>
                    <div className="flex gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
                      {debt.interest_rate > 0 && <span>{debt.interest_rate}% APR</span>}
                      {debt.minimum_payment > 0 && <span>Min: {fmt(debt.minimum_payment)}</span>}
                      {debt.interest_rate > 0 && debt.current_balance > 0 && (
                        <span className="text-slate-500">~{fmt((debt.current_balance * debt.interest_rate / 100) / 12)}/mo interest</span>
                      )}
                    </div>
                  </button>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-red-400">{fmt(debt.current_balance)}</p>
                    {debt.original_amount > 0 && (
                      <p className="text-xs text-slate-500">of {fmt(debt.original_amount)}</p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {debt.original_amount > 0 && (
                  <div className="space-y-1">
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${paidPercent}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 text-right">{paidPercent.toFixed(0)}% paid off</p>
                  </div>
                )}

                {/* Log payment button */}
                <button type="button" onClick={() => openPay(debt)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-amber-500 text-amber-500 hover:bg-amber-500/10 transition-colors text-sm font-medium min-h-[40px]">
                  Log Payment
                </button>
              </div>
            );
          })}

          {/* Paid off debts */}
          {paidDebts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Paid Off</p>
              {paidDebts.map((debt) => (
                <button key={debt.id} type="button" onClick={() => openEdit(debt)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-left opacity-60 hover:border-amber-500/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400 truncate">{debt.name}</p>
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                      Paid Off
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Add button */}
          <div className="flex justify-center pt-2">
            <button type="button" onClick={openAdd}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors min-h-[44px]">
              <Plus className="h-4 w-4" /> Add Debt
            </button>
          </div>
        </>
      )}

      <DebtForm
        open={debtFormOpen}
        onOpenChange={setDebtFormOpen}
        profile={profile}
        currentUser={currentUser}
        debt={editingDebt}
      />

      <LogPaymentForm
        open={payFormOpen}
        onOpenChange={setPayFormOpen}
        debt={payingDebt}
        profile={profile}
        currentUser={currentUser}
      />
    </div>
  );
}
