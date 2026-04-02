import React, { useState } from 'react';
import { Pencil, Trash2, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PropertyUnitCard from './PropertyUnitCard';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

const STRUCTURE_LABELS = {
  single: 'Single',
  duplex: 'Duplex',
  triplex: 'Triplex',
  fourplex: 'Fourplex',
  apartment_building: 'Apartment Building',
  other: 'Other',
};

export default function PropertyGroupCard({
  group,
  units,
  onEdit,
  onDelete,
  onAddUnit,
  onEditUnit,
  onDeleteUnit,
}) {
  const [expanded, setExpanded] = useState(false);
  const totalRent = units.reduce((sum, u) => sum + (u.monthly_rent || 0) + (u.nightly_rate || 0), 0);
  const structureLabel = STRUCTURE_LABELS[group.structure_type] || group.structure_type || '\u2014';

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div
        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-foreground">{group.name}</h3>
          {group.address && <p className="text-sm text-muted-foreground mt-0.5">{group.address}</p>}
          <span className="inline-block mt-2 bg-surface text-foreground-soft px-2 py-1 text-xs rounded-full">
            {structureLabel}
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-foreground-soft">
            <span>{units.length} unit{units.length !== 1 ? 's' : ''}</span>
            <span>{formatCurrency(totalRent)}/mo</span>
            <span>Mgmt {group.management_fee_pct ?? 10}%</span>
            <span>Maint {group.maintenance_reserve_pct ?? 10}%</span>
            <span>Emerg {group.emergency_reserve_pct ?? 5}%</span>
          </div>
          {group.has_insurance === false && (
            <p className="text-xs text-red-400 mt-1">No insurance</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(group); }} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-secondary">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(group); }} className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-secondary">
            <Trash2 className="w-4 h-4" />
          </Button>
          <button
            type="button"
            className="p-2 text-muted-foreground hover:text-foreground transition-transform"
            aria-expanded={expanded}
            onClick={(e) => { e.stopPropagation(); setExpanded((prev) => !prev); }}
          >
            <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="bg-secondary/50 rounded-b-lg p-4 border-t border-border">
          <div className="space-y-3">
            {units.length === 0 && (
              <p className="text-sm text-muted-foreground/70 italic">No units in this group yet</p>
            )}
            {units.map((unit) => (
              <PropertyUnitCard
                key={unit.id}
                unit={unit}
                onEdit={onEditUnit}
                onDelete={onDeleteUnit}
              />
            ))}
          </div>
          <Button
            variant="outline"
            onClick={onAddUnit}
            className="mt-4 w-full border-dashed border-border text-foreground-soft hover:bg-surface hover:text-foreground hover:border-muted-foreground"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Unit
          </Button>
        </div>
      )}
    </div>
  );
}
