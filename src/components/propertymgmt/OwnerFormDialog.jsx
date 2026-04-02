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

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.name || !form.name.trim()) newErrors.name = 'Owner name is required';
    if (form.email && form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) newErrors.email = 'Invalid email format';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (open) {
      setErrors({});
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
    if (!validate()) return;
    onSave({
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      role: form.role,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">{owner ? 'Edit Owner' : 'Add Owner'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Name *</label>
            <input type="text" className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} required />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
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
            <Button type="button" variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-transparent">Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold">{owner ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
