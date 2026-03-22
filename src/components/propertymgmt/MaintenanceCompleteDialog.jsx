import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';

const inputClass =
  'w-full rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2 text-sm';
const labelClass = 'text-slate-300 text-sm font-medium block mb-1';

/**
 * Close-out dialog: captures actual cost, completion photos,
 * and optionally creates a PMExpense and/or PMLaborEntry.
 */
export default function MaintenanceCompleteDialog({
  open,
  onClose,
  request,
  onSave,
}) {
  const fileInputRef = useRef(null);
  const [actualCost, setActualCost] = useState('');
  const [notes, setNotes] = useState('');
  const [completedDate, setCompletedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [completionPhotos, setCompletionPhotos] = useState([]);
  const [logExpense, setLogExpense] = useState(true);
  const [logLabor, setLogLabor] = useState(false);
  const [laborWorker, setLaborWorker] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [laborRate, setLaborRate] = useState('');
  const [uploading, setUploading] = useState(false);

  // TODO: Replace base64 with file upload API when available
  const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const uploadFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handlePhotoAdd = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const file of files) {
      if (file.size > MAX_PHOTO_SIZE) {
        toast.error(`"${file.name}" is too large. Photos must be under 5MB.`);
        e.target.value = '';
        return;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" is not a supported format. Use JPEG, PNG, or WebP.`);
        e.target.value = '';
        return;
      }
    }
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(uploadFile));
      setCompletionPhotos((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (index) => {
    setCompletionPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cost = actualCost !== '' ? Number(actualCost) : null;
    const laborTotal =
      logLabor
        ? Math.round((Number(laborHours) || 0) * (Number(laborRate) || 0) * 100) / 100
        : 0;

    onSave({
      // Main request update
      status: 'complete',
      actual_cost: cost,
      completed_date: completedDate,
      notes: notes.trim() || null,
      completion_photos:
        completionPhotos.length > 0
          ? JSON.stringify(completionPhotos)
          : null,
      // Expense creation data
      logExpense: logExpense && cost != null && cost > 0,
      expenseData: logExpense && cost != null && cost > 0
        ? {
            type: 'expense',
            category: 'repairs',
            amount: cost,
            date: completedDate,
            description: request?.title || 'Maintenance repair',
            property_id: request?.property_id || null,
            group_id: null, // Orchestrator resolves from property
            is_recurring: false,
            paid_by: 'property',
            reimbursement_status: 'not_applicable',
            reconciled: false,
          }
        : null,
      // Labor creation data
      logLabor: logLabor && laborWorker.trim() && Number(laborHours) > 0,
      laborData: logLabor && laborWorker.trim() && Number(laborHours) > 0
        ? {
            worker_name: laborWorker.trim(),
            worker_type: 'handyman',
            hourly_rate: Number(laborRate) || 0,
            hours: Number(laborHours) || 0,
            total: laborTotal,
            date: completedDate,
            property_id: request?.property_id || null,
            maintenance_id: request?.id || null,
            description: request?.title || 'Maintenance labor',
          }
        : null,
    });
  };

  const handleClose = () => {
    setActualCost('');
    setNotes('');
    setCompletedDate(new Date().toISOString().slice(0, 10));
    setCompletionPhotos([]);
    setLogExpense(true);
    setLogLabor(false);
    setLaborWorker('');
    setLaborHours('');
    setLaborRate('');
    onClose();
  };

  const resolveUrl = (url) =>
    typeof url === 'object' && url?.url ? url.url : (url || '');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Complete Request</DialogTitle>
          {request && (
            <p className="text-sm text-slate-400 mt-1">{request.title}</p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Actual cost */}
          <div>
            <label className={labelClass}>Actual Cost *</label>
            <input
              type="number"
              step={0.01}
              min={0}
              className={inputClass}
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {/* Completed date */}
          <div>
            <label className={labelClass}>Completed Date</label>
            <input
              type="date"
              className={inputClass}
              value={completedDate}
              onChange={(e) => setCompletedDate(e.target.value)}
            />
          </div>

          {/* Completion photos */}
          <div>
            <label className={labelClass}>Completion Photos</label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Add Photos
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoAdd}
                className="hidden"
              />
            </div>
            {completionPhotos.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {completionPhotos.map((url, i) => (
                  <div key={i} className="relative">
                    <img
                      src={resolveUrl(url)}
                      alt={`After ${i + 1}`}
                      className="h-12 w-12 rounded border border-slate-700 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Resolution Notes</label>
            <textarea
              className={inputClass + ' min-h-[80px]'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was done to resolve this?"
              rows={3}
            />
          </div>

          {/* Separator */}
          <div className="border-t border-slate-700 pt-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-3">
              Auto-create records
            </p>

            {/* Log as expense */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="log_expense_maint"
                checked={logExpense}
                onChange={(e) => setLogExpense(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="log_expense_maint" className="text-slate-300 text-sm">
                Log as expense (repairs, {actualCost ? `$${actualCost}` : '$0'})
              </label>
            </div>

            {/* Log labor */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="log_labor_maint"
                checked={logLabor}
                onChange={(e) => setLogLabor(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="log_labor_maint" className="text-slate-300 text-sm">
                Log labor entry
              </label>
            </div>

            {logLabor && (
              <div className="grid grid-cols-3 gap-3 ml-6">
                <div>
                  <label className={labelClass}>Worker *</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={laborWorker}
                    onChange={(e) => setLaborWorker(e.target.value)}
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className={labelClass}>Hours *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    className={inputClass}
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Rate ($/hr)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={inputClass}
                    value={laborRate}
                    onChange={(e) => setLaborRate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-200 hover:bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
            >
              Complete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
