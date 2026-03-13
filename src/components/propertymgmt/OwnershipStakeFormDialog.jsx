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
  'w-full rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2 text-sm';
const labelClass = 'text-slate-300 text-sm font-medium block mb-1';

export default function OwnershipStakeFormDialog({
  open,
  onClose,
  stake,
  ownerId,
  groups,
  existingStakes,
  onSave,
}) {
  const [form, setForm] = useState({ group_id: '', ownership_pct: '' });
  const [error, setError] = useState('');

  const ownerStakeGroupIds = useMemo(() => {
    if (!ownerId || !existingStakes) return new Set();
    return new Set(
      existingStakes.filter((s) => s.owner_id === ownerId).map((s) => s.group_id)
    );
  }, [ownerId, existingStakes]);

  const availableGroups = useMemo(() => {
    if (!groups) return [];
    if (stake) return groups;
    return groups.filter((g) => !ownerStakeGroupIds.has(g.id));
  }, [groups, ownerStakeGroupIds, stake]);

  useEffect(() => {
    if (open) {
      setError('');
      if (stake) {
        setForm({
          group_id: stake.group_id,
          ownership_pct: stake.ownership_pct ?? '',
        });
      } else {
        setForm({
          group_id: availableGroups.length ? availableGroups[0].id : '',
          ownership_pct: '',
        });
      }
    }
  }, [stake, open, availableGroups.length]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const getTotalForGroup = (groupId) => {
    if (!existingStakes) return 0;
    return existingStakes
      .filter((s) => s.group_id === groupId && (!stake || s.id !== stake.id))
      .reduce((sum, s) => sum + (Number(s.ownership_pct) || 0), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const pct = Number(form.ownership_pct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setError('Ownership must be between 0 and 100.');
      return;
    }
    const groupId = form.group_id;
    const currentTotal = getTotalForGroup(groupId);
    const newTotal = currentTotal + pct;
    if (newTotal > 100) {
      const group = (groups || []).find((g) => g.id === groupId);
      const groupName = group ? group.name : 'this group';
      setError(`Total ownership for ${groupName} would be ${newTotal}%. Must not exceed 100%.`);
      return;
    }
    onSave({
      owner_id: ownerId,
      group_id: groupId,
      ownership_pct: pct,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100">{stake ? 'Edit Ownership Stake' : 'Add Ownership Stake'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Property group *</label>
            <select
              className={inputClass}
              value={form.group_id}
              onChange={(e) => set('group_id', e.target.value)}
              required
              disabled={!!stake}
            >
              {!form.group_id && <option value="">Select group</option>}
              {availableGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Ownership % *</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className={inputClass}
              value={form.ownership_pct}
              onChange={(e) => set('ownership_pct', e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-200 hover:bg-transparent">Cancel</Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-bold">{stake ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
