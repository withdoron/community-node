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
      <DialogContent className="bg-card border border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Carry Forward Recurring Expenses
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            These expenses from {previousMonthLabel} can be copied to{' '}
            {currentMonthLabel}. Recurring expenses are pre-selected.
          </p>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={selectAll}
              className="text-primary hover:text-primary-hover"
            >
              Select all
            </button>
            <span className="text-muted-foreground/70">|</span>
            <button
              type="button"
              onClick={selectNone}
              className="text-muted-foreground hover:text-foreground-soft"
            >
              Clear
            </button>
          </div>
          <div className="border border-border rounded-lg divide-y divide-border max-h-[280px] overflow-y-auto">
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
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 cursor-pointer"
                >
                  {/* Pure CSS checkbox — avoids Radix Checkbox infinite loop (DEC-018) */}
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(key)}
                    className="rounded border-border bg-secondary text-primary focus:ring-ring"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground font-medium">
                      {categoryLabel}
                    </span>
                    <span className="text-muted-foreground text-sm block truncate">
                      {exp.description || '—'}
                    </span>
                    <span className="text-muted-foreground/70 text-xs">{propLabel}</span>
                  </div>
                  <span className="text-primary font-bold shrink-0">
                    {formatCurrency(exp.amount)}
                  </span>
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
            <span>
              {selectedList.length} of {candidates.length} selected
            </span>
            <span className="font-semibold text-foreground">
              Total: {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-transparent"
          >
            Skip
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={selectedList.length === 0}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold disabled:opacity-50"
          >
            Add {selectedList.length} Expense
            {selectedList.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
