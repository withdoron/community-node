import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Loader2, ChevronRight, ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

// ═══ V2 Defaults — single Personal context, real-life language ═══

const DEFAULT_CONTEXTS = {
  personal: { label: 'Personal', tax_schedule: 'none', is_active: true, linked_workspace_id: null },
};

const DEFAULT_CATEGORIES = {
  personal: {
    income: [
      'Paycheck',
      'Side income',
      'Reimbursement',
      'Gift',
      'Government benefits',
      'Other income',
    ],
    expense: [
      'Housing (rent/mortgage)',
      'Groceries',
      'Dining out',
      'Gas & transportation',
      'Utilities',
      'Phone & internet',
      'Health & medical',
      'Insurance',
      'Kids & family',
      'Subscriptions & apps',
      'Clothing',
      'Fun & entertainment',
      'Giving & tithing',
      'Savings & investments',
      'Debt payments',
      'Other',
    ],
  },
};

// Exported so FinanceSettings can reuse for "Reset to defaults"
export { DEFAULT_CONTEXTS, DEFAULT_CATEGORIES };

// ═══ Essentials for Step 2 ═══

const ESSENTIALS = [
  { id: 'rent', label: 'Rent / Mortgage', subtitle: null, description: 'Rent / Mortgage', category: 'Housing (rent/mortgage)' },
  { id: 'utilities', label: 'Utilities', subtitle: 'electric, water, gas', description: 'Utilities', category: 'Utilities' },
  { id: 'phone', label: 'Phone', subtitle: null, description: 'Phone', category: 'Phone & internet' },
  { id: 'internet', label: 'Internet', subtitle: null, description: 'Internet', category: 'Phone & internet' },
  { id: 'groceries', label: 'Groceries', subtitle: null, description: 'Groceries', category: 'Groceries' },
  { id: 'transportation', label: 'Transportation', subtitle: 'gas, car payment, transit', description: 'Transportation', category: 'Gas & transportation' },
  { id: 'insurance', label: 'Insurance', subtitle: 'health, car, renters', description: 'Insurance', category: 'Insurance' },
  { id: 'childcare', label: 'Childcare / School', subtitle: null, description: 'Childcare / School', category: 'Kids & family' },
  { id: 'subscriptions', label: 'Subscriptions', subtitle: 'streaming, apps', description: 'Subscriptions', category: 'Subscriptions & apps' },
  { id: 'other', label: 'Other essential', subtitle: null, description: '', category: 'Other', hasCustomName: true },
];

// ═══ Step Indicator ═══

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i + 1 === current
              ? 'w-8 bg-amber-500'
              : i + 1 < current
                ? 'w-2 bg-amber-500/60'
                : 'w-2 bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
}

// ═══ Main Component ═══

export default function FinanceOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1
  const [workspaceName, setWorkspaceName] = useState('');

  // Step 2 — essentials
  const [essentials, setEssentials] = useState(
    ESSENTIALS.map((e) => ({ ...e, selected: false, amount: '', customName: '' }))
  );

  // Step 3 — debts
  const [debts, setDebts] = useState([]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // ─── Derived: running totals ──────────────────────
  const essentialTotal = useMemo(
    () =>
      essentials
        .filter((e) => e.selected && parseFloat(e.amount) > 0)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0),
    [essentials]
  );

  const debtMinTotal = useMemo(
    () =>
      debts
        .filter((d) => parseFloat(d.minimum) > 0)
        .reduce((sum, d) => sum + parseFloat(d.minimum), 0),
    [debts]
  );

  const enoughTotal = essentialTotal + debtMinTotal;

  // ─── Essential handlers ───────────────────────────
  const toggleEssential = (id) => {
    setEssentials((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  };

  const updateEssentialAmount = (id, amount) => {
    setEssentials((prev) =>
      prev.map((e) => (e.id === id ? { ...e, amount } : e))
    );
  };

  const updateEssentialName = (id, customName) => {
    setEssentials((prev) =>
      prev.map((e) => (e.id === id ? { ...e, customName } : e))
    );
  };

  // ─── Debt handlers ───────────────────────────────
  const addDebt = () => {
    setDebts((prev) => [...prev, { name: '', balance: '', minimum: '' }]);
  };

  const updateDebt = (index, field, value) => {
    setDebts((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  const removeDebt = (index) => {
    setDebts((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Create workspace mutation ────────────────────
  const createWorkspace = useMutation({
    mutationFn: async () => {
      // 1. Create FinancialProfile
      const profile = await base44.entities.FinancialProfile.create({
        user_id: currentUser.id,
        workspace_name: workspaceName.trim() || 'My Finances',
        contexts: DEFAULT_CONTEXTS,
        categories: DEFAULT_CATEGORIES,
        enough_number: null,
        enough_number_mode: 'auto',
        enough_number_explained: false,
        profit_first_enabled: false,
        profit_first_targets: null,
      });

      // 2. Create RecurringTransactions for selected essentials
      const selectedEssentials = essentials.filter(
        (e) => e.selected && parseFloat(e.amount) > 0
      );
      for (const essential of selectedEssentials) {
        const desc = essential.hasCustomName
          ? (essential.customName.trim() || 'Other essential')
          : essential.description;
        await base44.entities.RecurringTransaction.create({
          profile_id: profile.id,
          user_id: currentUser.id,
          type: 'expense',
          amount: parseFloat(essential.amount),
          description: desc,
          frequency: 'monthly',
          day_of_month: 1,
          context: 'personal',
          category: essential.category,
          is_active: true,
          next_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0],
        });
      }

      // 3. Create Debts
      const validDebts = debts.filter((d) => d.name.trim() && parseFloat(d.balance) > 0);
      for (let i = 0; i < validDebts.length; i++) {
        const d = validDebts[i];
        await base44.entities.Debt.create({
          profile_id: profile.id,
          user_id: currentUser.id,
          name: d.name.trim(),
          original_amount: parseFloat(d.balance) || 0,
          current_balance: parseFloat(d.balance) || 0,
          minimum_payment: parseFloat(d.minimum) || 0,
          interest_rate: 0,
          status: 'active',
          priority: i,
          notes: null,
        });
      }

      return profile;
    },
    onSuccess: (profile) => {
      toast.success('Finance workspace created');
      navigate(createPageUrl('BusinessDashboard') + '?finance=' + profile.id);
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to create workspace');
    },
  });

  // ─── Loading gate ─────────────────────────────────
  if (!currentUser?.id) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Create a Finance Workspace</h1>
            <p className="text-sm text-slate-400">
              {step === 1 && 'Name your workspace'}
              {step === 2 && 'Set up your essentials'}
              {step === 3 && 'Track your debts'}
            </p>
          </div>
        </div>

        <StepIndicator current={step} total={3} />

        {/* ═══ Step 1: Name It ═══ */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-1">
                What should we call this workspace?
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                This is your private financial mirror. Only you can see it.
              </p>
              <div>
                <Label className="text-slate-400">Workspace name</Label>
                <Input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="My Finances"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1">You can change this later in Settings.</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 min-h-[44px]"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ Step 2: Monthly Essentials ═══ */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 mb-1">
                What are your monthly essentials?
              </h2>
              <p className="text-sm text-slate-400">
                Tap the ones you pay for. We'll use these to build your Enough Number.
              </p>
            </div>

            {/* Essentials Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {essentials.map((essential) => (
                <div key={essential.id} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleEssential(essential.id)}
                    className={`w-full text-left rounded-xl p-4 border transition-all min-h-[72px] ${
                      essential.selected
                        ? 'bg-slate-900 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        essential.selected ? 'text-amber-500' : 'text-slate-300'
                      }`}
                    >
                      {essential.label}
                    </p>
                    {essential.subtitle && (
                      <p className="text-xs text-slate-500 mt-0.5">{essential.subtitle}</p>
                    )}
                  </button>

                  {/* Amount input (visible when selected) */}
                  {essential.selected && (
                    <div className="space-y-2">
                      {essential.hasCustomName && (
                        <Input
                          value={essential.customName}
                          onChange={(e) => updateEssentialName(essential.id, e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white text-sm placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                          placeholder="What is it?"
                        />
                      )}
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={essential.amount}
                          onChange={(e) => updateEssentialAmount(essential.id, e.target.value)}
                          className="pl-7 bg-slate-800 border-slate-700 text-white text-sm placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Running total */}
            <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-400">Your Enough Number so far</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">
                {fmt(essentialTotal)}
                <span className="text-sm font-normal text-slate-400">/month</span>
              </p>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 min-h-[44px]"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ Step 3: Debts (Optional) ═══ */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 mb-1">
                Got any debts to track?
              </h2>
              <p className="text-sm text-slate-400">
                These minimums will be added to your Enough Number.
              </p>
            </div>

            {/* Skip button — prominent when no debts added */}
            {debts.length === 0 && (
              <button
                type="button"
                onClick={() => createWorkspace.mutate()}
                disabled={createWorkspace.isPending}
                className="w-full bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-5 text-center transition-colors"
              >
                {createWorkspace.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500 mx-auto" />
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-300">
                      Not right now — I'll add these later
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Skip to create your workspace</p>
                  </>
                )}
              </button>
            )}

            {/* Debt cards */}
            {debts.map((debt, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-300">Debt {idx + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeDebt(idx)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <Label className="text-slate-400 text-xs">Name</Label>
                  <Input
                    value={debt.name}
                    onChange={(e) => updateDebt(idx, 'name', e.target.value)}
                    className="mt-1 bg-slate-800 border-slate-700 text-white text-sm placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g. Credit Card, Car Loan"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-400 text-xs">Current Balance</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={debt.balance}
                        onChange={(e) => updateDebt(idx, 'balance', e.target.value)}
                        className="pl-7 bg-slate-800 border-slate-700 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Minimum Payment</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={debt.minimum}
                        onChange={(e) => updateDebt(idx, 'minimum', e.target.value)}
                        className="pl-7 bg-slate-800 border-slate-700 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add debt button */}
            <button
              type="button"
              onClick={addDebt}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:border-amber-500/50 hover:text-amber-500 transition-colors text-sm min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              {debts.length === 0 ? 'Add a debt' : 'Add another debt'}
            </button>

            {/* Running total */}
            <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-400">Your Enough Number</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">
                {fmt(enoughTotal)}
                <span className="text-sm font-normal text-slate-400">/month</span>
              </p>
              {debtMinTotal > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {fmt(essentialTotal)} essentials + {fmt(debtMinTotal)} debt minimums
                </p>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => createWorkspace.mutate()}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 min-h-[44px]"
                disabled={createWorkspace.isPending}
              >
                {createWorkspace.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create Workspace'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
