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
      <AlertDialogContent className="bg-card border border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            Finalize settlement?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Finalize the {monthLabel} settlement for {name}? This locks the
            settlement and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-secondary border-border text-foreground-soft hover:bg-surface hover:text-foreground">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleFinalize}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold"
          >
            Finalize
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
