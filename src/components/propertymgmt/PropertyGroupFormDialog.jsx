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
  'w-full rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring px-3 py-2 text-sm';
const labelClass = 'text-foreground-soft text-sm font-medium block mb-1';

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

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.name || form.name.trim().length < 2) newErrors.name = 'Name is required (min 2 characters)';
    if (!form.address || !form.address.trim()) newErrors.address = 'Address is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (open) {
      setErrors({});
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
    if (!validate()) return;
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
      <DialogContent className="bg-card border border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
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
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
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
            {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address}</p>}
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
              className="rounded border-border bg-secondary text-primary focus:ring-ring"
            />
            <label htmlFor="has_insurance" className="text-foreground-soft text-sm">Has active insurance</label>
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
            <Button type="button" variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-secondary hover:bg-transparent">Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold">{group ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
