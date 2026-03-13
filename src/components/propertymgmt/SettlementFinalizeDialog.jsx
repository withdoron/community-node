import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatMonthDisplay } from './utils/calculateSettlement';

/**
 * Confirmation dialog for finalizing a settlement.
 */
export default function SettlementFinalizeDialog({
  open,
  onClose,
  settlement,
  groupName,
  onFinalize,
}) {
  const monthLabel = settlement
    ? formatMonthDisplay(settlement.month)
    : '';
  const name = groupName || 'this group';

  const handleFinalize = () => {
    onFinalize();
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="bg-slate-900 border border-slate-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-100">
            Finalize settlement?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Finalize the {monthLabel} settlement for {name}? This locks the
            settlement and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleFinalize}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
          >
            Finalize
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
