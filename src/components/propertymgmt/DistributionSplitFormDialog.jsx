import React, { useState, useEffect, useMemo } from 'react';
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

export default function DistributionSplitFormDialog({
  open,
  onClose,
  split,
  fromOwnerId,
  owners,
  groups,
  fromOwnerStakes,
  onSave,
}) {
  const [form, setForm] = useState({
    to_owner_id: '',
    group_id: '',
    split_pct: '',
    reason: '',
  });
  const [error, setError] = useState('');

  const groupsWhereFromOwnerHasStake = useMemo(() => {
    if (!groups || !fromOwnerStakes) return [];
    const groupIds = new Set(fromOwnerStakes.map((s) => s.group_id));
    return groups.filter((g) => groupIds.has(g.id));
  }, [groups, fromOwnerStakes]);

  const otherOwners = useMemo(() => {
    if (!owners || !fromOwnerId) return [];
    return owners.filter((o) => o.id !== fromOwnerId);
  }, [owners, fromOwnerId]);

  useEffect(() => {
    if (open) {
      setError('');
      if (split) {
        setForm({
          to_owner_id: split.to_owner_id,
          group_id: split.group_id,
          split_pct: split.split_pct ?? '',
          reason: split.reason ?? '',
        });
      } else {
        setForm({
          to_owner_id: otherOwners[0]?.id || '',
          group_id: groupsWhereFromOwnerHasStake[0]?.id || '',
          split_pct: '',
          reason: '',
        });
      }
    }
  }, [split, open, groupsWhereFromOwnerHasStake.length, otherOwners.length]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const pct = Number(form.split_pct);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      setError('Split percentage must be between 1 and 100.');
      return;
    }
    onSave({
      from_owner_id: fromOwnerId,
      to_owner_id: form.to_owner_id,
      group_id: form.group_id,
      split_pct: pct,
      reason: form.reason.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">{split ? 'Edit Distribution Split' : 'Add Distribution Split'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Gives to *</label>
            <select className={inputClass} value={form.to_owner_id} onChange={(e) => set('to_owner_id', e.target.value)} required disabled={!!split}>
              {!form.to_owner_id && <option value="">Select owner</option>}
              {otherOwners.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Property group *</label>
            <select className={inputClass} value={form.group_id} onChange={(e) => set('group_id', e.target.value)} required>
              {!form.group_id && <option value="">Select group</option>}
              {groupsWhereFromOwnerHasStake.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Split % *</label>
            <input type="number" min={1} max={100} step={0.5} className={inputClass} value={form.split_pct} onChange={(e) => set('split_pct', e.target.value)} placeholder="e.g. 50" required />
          </div>
          <div>
            <label className={labelClass}>Reason (optional)</label>
            <input type="text" className={inputClass} value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="e.g. Family arrangement" />
          </div>
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground hover:bg-transparent">Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold">{split ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
