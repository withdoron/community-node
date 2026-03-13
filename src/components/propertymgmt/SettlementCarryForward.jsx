import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n ?? 0);
}

/**
 * Checkbox list for carrying forward recurring expenses.
 * Shown when creating a new settlement and previous-month expenses exist.
 */
export default function SettlementCarryForward({
  open,
  onClose,
  candidates,
  previousMonthLabel,
  currentMonthLabel,
  getPropertyLabel,
  onConfirm,
}) {
  const keyFor = (c, i) => c.id ?? `i-${i}`;

  const [checked, setChecked] = useState(() =>
    (candidates || []).reduce(
      (acc, c, i) => ({ ...acc, [keyFor(c, i)]: c.preChecked ?? true }),
      {}
    )
  );

  useEffect(() => {
    if (open && candidates?.length) {
      setChecked(
        candidates.reduce(
          (acc, c, i) => ({ ...acc, [keyFor(c, i)]: c.preChecked ?? true }),
          {}
        )
      );
    }
  }, [open, candidates]);

  const toggle = (key) => {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAll = () =>
    setChecked(
      (candidates || []).reduce(
        (acc, c, i) => ({ ...acc, [keyFor(c, i)]: true }),
        {}
      )
    );
  const selectNone = () => setChecked({});

  const selectedList = (candidates || []).filter(
    (c, i) => checked[keyFor(c, i)]
  );
  const totalAmount = selectedList.reduce(
    (s, e) => s + (Number(e.amount) || 0),
    0
  );

  const handleConfirm = () => {
    onConfirm(selectedList);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            Carry Forward Recurring Expenses
          </DialogTitle>
          <p className="text-sm text-slate-400 mt-1">
            These expenses from {previousMonthLabel} can be copied to{' '}
            {currentMonthLabel}. Recurring expenses are pre-selected.
          </p>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={selectAll}
              className="text-amber-500 hover:text-amber-400"
            >
              Select all
            </button>
            <span className="text-slate-500">|</span>
            <button
              type="button"
              onClick={selectNone}
              className="text-slate-400 hover:text-slate-300"
            >
              Clear
            </button>
          </div>
          <div className="border border-slate-800 rounded-lg divide-y divide-slate-800 max-h-[280px] overflow-y-auto">
            {(candidates || []).map((exp, index) => {
              const categoryLabel =
                CATEGORY_LABELS[exp.category] || exp.category || 'Other';
              const propLabel = getPropertyLabel
                ? getPropertyLabel(exp.property_id)
                : exp.property_id
                  ? 'Unit'
                  : 'Shared';
              const key = keyFor(exp, index);
              const isChecked = !!checked[key];
              return (
                <label
                  key={key}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 cursor-pointer"
                >
                  {/* Pure CSS checkbox — avoids Radix Checkbox infinite loop (DEC-018) */}
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(key)}
                    className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-200 font-medium">
                      {categoryLabel}
                    </span>
                    <span className="text-slate-400 text-sm block truncate">
                      {exp.description || '—'}
                    </span>
                    <span className="text-slate-500 text-xs">{propLabel}</span>
                  </div>
                  <span className="text-amber-500 font-bold shrink-0">
                    {formatCurrency(exp.amount)}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-sm text-slate-400 pt-1">
            <span>
              {selectedList.length} of {candidates.length} selected
            </span>
            <span className="font-semibold text-slate-200">
              Total: {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 hover:bg-transparent"
          >
            Skip
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={selectedList.length === 0}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-50"
          >
            Add {selectedList.length} Expense
            {selectedList.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
