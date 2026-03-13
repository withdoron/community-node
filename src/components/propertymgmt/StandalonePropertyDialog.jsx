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

const STATUS_OPTIONS = [
  { value: 'occupied', label: 'Occupied' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'listed', label: 'Listed' },
];

export default function StandalonePropertyDialog({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    address: '',
    monthly_rent: '',
    status: 'occupied',
    tenant_name: '',
    tenant_email: '',
    tenant_phone: '',
    lease_start: '',
    lease_end: '',
    has_garage: false,
    bedrooms: '',
    bathrooms: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: '',
        address: '',
        monthly_rent: '',
        status: 'occupied',
        tenant_name: '',
        tenant_email: '',
        tenant_phone: '',
        lease_start: '',
        lease_end: '',
        has_garage: false,
        bedrooms: '',
        bathrooms: '',
        notes: '',
      });
    }
  }, [open]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: form.name,
      address: form.address,
      monthly_rent: Number(form.monthly_rent) || 0,
      status: form.status,
      tenant_name: form.tenant_name || null,
      tenant_email: form.tenant_email || null,
      tenant_phone: form.tenant_phone || null,
      lease_start: form.lease_start || null,
      lease_end: form.lease_end || null,
      has_garage: form.has_garage,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      notes: form.notes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Add Standalone Property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Property name *</label>
            <input type="text" className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Address *</label>
            <input type="text" className={inputClass} value={form.address} onChange={(e) => set('address', e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Monthly rent *</label>
            <input type="number" min={0} step={1} className={inputClass} value={form.monthly_rent} onChange={(e) => set('monthly_rent', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bedrooms</label>
              <input type="number" min={0} className={inputClass} value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Bathrooms</label>
              <input type="number" min={0} step={0.5} className={inputClass} value={form.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Status *</label>
            <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)} required>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="has_garage_standalone" checked={form.has_garage} onChange={(e) => set('has_garage', e.target.checked)} className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500" />
            <label htmlFor="has_garage_standalone" className="text-slate-300 text-sm">Has garage</label>
          </div>
          <div className="border-t border-slate-800 pt-3">
            <p className="text-slate-400 text-sm font-medium mb-2">Tenant</p>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Tenant name</label>
                <input type="text" className={inputClass} value={form.tenant_name} onChange={(e) => set('tenant_name', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tenant email</label>
                  <input type="email" className={inputClass} value={form.tenant_email} onChange={(e) => set('tenant_email', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Tenant phone</label>
                  <input type="text" className={inputClass} value={form.tenant_phone} onChange={(e) => set('tenant_phone', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Lease start</label>
                  <input type="date" className={inputClass} value={form.lease_start} onChange={(e) => set('lease_start', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Lease end</label>
                  <input type="date" className={inputClass} value={form.lease_end} onChange={(e) => set('lease_end', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea className={inputClass + ' min-h-[80px]'} value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-200 hover:bg-transparent">Cancel</Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-bold">Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
