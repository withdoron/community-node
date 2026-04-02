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
      <DialogContent className="bg-card border border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Tenant</DialogTitle>
          {tenant?.propertyLabel && (
            <p className="text-sm text-muted-foreground mt-1">{tenant.propertyLabel}</p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Tenant Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
              placeholder="Full name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
              />
              {errors.tenant_email && <p className="text-red-400 text-xs mt-1">{errors.tenant_email}</p>}
            </div>
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-muted-foreground">Lease Start</Label>
              <Input
                type="date"
                value={leaseStart}
                onChange={(e) => setLeaseStart(e.target.value)}
                className="mt-1 bg-secondary border-border text-foreground focus:border-primary focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Lease End</Label>
              <Input
                type="date"
                value={leaseEnd}
                onChange={(e) => setLeaseEnd(e.target.value)}
                className="mt-1 bg-secondary border-border text-foreground focus:border-primary focus:ring-1 focus:ring-ring"
              />
              {errors.lease_end && <p className="text-red-400 text-xs mt-1">{errors.lease_end}</p>}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold"
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
