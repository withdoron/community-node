import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function TransactionForm({
  open,
  onOpenChange,
  profile,
  currentUser,
  transaction,
  defaultType,
  onSaved,
}) {
  const queryClient = useQueryClient();
  const isEdit = !!transaction;

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setType(defaultType || transaction?.type || 'expense');
      setAmount(transaction?.amount?.toString() || '');
      setDate(transaction?.date?.split?.('T')?.[0] || transaction?.date || new Date().toISOString().split('T')[0]);
      setDescription(transaction?.description || '');
      const defaultCtx = transaction?.context || Object.keys(profile?.contexts || {})[0] || '';
      setContext(defaultCtx);
      setCategory(transaction?.category || '');
      setNotes(transaction?.notes || '');
      setConfirmDelete(false);
    }
  }, [open, transaction, defaultType, profile]);

  const activeContexts = Object.entries(profile?.contexts || {})
    .filter(([, ctx]) => ctx.is_active)
    .map(([id, ctx]) => ({ id, label: ctx.label }));

  // Resolve categories: new format is { context: { income: [], expense: [] } }
  // Old format was { context: [] } — treat flat array as expense list, use defaults for income
  const DEFAULT_INCOME_CATS = ['Salary/Wages', 'Client Payment', 'Reimbursement', 'Gift', 'Other Income'];
  const contextCats = profile?.categories?.[context];
  const availableCategories = (() => {
    if (!contextCats) return [];
    // New nested format
    if (contextCats.income || contextCats.expense) {
      return contextCats[type] || [];
    }
    // Old flat format — treat array as expense, use defaults for income
    if (Array.isArray(contextCats)) {
      return type === 'expense' ? contextCats : DEFAULT_INCOME_CATS;
    }
    return [];
  })();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        profile_id: profile.id,
        user_id: currentUser.id,
        type,
        amount: parseFloat(amount),
        date,
        description: description.trim(),
        category,
        context,
        notes: notes.trim() || null,
        source_node: 'manual',
        is_recurring_instance: false,
      };
      if (isEdit) {
        return base44.entities.Transaction.update(transaction.id, payload);
      }
      return base44.entities.Transaction.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      toast.success(isEdit ? 'Transaction updated' : 'Transaction added');
      onOpenChange(false);
      onSaved?.();
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to save transaction');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Transaction.delete(transaction.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      toast.success('Transaction deleted');
      onOpenChange(false);
      onSaved?.();
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to delete transaction');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {isEdit ? 'Edit Transaction' : 'Add Transaction'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${
                type === 'income'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${
                type === 'expense'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-300'
              }`}
            >
              Expense
            </button>
          </div>

          {/* Amount */}
          <div>
            <Label className="text-slate-400">Amount *</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-xl bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="0.00"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <Label className="text-slate-400">Date *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-slate-400">Description *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="e.g. Grocery run, Client payment"
              required
            />
          </div>

          {/* Context */}
          <div>
            <Label className="text-slate-400">Context</Label>
            <select
              value={context}
              onChange={(e) => {
                setContext(e.target.value);
                setCategory('');
              }}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            >
              {activeContexts.map((ctx) => (
                <option key={ctx.id} value={ctx.id}>{ctx.label}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <Label className="text-slate-400">Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            >
              <option value="">Select category</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-slate-400">Notes (optional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="Any additional details..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {isEdit && !confirmDelete && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(true)}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 min-h-[44px]"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            {isEdit && confirmDelete && (
              <Button
                type="button"
                onClick={() => deleteMutation.mutate()}
                className="bg-red-600 hover:bg-red-500 text-white min-h-[44px]"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Delete'}
              </Button>
            )}
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? 'Update' : 'Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
