import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const inputClass =
  'w-full rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2 text-sm';
const labelClass = 'text-slate-300 text-sm font-medium block mb-1';

const STRUCTURE_OPTIONS = [
  { value: 'single', label: 'Single Family' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'triplex', label: 'Triplex' },
  { value: 'fourplex', label: 'Fourplex' },
  { value: 'apartment_building', label: 'Apartment Building' },
  { value: 'other', label: 'Other' },
];

export default function PropertyGroupFormDialog({ open, onClose, group, onSave }) {
  const [form, setForm] = useState({
    name: '',
    address: '',
    structure_type: 'single',
    description: '',
    management_fee_pct: 10,
    maintenance_reserve_pct: 10,
    emergency_reserve_pct: 5,
    emergency_reserve_target: '',
    has_insurance: true,
    insurance_notes: '',
  });

  useEffect(() => {
    if (open) {
      if (group) {
        setForm({
          name: group.name ?? '',
          address: group.address ?? '',
          structure_type: group.structure_type ?? 'single',
          description: group.description ?? '',
          management_fee_pct: group.management_fee_pct ?? 10,
          maintenance_reserve_pct: group.maintenance_reserve_pct ?? 10,
          emergency_reserve_pct: group.emergency_reserve_pct ?? 5,
          emergency_reserve_target: group.emergency_reserve_target ?? '',
          has_insurance: group.has_insurance ?? true,
          insurance_notes: group.insurance_notes ?? '',
        });
      } else {
        setForm({
          name: '',
          address: '',
          structure_type: 'single',
          description: '',
          management_fee_pct: 10,
          maintenance_reserve_pct: 10,
          emergency_reserve_pct: 5,
          emergency_reserve_target: '',
          has_insurance: true,
          insurance_notes: '',
        });
      }
    }
  }, [group, open]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      management_fee_pct: Number(form.management_fee_pct) || 10,
      maintenance_reserve_pct: Number(form.maintenance_reserve_pct) || 10,
      emergency_reserve_pct: Number(form.emergency_reserve_pct) || 5,
      emergency_reserve_target: form.emergency_reserve_target
        ? Number(form.emergency_reserve_target)
        : null,
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {group ? 'Edit Property Group' : 'Add Property Group'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Name *</label>
            <input
              type="text"
              className={inputClass}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Address *</label>
            <input
              type="text"
              className={inputClass}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Structure type *</label>
            <select
              className={inputClass}
              value={form.structure_type}
              onChange={(e) => set('structure_type', e.target.value)}
              required
            >
              {STRUCTURE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass + ' min-h-[80px]'}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Mgmt fee %</label>
              <input
                type="number"
                min={0}
                step={0.5}
                className={inputClass}
                value={form.management_fee_pct}
                onChange={(e) => set('management_fee_pct', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Maint reserve %</label>
              <input
                type="number"
                min={0}
                step={0.5}
                className={inputClass}
                value={form.maintenance_reserve_pct}
                onChange={(e) => set('maintenance_reserve_pct', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Emerg reserve %</label>
              <input
                type="number"
                min={0}
                step={0.5}
                className={inputClass}
                value={form.emergency_reserve_pct}
                onChange={(e) => set('emergency_reserve_pct', e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Emergency reserve target ($)</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={form.emergency_reserve_target}
              onChange={(e) => set('emergency_reserve_target', e.target.value)}
              placeholder="e.g. 1500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="has_insurance"
              checked={form.has_insurance}
              onChange={(e) => set('has_insurance', e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="has_insurance" className="text-slate-300 text-sm">Has active insurance</label>
          </div>
          {!form.has_insurance && (
            <div>
              <label className={labelClass}>Why no insurance?</label>
              <textarea
                className={inputClass + ' min-h-[80px]'}
                value={form.insurance_notes}
                onChange={(e) => set('insurance_notes', e.target.value)}
                rows={2}
                placeholder="Optional notes"
              />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-200 hover:bg-slate-800 hover:bg-transparent">Cancel</Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-bold">{group ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
