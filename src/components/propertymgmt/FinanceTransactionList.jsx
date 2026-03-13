import React, { useMemo } from 'react';
import { Receipt, Check, Repeat, Pencil, Trash2, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

const CATEGORY_LABELS = {
  rent: 'Rent',
  security_deposit: 'Security Deposit',
  late_fee: 'Late Fee',
  property_tax: 'Property Tax',
  water_sewer: 'Water/Sewer',
  insurance: 'Insurance',
  electric: 'Electric',
  gas: 'Gas',
  repairs: 'Repairs',
  supplies: 'Supplies',
  mileage: 'Mileage',
  management_fee: 'Mgmt Fee',
  other: 'Other',
};

const inputClass =
  'rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2 text-sm';

export default function FinanceTransactionList({
  expenses,
  groups,
  properties,
  filters,
  onFiltersChange,
  onEdit,
  onDelete,
  onReconcileToggle,
  onReceiptClick,
}) {
  const {
    typeFilter = 'all',
    categoryFilter = 'all',
    groupFilter = '',
    propertyFilter = '',
    searchText = '',
    reconciliationFilter = 'all',
    dateFrom = '',
    dateTo = '',
  } = filters;

  const groupsById = useMemo(() => {
    const m = {};
    (groups || []).forEach((g) => { m[g.id] = g; });
    return m;
  }, [groups]);

  const propertiesById = useMemo(() => {
    const m = {};
    (properties || []).forEach((p) => { m[p.id] = p; });
    return m;
  }, [properties]);

  const filteredProperties = useMemo(() => {
    if (!groupFilter) return properties || [];
    return (properties || []).filter((p) => p.group_id === groupFilter);
  }, [properties, groupFilter]);

  const filtered = useMemo(() => {
    let list = [...(expenses || [])];
    if (typeFilter !== 'all') list = list.filter((e) => e.type === typeFilter);
    if (categoryFilter !== 'all') list = list.filter((e) => e.category === categoryFilter);
    if (groupFilter) list = list.filter((e) => e.group_id === groupFilter);
    if (propertyFilter) list = list.filter((e) => e.property_id === propertyFilter);
    if (dateFrom) list = list.filter((e) => (e.date || '') >= dateFrom);
    if (dateTo) list = list.filter((e) => (e.date || '') <= dateTo);
    if (reconciliationFilter === 'reconciled') list = list.filter((e) => !!e.reconciled);
    else if (reconciliationFilter === 'unreconciled') list = list.filter((e) => !e.reconciled);
    if (searchText) {
      const q = searchText.toLowerCase();
      list = list.filter(
        (e) =>
          (e.description || '').toLowerCase().includes(q) ||
          (e.vendor || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return list;
  }, [expenses, typeFilter, categoryFilter, groupFilter, propertyFilter, dateFrom, dateTo, reconciliationFilter, searchText]);

  const setFilter = (key, val) => onFiltersChange({ ...filters, [key]: val });

  const allCategories = useMemo(() => {
    const cats = new Set();
    (expenses || []).forEach((e) => e.category && cats.add(e.category));
    return Array.from(cats).sort();
  }, [expenses]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          className={inputClass + ' w-auto min-w-[100px]'}
          value={typeFilter}
          onChange={(e) => setFilter('typeFilter', e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select
          className={inputClass + ' w-auto min-w-[120px]'}
          value={categoryFilter}
          onChange={(e) => setFilter('categoryFilter', e.target.value)}
        >
          <option value="all">All Categories</option>
          {allCategories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] || c}
            </option>
          ))}
        </select>
        <select
          className={inputClass + ' w-auto min-w-[120px]'}
          value={groupFilter}
          onChange={(e) => {
            setFilter('groupFilter', e.target.value);
            if (propertyFilter) setFilter('propertyFilter', '');
          }}
        >
          <option value="">All Groups</option>
          {(groups || []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {groupFilter && filteredProperties.length > 0 && (
          <select
            className={inputClass + ' w-auto min-w-[120px]'}
            value={propertyFilter}
            onChange={(e) => setFilter('propertyFilter', e.target.value)}
          >
            <option value="">All Properties</option>
            {filteredProperties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <input
          type="date"
          className={inputClass + ' w-auto'}
          value={dateFrom}
          onChange={(e) => setFilter('dateFrom', e.target.value)}
          placeholder="From"
        />
        <input
          type="date"
          className={inputClass + ' w-auto'}
          value={dateTo}
          onChange={(e) => setFilter('dateTo', e.target.value)}
          placeholder="To"
        />
        <select
          className={inputClass + ' w-auto min-w-[120px]'}
          value={reconciliationFilter}
          onChange={(e) => setFilter('reconciliationFilter', e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="reconciled">Reconciled</option>
          <option value="unreconciled">Unreconciled</option>
        </select>
        <input
          type="text"
          className={inputClass + ' w-auto min-w-[140px]'}
          value={searchText}
          onChange={(e) => setFilter('searchText', e.target.value)}
          placeholder="Search..."
        />
      </div>

      {/* Count */}
      <p className="text-xs text-slate-500">
        {filtered.length} of {(expenses || []).length} transactions
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Receipt className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">No transactions match your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((exp) => {
            const isIncome = exp.type === 'income';
            const groupName = groupsById[exp.group_id]?.name || '—';
            const propName = exp.property_id
              ? propertiesById[exp.property_id]?.name || '—'
              : 'Shared';
            const receiptUrl =
              typeof exp.receipt_url === 'object' && exp.receipt_url?.url
                ? exp.receipt_url.url
                : exp.receipt_url || '';

            return (
              <div
                key={exp.id}
                className={`bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-start gap-3 ${
                  exp.reconciled ? 'opacity-70' : ''
                }`}
              >
                {/* Reconcile checkbox */}
                <button
                  type="button"
                  onClick={() => onReconcileToggle(exp)}
                  className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    exp.reconciled
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'border-slate-600 text-transparent hover:border-slate-500'
                  }`}
                >
                  {exp.reconciled && <Check className="w-3 h-3" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500">{formatDate(exp.date)}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded-full font-medium uppercase ${
                        isIncome
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {exp.type}
                    </span>
                    <span className="text-xs text-slate-400">
                      {CATEGORY_LABELS[exp.category] || exp.category}
                    </span>
                    {exp.is_recurring && (
                      <Repeat className="w-3 h-3 text-slate-500" />
                    )}
                  </div>
                  {exp.description && (
                    <p className="text-sm text-slate-200 mt-1">{exp.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>{groupName}</span>
                    <span>{propName}</span>
                    {exp.vendor && <span>Vendor: {exp.vendor}</span>}
                  </div>
                  {exp.paid_by === 'manager' && exp.reimbursement_status && exp.reimbursement_status !== 'not_applicable' && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-[10px] rounded-full bg-amber-500/10 text-amber-400">
                      Reimb: {exp.reimbursement_status.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <p
                    className={`font-bold ${
                      isIncome ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {isIncome ? '+' : '-'}{formatCurrency(exp.amount)}
                  </p>
                </div>

                {/* Receipt thumbnail */}
                {receiptUrl && (
                  <button
                    type="button"
                    onClick={() => onReceiptClick(receiptUrl)}
                    className="shrink-0"
                  >
                    <Image className="w-5 h-5 text-slate-500 hover:text-amber-500" />
                  </button>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(exp)}
                    className="h-8 w-8 text-slate-400 hover:text-amber-500 hover:bg-slate-800"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(exp)}
                    className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
