import React, { useState } from 'react';
import { Repeat, ChevronDown, Coins } from "lucide-react";
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

function getPriceBadge(event) {
  const pt = event.pricing_type;
  if (!pt) return null;
  if (pt === 'free') return { text: 'FREE' };
  if (pt === 'multiple_tickets' || pt === 'multiple') {
    const tickets = event.ticket_types || event.tickets || [];
    const prices = tickets.map((t) => Number(t.price));
    const lowest = prices.length ? Math.min(...prices) : 0;
    if (lowest === 0) return { text: 'From Free' };
    return { text: `From $${lowest.toFixed(2)}` };
  }
  if (pt === 'single_price' || pt === 'single') {
    const p = Number(event.price);
    if (p === 0) return { text: 'FREE' };
    return { text: `$${p.toFixed(2)}` };
  }
  if (pt === 'pay_what_you_wish' || pt === 'pwyw') return { text: 'PWYW' };
  return null;
}

/**
 * Network → accent color mapping for events.
 * Falls back to visible slate when no network is present.
 */
const NETWORK_ACCENT_COLORS = {
  recess: 'border-l-teal-700',
  harvest_network: 'border-l-amber-700',
  creative_alliance: 'border-l-violet-700',
  gathering_circle: 'border-l-rose-700',
};
const DEFAULT_ACCENT = 'border-l-slate-500';

function resolveEventAccent(event) {
  // 1. Single network field
  const network = event.network;
  if (network && NETWORK_ACCENT_COLORS[network]) return NETWORK_ACCENT_COLORS[network];

  // 2. Networks array (some events store as array)
  const networks = event.networks;
  if (Array.isArray(networks) && networks.length > 0) {
    for (const n of networks) {
      if (NETWORK_ACCENT_COLORS[n]) return NETWORK_ACCENT_COLORS[n];
    }
  }

  return DEFAULT_ACCENT;
}

/**
 * DEC-060: Living Directory — Typographic event card with ambient life signals.
 * No hero images or thumbnails on cards. Rich media remains on EventDetailModal.
 * Network accent bar signals community identity. Hover warmth signals aliveness.
 */
export default function EventCard({ event, onClick }) {
  const [showDates, setShowDates] = useState(false);
  const eventDate = new Date(event.date);
  const priceBadge = getPriceBadge(event);
  const isCancelled = event.status === 'cancelled';
  const acceptsJoyCoins = event.joy_coin_enabled;
  const joyCoinCost = event.joy_coin_cost ?? (acceptsJoyCoins ? Math.max(1, Math.round((event.price || 0) / 10)) : 0);
  const isJoyCoinEvent = acceptsJoyCoins && joyCoinCost > 0;
  const accentColor = resolveEventAccent(event);

  // Format end time if available
  const endDate = event.end_date ? new Date(event.end_date) : null;
  const timeStr = endDate
    ? `${format(eventDate, 'h:mm a')} – ${format(endDate, 'h:mm a')}`
    : format(eventDate, 'h:mm a');

  return (
    <div
      className={cn(
        "rounded-lg p-5 cursor-pointer",
        "bg-gradient-to-br from-slate-800 to-slate-800/90",
        "border border-slate-700",
        isCancelled
          ? "opacity-60 hover:border-slate-600"
          : "hover:border-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.08)] hover:-translate-y-0.5",
        "transition-all duration-300 ease-out",
        "border-l-4",
        accentColor
      )}
      onClick={() => onClick?.()}
      data-vitality="neutral"
    >
      {/* Event Title */}
      <h3 className={cn(
        "text-lg font-semibold text-slate-50 line-clamp-1",
        isCancelled && "line-through text-slate-400"
      )}>
        {event.title}
      </h3>

      {/* Date + Time — amber because time is actionable */}
      <p className="text-sm text-amber-400 mt-1">
        {format(eventDate, 'EEE, MMM d')} · {timeStr}
      </p>

      {/* Cancelled label */}
      {isCancelled && (
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Cancelled</p>
      )}

      {/* Business name — shown if available (enriched by parent page) */}
      {(event.business_name || event._businessName) && (
        <p className="text-sm text-slate-400 mt-2">
          {event.business_name || event._businessName}
        </p>
      )}

      {/* Location */}
      {event.location && (
        <p className="text-sm text-slate-500 mt-1 line-clamp-1">
          {event.location}
        </p>
      )}

      {/* Recurring indicator */}
      {event._groupSize > 1 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDates(!showDates);
            }}
            className="flex items-center gap-1.5 text-slate-400 text-xs cursor-pointer hover:text-slate-300 transition-colors"
          >
            <Repeat className="h-3.5 w-3.5" />
            <span>Recurring · {event._groupSize - 1} more date{event._groupSize - 1 !== 1 ? 's' : ''}</span>
            <ChevronDown className={cn("h-3 w-3 transition-transform flex-shrink-0", showDates && "rotate-180")} />
          </button>
          {showDates && event._groupedEvents?.length > 0 && (
            <div className="mt-2 space-y-1 pl-6">
              {event._groupedEvents.map((ge) => (
                <div
                  key={ge.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(ge);
                  }}
                  className="text-slate-400 text-xs hover:text-amber-500 cursor-pointer transition-colors py-1"
                >
                  {new Date(ge.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {ge.start_time ? ` · ${ge.start_time}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chips row: network + pricing + joy coins */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {/* Network badge */}
        {event.network && (
          <span className="bg-amber-500/10 text-amber-500 text-xs px-2 py-0.5 rounded-full capitalize">
            {event.network.replace(/_/g, ' ')}
          </span>
        )}

        {/* Network-only indicator */}
        {event.network_only && event.network && (
          <span className="bg-slate-700 text-slate-400 text-xs px-2 py-0.5 rounded-full">
            Members Only
          </span>
        )}

        {/* Price badge */}
        {!isCancelled && !isJoyCoinEvent && priceBadge && (
          <span className="bg-amber-500/20 text-amber-500 text-xs px-2 py-0.5 rounded-full font-medium">
            {priceBadge.text}
          </span>
        )}

        {/* Joy Coins badge */}
        {!isCancelled && isJoyCoinEvent && (
          <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <Coins className="h-3 w-3" />
            {joyCoinCost === 1 ? '1 Joy Coin' : `${joyCoinCost} Joy Coins`}
          </span>
        )}
      </div>

      {/* RSVP count — shown if enriched by parent */}
      {event._rsvpCount > 0 && (
        <p className="text-xs text-slate-500 mt-2">
          {event._rsvpCount} going
        </p>
      )}
    </div>
  );
}
