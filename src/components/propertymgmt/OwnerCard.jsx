import React, { useMemo } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ROLE_STYLES = {
  owner: 'bg-slate-700 text-slate-300',
  manager: 'bg-amber-500/20 text-amber-400',
  both: 'bg-amber-500/20 text-amber-400',
};

function getRoleLabel(role) {
  if (!role) return 'Owner';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function OwnerCard({
  owner,
  stakes,
  splitsGiving,
  splitsReceiving,
  ownershipTotalByGroup,
  allGroups,
  allOwners,
  onEdit,
  onDelete,
  onAddStake,
  onEditStake,
  onDeleteStake,
  onAddSplit,
  onEditSplit,
  onDeleteSplit,
}) {
  const groupsById = useMemo(() => {
    const m = {};
    (allGroups || []).forEach((g) => { m[g.id] = g; });
    return m;
  }, [allGroups]);

  const ownersById = useMemo(() => {
    const m = {};
    (allOwners || []).forEach((o) => { m[o.id] = o; });
    return m;
  }, [allOwners]);

  const roleStyle = ROLE_STYLES[owner.role] || ROLE_STYLES.owner;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-100">{owner.name}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${roleStyle}`}>
              {getRoleLabel(owner.role)}
            </span>
          </div>
          {(owner.email || owner.phone) && (
            <div className="mt-2 space-y-0.5 text-sm text-slate-400">
              {owner.email && <div>{owner.email}</div>}
              {owner.phone && <div>{formatPhone(owner.phone)}</div>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(owner)}
            className="h-8 w-8 text-slate-400 hover:text-amber-500 hover:bg-slate-800"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(owner)}
            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-slate-800"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Ownership Stakes */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
          Ownership Stakes
        </h4>
        {!stakes || stakes.length === 0 ? (
          <p className="text-slate-500 italic text-sm">No ownership stakes</p>
        ) : (
          <ul className="space-y-2">
            {stakes.map((s) => {
              const group = groupsById[s.group_id];
              const groupName = group ? group.name : '(Unknown group)';
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 py-2 border-b border-slate-800 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-100 truncate">{groupName}</span>
                    <span className="font-bold text-amber-500 shrink-0">{s.ownership_pct}%</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditStake(s)}
                      className="h-7 w-7 text-slate-400 hover:text-amber-500 hover:bg-slate-800"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteStake(s)}
                      className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {/* Ownership validation summary per group */}
        {stakes && stakes.length > 0 && ownershipTotalByGroup && (
          <div className="mt-3 space-y-1">
            {stakes.map((s) => {
              const group = groupsById[s.group_id];
              const groupName = group ? group.name : '(Unknown group)';
              const total = ownershipTotalByGroup[s.group_id];
              if (total == null) return null;
              let statusClass = 'text-amber-400';
              let suffix = '(incomplete)';
              if (total === 100) {
                statusClass = 'text-emerald-400';
                suffix = '';
              } else if (total > 100) {
                statusClass = 'text-red-400';
                suffix = '(over-allocated)';
              }
              return (
                <p key={s.group_id} className={`text-xs ${statusClass}`}>
                  {groupName}: {total}% of 100% allocated {suffix}
                </p>
              );
            })}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddStake}
          className="mt-3 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Stake
        </Button>
      </div>

      {/* Distribution Splits */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
          Distribution Splits
        </h4>
        {(!splitsGiving || splitsGiving.length === 0) && (!splitsReceiving || splitsReceiving.length === 0) ? (
          <p className="text-slate-500 italic text-sm">No distribution splits</p>
        ) : (
          <ul className="space-y-2">
            {splitsGiving && splitsGiving.map((sp) => {
              const toOwner = ownersById[sp.to_owner_id];
              const group = groupsById[sp.group_id];
              const toName = toOwner ? toOwner.name : '(Unknown)';
              const groupName = group ? group.name : '(Unknown group)';
              return (
                <li
                  key={sp.id}
                  className="flex items-center justify-between gap-2 py-2 border-b border-slate-800 last:border-0"
                >
                  <div className="min-w-0">
                    <span className="text-slate-100 text-sm">
                      Gives {sp.split_pct}% to {toName} from {groupName}
                    </span>
                    {sp.reason && (
                      <p className="text-slate-500 text-xs mt-0.5">{sp.reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditSplit(sp)}
                      className="h-7 w-7 text-slate-400 hover:text-amber-500 hover:bg-slate-800"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteSplit(sp)}
                      className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
            {splitsReceiving && splitsReceiving.map((sp) => {
              const fromOwner = ownersById[sp.from_owner_id];
              const group = groupsById[sp.group_id];
              const fromName = fromOwner ? fromOwner.name : '(Unknown)';
              const groupName = group ? group.name : '(Unknown group)';
              return (
                <li key={sp.id} className="py-2 border-b border-slate-800 last:border-0">
                  <span className="text-slate-400 text-sm">
                    Receives {sp.split_pct}% from {fromName} from {groupName}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddSplit}
          className="mt-3 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Split
        </Button>
      </div>
    </div>
  );
}
