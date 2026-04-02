import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  X, Printer, Bed, Bath, Maximize, PawPrint, Car,
  Zap, Droplets, Flame, Wifi, Tv, Trash2 as TrashIcon,
  MapPin, Phone, Mail, Calendar,
} from 'lucide-react';

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

const AMENITY_LABELS = {
  washer_dryer: 'Washer/Dryer',
  dishwasher: 'Dishwasher',
  ac: 'Air Conditioning',
  heating: 'Heating',
  pool: 'Pool',
  gym: 'Gym',
  storage: 'Storage',
  patio: 'Patio/Balcony',
  fireplace: 'Fireplace',
  ev_charging: 'EV Charging',
  fenced_yard: 'Fenced Yard',
  furnished: 'Furnished',
};

const PET_LABELS = { none: 'No Pets', cats: 'Cats Only', dogs: 'Dogs Only', all: 'Pets Welcome' };
const PARKING_LABELS = { none: 'No Parking', street: 'Street Parking', driveway: 'Driveway', garage: 'Garage' };

const UTILITY_ICONS = {
  electric: Zap,
  water: Droplets,
  gas: Flame,
  internet: Wifi,
  cable: Tv,
  trash: TrashIcon,
};

function formatPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function ListingPreview({ open, onClose, listing, propertyLabel }) {
  if (!listing) return null;

  const photos = safeParseJSON(listing.photos);
  const amenities = safeParseJSON(listing.amenities);
  const utilities = safeParseJSON(listing.utilities_included);
  const isLongTerm = listing.listing_type === 'long_term';
  const priceLabel = isLongTerm
    ? `${fmt(listing.monthly_rent)}/month`
    : `${fmt(listing.nightly_rate)}/night`;

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-white text-gray-900 print:max-w-none print:max-h-none print:overflow-visible">
        {/* Print CSS */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            [role="dialog"], [role="dialog"] * { visibility: visible; }
            [role="dialog"] { position: fixed; left: 0; top: 0; width: 100%; height: auto; max-width: none; max-height: none; overflow: visible; border: none; box-shadow: none; }
            .no-print { display: none !important; }
          }
        `}</style>

        {/* Top bar (no-print) */}
        <div className="no-print flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Listing Preview</h2>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <Printer className="w-4 h-4 mr-1.5" /> Print
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Photo gallery */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-1">
            {photos.slice(0, 4).map((photo, i) => {
              const src = resolveUrl(photo);
              return src ? (
                <div
                  key={i}
                  className={`relative overflow-hidden ${i === 0 ? 'col-span-2 h-64' : 'h-40'}`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  {i === 3 && photos.length > 4 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-foreground text-lg font-semibold">+{photos.length - 4} more</span>
                    </div>
                  )}
                </div>
              ) : null;
            })}
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{listing.title || 'Untitled'}</h1>
                {propertyLabel && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {propertyLabel}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-emerald-600">{priceLabel}</p>
                {listing.security_deposit > 0 && (
                  <p className="text-xs text-gray-400">
                    {fmt(listing.security_deposit)} deposit
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 pb-4 border-b border-gray-200">
            {listing.bedrooms > 0 && (
              <div className="flex items-center gap-1.5 text-gray-700">
                <Bed className="w-4 h-4" />
                <span className="text-sm font-medium">{listing.bedrooms} Bed</span>
              </div>
            )}
            {listing.bathrooms > 0 && (
              <div className="flex items-center gap-1.5 text-gray-700">
                <Bath className="w-4 h-4" />
                <span className="text-sm font-medium">{listing.bathrooms} Bath</span>
              </div>
            )}
            {listing.sqft > 0 && (
              <div className="flex items-center gap-1.5 text-gray-700">
                <Maximize className="w-4 h-4" />
                <span className="text-sm font-medium">{listing.sqft} sqft</span>
              </div>
            )}
            {listing.pet_policy && listing.pet_policy !== 'none' && (
              <div className="flex items-center gap-1.5 text-gray-700">
                <PawPrint className="w-4 h-4" />
                <span className="text-sm font-medium">{PET_LABELS[listing.pet_policy]}</span>
              </div>
            )}
            {listing.parking && listing.parking !== 'none' && (
              <div className="flex items-center gap-1.5 text-gray-700">
                <Car className="w-4 h-4" />
                <span className="text-sm font-medium">{PARKING_LABELS[listing.parking]}</span>
              </div>
            )}
            {listing.available_date && (
              <div className="flex items-center gap-1.5 text-gray-700">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Available {new Date(listing.available_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {listing.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Amenities</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {amenities.map((a) => (
                  <div key={a} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {AMENITY_LABELS[a] || a}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Utilities included */}
          {utilities.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Utilities Included</h3>
              <div className="flex flex-wrap gap-3">
                {utilities.map((u) => {
                  const Icon = UTILITY_ICONS[u] || Zap;
                  return (
                    <div key={u} className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Icon className="w-4 h-4 text-gray-400" />
                      {u.charAt(0).toUpperCase() + u.slice(1)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pet & Parking details */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Pet Policy</h3>
              <p className="text-sm text-gray-600">{PET_LABELS[listing.pet_policy] || 'Not specified'}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Parking</h3>
              <p className="text-sm text-gray-600">{PARKING_LABELS[listing.parking] || 'Not specified'}</p>
            </div>
          </div>

          {/* Contact */}
          {(listing.contact_name || listing.contact_phone || listing.contact_email) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Contact</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {listing.contact_name && (
                  <p className="text-sm font-medium text-gray-900">{listing.contact_name}</p>
                )}
                {listing.contact_phone && (
                  <p className="text-sm text-gray-600 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> {formatPhone(listing.contact_phone)}
                  </p>
                )}
                {listing.contact_email && (
                  <p className="text-sm text-gray-600 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> {listing.contact_email}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
