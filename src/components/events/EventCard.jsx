import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Tag, Coins } from "lucide-react";
import { format } from 'date-fns';

export default function EventCard({ event, onClick }) {
  const eventDate = new Date(event.date);
  const isFree = !event.price || event.price === 0;
  const isCancelled = event.status === 'cancelled';
  // Field mapping: Base44 fields punch_pass_accepted/punch_cost → joy_coin_enabled/joy_coin_cost
  const acceptsJoyCoins = event.joy_coin_enabled || event.punch_pass_accepted;
  const joyCoinCost = event.joy_coin_cost ?? event.punch_cost ?? (acceptsJoyCoins ? Math.max(1, Math.round((event.price || 0) / 10)) : 0);
  const isJoyCoinEvent = acceptsJoyCoins && joyCoinCost > 0;

  // Get up to 2 event type badges
  const eventTypes = [];
  if (event.event_type) {
    eventTypes.push(event.event_type.replace(/_+/g, ' '));
  }
  if (event.network) {
    eventTypes.push(event.network);
  }
  const displayTypes = eventTypes.slice(0, 2);

  return (
    <Card 
      className={`bg-slate-900 border-slate-800 transition-all cursor-pointer overflow-hidden ${
        isCancelled ? 'opacity-60 hover:border-red-500/50' : 'hover:border-amber-500/50'
      }`}
      onClick={onClick}
    >
      {/* Hero Image */}
      <div className="relative h-48 bg-slate-800">
        {event.thumbnail_url ? (
          <img 
            src={event.thumbnail_url} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="h-12 w-12 text-slate-600" />
          </div>
        )}
        
        {/* Network-only badge - Top Left */}
        {event.network_only && event.network && (
          <div className="absolute top-3 left-3">
            <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full capitalize">
              {event.network.replace(/_/g, ' ')} Only
            </span>
          </div>
        )}

        {/* Price badges - Top Right */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {isCancelled ? (
            <Badge className="bg-red-500 text-white border-0 rounded-full px-3 py-1 font-semibold shadow-lg">
              CANCELLED
            </Badge>
          ) : (
            <>
              {isJoyCoinEvent && (
                <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-3 py-1 font-semibold shadow-lg flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  {joyCoinCost === 1 ? '1 Joy Coin' : `${joyCoinCost} Joy Coins`}
                </Badge>
              )}
              {!isJoyCoinEvent && !isFree && (
                <Badge className="bg-amber-500 text-black border-0 rounded-full px-3 py-1 font-semibold shadow-lg">
                  ${event.price.toFixed(2)}
                </Badge>
              )}
              {isFree && !isJoyCoinEvent && (
                <Badge className="bg-emerald-500 text-white border-0 rounded-full px-3 py-1 font-semibold shadow-lg">
                  FREE
                </Badge>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Event Title */}
        <h3 className={`font-bold text-slate-100 text-lg line-clamp-2 leading-tight ${
          isCancelled ? 'line-through text-slate-400' : ''
        }`}>
          {event.title}
        </h3>

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-slate-300 text-sm">
          <Calendar className="h-4 w-4 text-amber-500" />
          <span>
            {format(eventDate, 'EEE, MMM d')} · {format(eventDate, 'h:mm a')}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-slate-300 text-sm">
          <MapPin className="h-4 w-4 text-amber-500" />
          <span className="truncate">{event.location}</span>
        </div>

        {/* Event Type Badges */}
        {displayTypes.length > 0 && (
          <div className="flex items-center gap-2 pt-2">
            {displayTypes.map((type, index) => (
              <div 
                key={index}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs border border-slate-700"
              >
                <Tag className="h-3 w-3" />
                <span className="capitalize">{type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}