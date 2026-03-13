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

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'both', label: 'Both' },
];

export default function OwnerFormDialog({ open, onClose, owner, onSave }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'owner',
  });

  useEffect(() => {
    if (open) {
      if (owner) {
        setForm({
          name: owner.name ?? '',
          email: owner.email ?? '',
          phone: owner.phone ?? '',
          role: owner.role ?? 'owner',
        });
      } else {
        setForm({ name: '', email: '', phone: '', role: 'owner' });
      }
    }
  }, [owner, open]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      role: form.role,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100">{owner ? 'Edit Owner' : 'Add Owner'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Name *</label>
            <input type="text" className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="text" className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Role *</label>
            <select className={inputClass} value={form.role} onChange={(e) => set('role', e.target.value)} required>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-200 hover:bg-transparent">Cancel</Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-bold">{owner ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
