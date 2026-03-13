import React from 'react';
import { Pencil, Trash2, Eye, ChevronRight } from 'lucide-react';

function safeParseJSON(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return [];
  try { return JSON.parse(val); } catch { return []; }
}

function resolveUrl(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val.url) return val.url;
  return null;
}

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const STATUS_STYLES = {
  active: 'bg-green-500/20 text-green-400',
  pending: 'bg-amber-500/20 text-amber-500',
  rented: 'bg-slate-700 text-slate-400',
};

const TYPE_STYLES = {
  long_term: 'bg-blue-500/20 text-blue-400',
  short_term: 'bg-amber-500/20 text-amber-500',
};

const AMENITY_LABELS = {
  washer_dryer: 'W/D',
  dishwasher: 'DW',
  ac: 'A/C',
  heating: 'Heat',
  pool: 'Pool',
  gym: 'Gym',
  storage: 'Storage',
  patio: 'Patio',
  fireplace: 'FP',
  ev_charging: 'EV',
  fenced_yard: 'Yard',
  furnished: 'Furn',
};

export default function ListingCard({
  listing,
  propertyLabel,
  onEdit,
  onDelete,
  onPreview,
  onStatusAction,
}) {
  const photos = safeParseJSON(listing.photos);
  const amenities = safeParseJSON(listing.amenities);
  const firstPhoto = photos.length > 0 ? resolveUrl(photos[0]) : null;
  const isLongTerm = listing.listing_type === 'long_term';
  const priceLabel = isLongTerm
    ? `${fmt(listing.monthly_rent)}/mo`
    : `${fmt(listing.nightly_rate)}/night`;

  // Next status action
  const nextAction =
    listing.status === 'active'
      ? { label: 'Mark Pending', next: 'pending' }
      : listing.status === 'pending'
        ? { label: 'Mark Rented', next: 'rented' }
        : listing.status === 'rented'
          ? { label: 'Reactivate', next: 'active' }
          : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
      <div className="flex flex-col sm:flex-row">
        {/* Photo thumbnail */}
        <div className="sm:w-40 h-32 sm:h-auto flex-shrink-0 bg-slate-800 relative">
          {firstPhoto ? (
            <img
              src={firstPhoto}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
              No photo
            </div>
          )}
          {photos.length > 1 && (
            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
              +{photos.length - 1}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-100 truncate">
                {listing.title || 'Untitled Listing'}
              </h3>
              <p className="text-xs text-slate-500 truncate">{propertyLabel}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_STYLES[listing.listing_type] || TYPE_STYLES.long_term}`}>
                {isLongTerm ? 'Long-Term' : 'Short-Term'}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[listing.status] || STATUS_STYLES.active}`}>
                {listing.status}
              </span>
            </div>
          </div>

          {/* Price + details */}
          <div className="flex items-center gap-3 mb-2">
            <span className="text-amber-500 font-bold text-sm">{priceLabel}</span>
            {listing.bedrooms && (
              <span className="text-xs text-slate-400">{listing.bedrooms} bed</span>
            )}
            {listing.bathrooms && (
              <span className="text-xs text-slate-400">{listing.bathrooms} bath</span>
            )}
            {listing.sqft && (
              <span className="text-xs text-slate-400">{listing.sqft} sqft</span>
            )}
          </div>

          {/* Amenities (max 5 shown) */}
          {amenities.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {amenities.slice(0, 5).map((a) => (
                <span
                  key={a}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
                >
                  {AMENITY_LABELS[a] || a}
                </span>
              ))}
              {amenities.length > 5 && (
                <span className="text-[10px] text-slate-500">+{amenities.length - 5}</span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={() => onPreview(listing)}
              className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 min-h-[32px]"
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <button
              type="button"
              onClick={() => onEdit(listing)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 min-h-[32px]"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            {nextAction && (
              <button
                type="button"
                onClick={() => onStatusAction(listing, nextAction.next)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 min-h-[32px] ml-auto"
              >
                {nextAction.label} <ChevronRight className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(listing)}
              className="text-xs text-slate-500 hover:text-red-400 ml-auto min-h-[32px] p-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
