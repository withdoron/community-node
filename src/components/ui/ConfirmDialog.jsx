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
import { Loader2 } from 'lucide-react';

/**
 * Reusable styled confirmation dialog — Gold Standard dark theme.
 * Wraps shadcn AlertDialog with consistent styling.
 *
 * Props:
 *   open, onOpenChange — controlled state
 *   title, description — dialog content
 *   confirmLabel, cancelLabel — button text
 *   onConfirm — callback when confirmed
 *   destructive — if true, confirm button is red
 *   loading — shows spinner on confirm button
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  destructive = false,
  loading = false,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-900 border-slate-800 max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-100">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              destructive
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-black'
            }
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
