import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Plus, Upload } from 'lucide-react';
import TransactionForm from './TransactionForm';
import FinanceImport from './FinanceImport';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + (d.includes('T') ? '' : 'T12:00:00'));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const DATE_PRESETS = [
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_3_months', label: 'Last 3 Mo' },
  { id: 'this_year', label: 'This Year' },
  { id: 'all_time', label: 'All Time' },
];

function getDateRange(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n) => String(n).padStart(2, '0');
  const toStr = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

  switch (preset) {
    case 'this_month':
      return { start: `${y}-${pad(m + 1)}-01`, end: null };
    case 'last_month': {
      const s = new Date(y, m - 1, 1);
      const e = new Date(y, m, 0);
      return { start: toStr(s), end: toStr(e) };
    }
    case 'last_3_months':
      return { start: toStr(new Date(y, m - 2, 1)), end: null };
    case 'this_year':
      return { start: `${y}-01-01`, end: null };
    case 'all_time':
    default:
      return { start: null, end: null };
  }
}

export default function FinanceActivity({ profile, currentUser }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [contextFilter, setContextFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState('this_month');

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [defaultType, setDefaultType] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  // Query all transactions for this profile
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['finance-transactions', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.Transaction.filter(
        { profile_id: profile.id },
        '-date',
        1000
      );
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // Active contexts for filter dropdown
  const activeContexts = Object.entries(profile?.contexts || {})
    .filter(([, ctx]) => ctx.is_active)
    .map(([id, ctx]) => ({ id, label: ctx.label }));

  const singleContext = activeContexts.length <= 1;

  // Categories for current context filter — combine income + expense for filtering
  const filterCategories = useMemo(() => {
    if (contextFilter === 'all') return [];
    const contextCats = profile?.categories?.[contextFilter];
    if (!contextCats) return [];
    // New nested format { income: [], expense: [] }
    if (contextCats.income || contextCats.expense) {
      const combined = [...(contextCats.income || []), ...(contextCats.expense || [])];
      return [...new Set(combined)]; // deduplicate
    }
    // Old flat format — just an array
    if (Array.isArray(contextCats)) return contextCats;
    return [];
  }, [contextFilter, profile?.categories]);

  // Reset category filter when context changes
  const handleContextFilterChange = (val) => {
    setContextFilter(val);
    setCategoryFilter('all');
  };

  // Apply filters
  const filtered = useMemo(() => {
    const { start, end } = getDateRange(dateRange);
    return transactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (contextFilter !== 'all' && t.context !== contextFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      const td = (t.date || '').split('T')[0];
      if (start && td < start) return false;
      if (end && td > end) return false;
      return true;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, typeFilter, contextFilter, categoryFilter, dateRange]);

  // Summary from filtered data
  const summary = useMemo(() => {
    const income = filtered
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = filtered
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + (t.amount || 0), 0);
    return { income, expenses, net: income - expenses };
  }, [filtered]);

  const openAddForm = (type) => {
    setEditingTransaction(null);
    setDefaultType(type || 'expense');
    setFormOpen(true);
  };

  const openEditForm = (txn) => {
    setEditingTransaction(txn);
    setDefaultType(null);
    setFormOpen(true);
  };

  const getContextLabel = (ctxId) => {
    return profile?.contexts?.[ctxId]?.label || ctxId;
  };

  // Ownership guard — after all hooks
  if (profile && currentUser && profile.user_id !== currentUser.id) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>You don't have access to this workspace.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        {/* Row 1: Type + Context + Category + Import */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Type toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            {['all', 'income', 'expense'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors min-h-[36px] ${
                  typeFilter === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground-soft'
                }`}
              >
                {t === 'all' ? 'All' : t === 'income' ? 'Income' : 'Expense'}
              </button>
            ))}
          </div>

          {/* Context dropdown — hidden when single context */}
          {!singleContext && (
            <select
              value={contextFilter}
              onChange={(e) => handleContextFilterChange(e.target.value)}
              className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:border-primary min-h-[36px]"
            >
              <option value="all">All Contexts</option>
              {activeContexts.map((ctx) => (
                <option key={ctx.id} value={ctx.id}>{ctx.label}</option>
              ))}
            </select>
          )}

          {/* Category dropdown (only when context selected) */}
          {contextFilter !== 'all' && filterCategories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:border-primary min-h-[36px]"
            >
              <option value="all">All Categories</option>
              {filterCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          {/* Import button */}
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-secondary border border-border text-foreground-soft hover:text-primary hover:border-primary/50 transition-colors min-h-[36px]"
          >
            <Upload className="h-3.5 w-3.5" />
            Import
          </button>
        </div>

        {/* Row 2: Date range presets */}
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDateRange(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[32px] ${
                dateRange === p.id
                  ? 'bg-primary/20 text-primary border border-primary/50'
                  : 'bg-secondary text-muted-foreground border border-border hover:text-foreground-soft'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Income</p>
          <p className="text-lg font-bold text-emerald-400">{fmt(summary.income)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Expenses</p>
          <p className="text-lg font-bold text-red-400">{fmt(summary.expenses)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Net</p>
          <p className={`text-lg font-bold ${summary.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(summary.net)}
          </p>
        </div>
      </div>

      {/* Transaction List */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No transactions yet. Add your first income or expense to start tracking.
          </p>
          <button
            type="button"
            onClick={() => openAddForm()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((txn) => (
            <button
              key={txn.id}
              type="button"
              onClick={() => openEditForm(txn)}
              className="w-full bg-card border border-border hover:border-primary/50 rounded-xl p-4 text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground/70 w-14 flex-shrink-0">{fmtDate(txn.date)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{txn.description}</p>
                  <div className="flex gap-2 mt-1">
                    {/* Context badge — hidden when single context */}
                    {!singleContext && txn.context && (
                      <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                        {getContextLabel(txn.context)}
                      </span>
                    )}
                    {txn.category && (
                      <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                        {txn.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`text-sm font-semibold flex-shrink-0 ${
                  txn.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {txn.type === 'income' ? '+' : '-'}{fmt(txn.amount)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* FAB — Add Transaction */}
      {filtered.length > 0 && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => openAddForm()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </button>
        </div>
      )}

      {/* Transaction Form Dialog */}
      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        profile={profile}
        currentUser={currentUser}
        transaction={editingTransaction}
        defaultType={defaultType}
        onSaved={() => setEditingTransaction(null)}
      />

      {/* Import Modal */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6">
            <FinanceImport
              profile={profile}
              currentUser={currentUser}
              onNavigateTab={() => setImportOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}