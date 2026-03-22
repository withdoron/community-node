import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Edits tenant fields on a PMProperty record.
 * Tenant info lives on the property itself (tenant_name, tenant_email, etc.)
 */
export default function TenantEditDialog({ open, onClose, tenant, onSave }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.tenant_email = 'Invalid email format';
    if (leaseStart && leaseEnd && leaseEnd < leaseStart) newErrors.lease_end = 'Lease end must be after lease start';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (open && tenant) {
      setErrors({});
      setName(tenant.tenant_name || '');
      setEmail(tenant.tenant_email || '');
      setPhone(tenant.tenant_phone || '');
      setLeaseStart(tenant.lease_start || '');
      setLeaseEnd(tenant.lease_end || '');
    }
  }, [open, tenant]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!tenant) return;
    onSave(tenant.property_id, {
      tenant_name: name.trim(),
      tenant_email: email.trim(),
      tenant_phone: phone.trim(),
      lease_start: leaseStart || null,
      lease_end: leaseEnd || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Edit Tenant</DialogTitle>
          {tenant?.propertyLabel && (
            <p className="text-sm text-slate-400 mt-1">{tenant.propertyLabel}</p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-slate-400">Tenant Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="Full name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {errors.tenant_email && <p className="text-red-400 text-xs mt-1">{errors.tenant_email}</p>}
            </div>
            <div>
              <Label className="text-slate-400">Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400">Lease Start</Label>
              <Input
                type="date"
                value={leaseStart}
                onChange={(e) => setLeaseStart(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <Label className="text-slate-400">Lease End</Label>
              <Input
                type="date"
                value={leaseEnd}
                onChange={(e) => setLeaseEnd(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {errors.lease_end && <p className="text-red-400 text-xs mt-1">{errors.lease_end}</p>}
            </div>
          </div>

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
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
