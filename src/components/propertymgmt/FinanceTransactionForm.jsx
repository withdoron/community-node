import React, { useState, useEffect, useRef } from 'react';
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

// TODO: Replace base64 with file upload API when available
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const inputClass =
  'w-full rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2 text-sm';
const labelClass = 'text-slate-300 text-sm font-medium block mb-1';

const INCOME_CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'security_deposit', label: 'Security Deposit' },
  { value: 'late_fee', label: 'Late Fee' },
  { value: 'other', label: 'Other' },
];

const EXPENSE_CATEGORIES = [
  { value: 'property_tax', label: 'Property Tax' },
  { value: 'water_sewer', label: 'Water / Sewer' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'electric', label: 'Electric' },
  { value: 'gas', label: 'Gas' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'mileage', label: 'Mileage' },
  { value: 'management_fee', label: 'Management Fee' },
  { value: 'other', label: 'Other' },
];

const REIMBURSEMENT_OPTIONS = [
  { value: 'not_applicable', label: 'Not Applicable' },
  { value: 'pending', label: 'Pending' },
  { value: 'included_in_settlement', label: 'Included in Settlement' },
  { value: 'paid', label: 'Paid' },
];

export default function FinanceTransactionForm({
  open,
  onClose,
  expense,
  groups,
  properties,
  onSave,
}) {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    type: 'expense',
    category: 'rent',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    group_id: '',
    property_id: '',
    vendor: '',
    receipt_url: '',
    is_recurring: false,
    paid_by: 'property',
    reimbursement_status: 'not_applicable',
    reimbursement_note: '',
    reconciled: false,
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.amount || Number(form.amount) <= 0) newErrors.amount = 'Amount must be a positive number';
    if (!form.date) newErrors.date = 'Date is required';
    if (!form.category) newErrors.category = 'Category is required';
    if (!form.group_id) newErrors.group_id = 'Please select a property group';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (open) {
      setErrors({});
      if (expense) {
        setForm({
          type: expense.type || 'expense',
          category: expense.category || 'rent',
          amount: expense.amount ?? '',
          date: expense.date || new Date().toISOString().slice(0, 10),
          description: expense.description || '',
          group_id: expense.group_id || '',
          property_id: expense.property_id || '',
          vendor: expense.vendor || '',
          receipt_url: expense.receipt_url || '',
          is_recurring: expense.is_recurring || false,
          paid_by: expense.paid_by || 'property',
          reimbursement_status: expense.reimbursement_status || 'not_applicable',
          reimbursement_note: expense.reimbursement_note || '',
          reconciled: expense.reconciled || false,
        });
        setReceiptFile(null);
        setReceiptPreview(null);
      } else {
        setForm({
          type: 'expense',
          category: 'property_tax',
          amount: '',
          date: new Date().toISOString().slice(0, 10),
          description: '',
          group_id: groups.length === 1 ? groups[0].id : '',
          property_id: '',
          vendor: '',
          receipt_url: '',
          is_recurring: false,
          paid_by: 'property',
          reimbursement_status: 'not_applicable',
          reimbursement_note: '',
          reconciled: false,
        });
        setReceiptFile(null);
        setReceiptPreview(null);
      }
    }
  }, [expense, open, groups]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const filteredProperties = form.group_id
    ? properties.filter((p) => p.group_id === form.group_id)
    : [];

  // When type changes, reset category to first valid option
  useEffect(() => {
    const validCats = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!validCats.find((c) => c.value === form.category)) {
      set('category', validCats[0].value);
    }
  }, [form.type]);

  // When group changes, clear property if not in group
  useEffect(() => {
    if (form.group_id && form.property_id) {
      const inGroup = properties.some(
        (p) => p.id === form.property_id && p.group_id === form.group_id
      );
      if (!inGroup) set('property_id', '');
    }
  }, [form.group_id]);

  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Receipt must be under 5MB.');
      e.target.value = '';
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Use JPEG, PNG, WebP, or PDF format.');
      e.target.value = '';
      return;
    }
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const clearReceipt = () => {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(null);
    setReceiptPreview(null);
    set('receipt_url', '');
  };

  const uploadFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    let receipt_url = form.receipt_url;
    if (receiptFile) {
      try {
        receipt_url = await uploadFile(receiptFile);
      } catch (err) {
        console.error('Receipt upload error:', err);
      }
    }

    const payload = {
      type: form.type,
      category: form.category,
      amount: Number(form.amount) || 0,
      date: form.date,
      description: form.description || null,
      group_id: form.group_id,
      property_id: form.property_id || null,
      vendor: form.type === 'expense' ? (form.vendor || null) : null,
      receipt_url: receipt_url || null,
      is_recurring: form.is_recurring,
      paid_by: form.type === 'expense' ? form.paid_by : 'property',
      reimbursement_status:
        form.type === 'expense' && form.paid_by === 'manager'
          ? form.reimbursement_status
          : 'not_applicable',
      reimbursement_note:
        form.reimbursement_status !== 'not_applicable'
          ? (form.reimbursement_note || null)
          : null,
      reconciled: form.reconciled,
    };
    onSave(payload);

    // Cleanup
    if (receiptPreview) URL.revokeObjectURL(receiptPreview);
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {expense ? 'Edit Transaction' : 'Add Transaction'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div>
            <label className={labelClass}>Type *</label>
            <div className="flex gap-2">
              {['income', 'expense'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`flex-1 px-4 py-2 text-sm rounded-md border transition-colors min-h-[44px] capitalize ${
                    form.type === t
                      ? t === 'income'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className={labelClass}>Category *</label>
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              required
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Amount *</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className={inputClass}
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                required
              />
              {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
            </div>
            <div>
              <label className={labelClass}>Date *</label>
              <input
                type="date"
                className={inputClass}
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                required
              />
              {errors.date && <p className="text-red-400 text-xs mt-1">{errors.date}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <input
              type="text"
              className={inputClass}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="e.g. March rent payment"
            />
          </div>

          {/* Group + Property */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Property Group *</label>
              <select
                className={inputClass}
                value={form.group_id}
                onChange={(e) => set('group_id', e.target.value)}
                required
              >
                <option value="">Select group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {errors.group_id && <p className="text-red-400 text-xs mt-1">{errors.group_id}</p>}
            </div>
            <div>
              <label className={labelClass}>Property (optional)</label>
              <select
                className={inputClass}
                value={form.property_id}
                onChange={(e) => set('property_id', e.target.value)}
              >
                <option value="">Group-level</option>
                {filteredProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Vendor (expenses only) */}
          {form.type === 'expense' && (
            <div>
              <label className={labelClass}>Vendor</label>
              <input
                type="text"
                className={inputClass}
                value={form.vendor}
                onChange={(e) => set('vendor', e.target.value)}
                placeholder="e.g. City of Eugene"
              />
            </div>
          )}

          {/* Receipt upload */}
          <div>
            <label className={labelClass}>Receipt</label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {receiptPreview || form.receipt_url ? 'Change' : 'Upload'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleReceiptChange}
                className="hidden"
              />
              {(receiptPreview || form.receipt_url) && (
                <div className="flex items-center gap-2">
                  <img
                    src={receiptPreview || (typeof form.receipt_url === 'object' ? form.receipt_url?.url : form.receipt_url)}
                    alt="Receipt"
                    className="h-10 w-10 rounded border border-slate-700 object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearReceipt}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Is recurring */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_recurring_exp"
              checked={form.is_recurring}
              onChange={(e) => set('is_recurring', e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="is_recurring_exp" className="text-slate-300 text-sm">
              Recurring expense (carries forward monthly)
            </label>
          </div>

          {/* Paid by (expenses only) */}
          {form.type === 'expense' && (
            <div>
              <label className={labelClass}>Paid by</label>
              <div className="flex gap-2">
                {['property', 'manager'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set('paid_by', v)}
                    className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors min-h-[44px] capitalize ${
                      form.paid_by === v
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reimbursement (when paid_by = manager) */}
          {form.type === 'expense' && form.paid_by === 'manager' && (
            <>
              <div>
                <label className={labelClass}>Reimbursement status</label>
                <select
                  className={inputClass}
                  value={form.reimbursement_status}
                  onChange={(e) => set('reimbursement_status', e.target.value)}
                >
                  {REIMBURSEMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {form.reimbursement_status !== 'not_applicable' && (
                <div>
                  <label className={labelClass}>Reimbursement note</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={form.reimbursement_note}
                    onChange={(e) => set('reimbursement_note', e.target.value)}
                    placeholder="Notes about reimbursement"
                  />
                </div>
              )}
            </>
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
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
            >
              {expense ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
