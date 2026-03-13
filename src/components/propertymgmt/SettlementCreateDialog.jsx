import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  getRecurringCandidates,
  getPreviousMonth,
} from './utils/recurringExpenseUtils';
import { formatMonthDisplay } from './utils/calculateSettlement';
import SettlementCarryForward from './SettlementCarryForward';

const inputClass =
  'w-full rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2 text-sm';
const labelClass = 'text-slate-300 text-sm font-medium block mb-1';

const MONTHS = [
  '01', '02', '03', '04', '05', '06',
  '07', '08', '09', '10', '11', '12',
];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Dialog to create a new settlement.
 * Handles group + month selection, duplicate validation,
 * and recurring expense carry-forward prompt.
 */
export default function SettlementCreateDialog({
  open,
  onClose,
  groups,
  allExpenses,
  existingSettlements,
  onSave,
  onCarryForwardExpenses,
  getPropertyLabel,
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

  const [group_id, setGroupId] = useState('');
  const [year, setYear] = useState(String(currentYear));
  const [monthNum, setMonthNum] = useState(currentMonth);
  const [error, setError] = useState('');
  const [recurringCandidates, setRecurringCandidates] = useState([]);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const draftCreatedRef = useRef(false);

  const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
  const group = groups?.find((g) => g.id === group_id);

  useEffect(() => {
    if (open) {
      setGroupId('');
      setYear(String(currentYear));
      setMonthNum(currentMonth);
      setError('');
      setShowRecurringDialog(false);
      setRecurringCandidates([]);
      draftCreatedRef.current = false;
    }
  }, [open, currentYear, currentMonth]);

  const saveDraftAndClose = () => {
    if (draftCreatedRef.current) return;
    draftCreatedRef.current = true;
    onSave({
      group_id,
      month: monthStr,
      status: 'draft',
      notes: '',
    });
    onClose();
  };

  const handleNext = () => {
    setError('');
    const exists = (existingSettlements || []).some(
      (s) => s.group_id === group_id && s.month === monthStr
    );
    if (exists) {
      setError(
        `A settlement for ${group?.name || 'this group'} in ${formatMonthDisplay(monthStr)} already exists.`
      );
      return;
    }
    const candidates = getRecurringCandidates(
      allExpenses || [],
      group_id,
      monthStr
    );
    if (candidates.length > 0 && onCarryForwardExpenses) {
      setRecurringCandidates(candidates);
      setShowRecurringDialog(true);
      return;
    }
    saveDraftAndClose();
  };

  const handleRecurringConfirm = async (selectedCandidates) => {
    if (selectedCandidates.length > 0 && onCarryForwardExpenses) {
      await onCarryForwardExpenses(selectedCandidates, group_id, monthStr);
    }
    setShowRecurringDialog(false);
    setRecurringCandidates([]);
    saveDraftAndClose();
  };

  const handleRecurringCancel = () => {
    setShowRecurringDialog(false);
    setRecurringCandidates([]);
    saveDraftAndClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              New Settlement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Property group *</label>
              <select
                className={inputClass}
                value={group_id}
                onChange={(e) => setGroupId(e.target.value)}
                required
              >
                <option value="">Select group</option>
                {(groups || []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Year *</label>
                <input
                  type="number"
                  className={inputClass}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  min="2020"
                  max="2030"
                />
              </div>
              <div>
                <label className={labelClass}>Month *</label>
                <select
                  className={inputClass}
                  value={monthNum}
                  onChange={(e) => setMonthNum(e.target.value)}
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={m}>
                      {MONTH_NAMES[i]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 hover:bg-transparent"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={!group_id}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
              >
                Next
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <SettlementCarryForward
        open={showRecurringDialog}
        onClose={handleRecurringCancel}
        candidates={recurringCandidates}
        previousMonthLabel={formatMonthDisplay(
          getPreviousMonth(monthStr) || ''
        )}
        currentMonthLabel={formatMonthDisplay(monthStr)}
        getPropertyLabel={getPropertyLabel}
        onConfirm={handleRecurringConfirm}
      />
    </>
  );
}
