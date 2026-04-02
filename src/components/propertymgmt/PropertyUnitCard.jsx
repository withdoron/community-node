import React from 'react';
import { Pencil, Trash2, BedDouble, Bath, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STATUS_STYLES = {
  occupied: 'bg-emerald-500/20 text-emerald-400',
  vacant: 'bg-primary/20 text-primary-hover',
  maintenance: 'bg-red-500/20 text-red-400',
  listed: 'bg-blue-500/20 text-blue-400',
};

const AMENITY_LABELS = {
  pet_friendly: 'Pets OK',
  parking: 'Parking',
  laundry: 'Laundry',
  furnished: 'Furnished',
  pool: 'Pool',
  gym: 'Gym',
  ac: 'A/C',
  dishwasher: 'Dishwasher',
};

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

export default function PropertyUnitCard({ unit, onEdit, onDelete }) {
  const statusStyle = STATUS_STYLES[unit.status] || 'bg-surface/20 text-muted-foreground';
  const isShortTerm = unit.property_type === 'short_term';
  const amenities = Array.isArray(unit.amenities) ? unit.amenities : [];
  const photos = (() => {
    try { return Array.isArray(unit.photos) ? unit.photos : JSON.parse(unit.photos || '[]'); }
    catch { return []; }
  })();

  return (
    <div className="bg-secondary border border-border rounded-lg p-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">{unit.name}</span>
          {unit.unit_label && (
            <span className="bg-surface text-foreground-soft px-2 py-0.5 text-xs rounded-full">{unit.unit_label}</span>
          )}
          {unit.has_garage && (
            <span className="bg-surface text-muted-foreground px-2 py-0.5 text-xs rounded-full flex items-center gap-1"><Car className="w-3 h-3" /> Garage</span>
          )}
        </div>
        <p className="text-lg font-bold text-primary mt-1">
          {isShortTerm
            ? `${formatCurrency(unit.nightly_rate || 0)}/night`
            : `${formatCurrency(unit.monthly_rent)}/mo`
          }
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`px-2 py-0.5 text-xs rounded-full ${statusStyle}`}>
            {(unit.status || 'occupied').replace(/_/g, ' ')}
          </span>
          {(unit.bedrooms || unit.bathrooms) && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {unit.bedrooms && <span className="flex items-center gap-0.5"><BedDouble className="w-3 h-3" /> {unit.bedrooms}</span>}
              {unit.bathrooms && <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" /> {unit.bathrooms}</span>}
            </span>
          )}
        </div>
        {unit.tenant_name ? (
          <p className="text-sm text-foreground-soft mt-1">{unit.tenant_name}</p>
        ) : (
          <p className="text-sm text-muted-foreground/70 mt-1">No tenant</p>
        )}
        {isShortTerm && amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {amenities.map((a) => (
              <span key={a} className="bg-surface text-foreground-soft px-2 py-0.5 text-[10px] rounded-full">
                {AMENITY_LABELS[a] || a}
              </span>
            ))}
          </div>
        )}
        {isShortTerm && photos.length > 0 && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto">
            {photos.slice(0, 4).map((url, i) => (
              <img key={i} src={url} alt="" className="w-12 h-12 rounded-md object-cover border border-border" />
            ))}
            {photos.length > 4 && (
              <span className="w-12 h-12 rounded-md bg-surface flex items-center justify-center text-xs text-muted-foreground">+{photos.length - 4}</span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => onEdit(unit)} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-surface">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(unit)} className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-surface">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
