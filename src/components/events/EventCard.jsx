import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Coins, Trees, Handshake, Clock, ShieldCheck } from "lucide-react";
import { format } from 'date-fns';

export default function EventCard({ event, onClick }) {
  const eventDate = new Date(event.date);
  const isToday = new Date().toDateString() === eventDate.toDateString();
  const isFree = !event.price || event.price === 0;

  return (
    <Card 
      className="bg-slate-800 border-slate-700 hover:border-amber-500/50 transition-all cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-slate-700">
          {event.thumbnail_url ? (
            <img 
              src={event.thumbnail_url} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="h-8 w-8 text-slate-500" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title & Category */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="font-semibold text-white text-base line-clamp-1">
                {event.title}
              </h3>
              {event.is_trusted && (
                <ShieldCheck className="h-4 w-4 text-amber-500 flex-shrink-0" />
              )}
            </div>
            {isFree && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs flex-shrink-0">
                FREE
              </Badge>
            )}
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-2">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {format(eventDate, 'MMM d')}
              {isToday && <span className="text-amber-400 ml-1">• Today</span>}
            </span>
            <Clock className="h-3.5 w-3.5 ml-2" />
            <span>{format(eventDate, 'h:mm a')}</span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-3">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </div>

          {/* Attribute Icons Row */}
          <div className="flex items-center gap-2">
            {event.accepts_silver && (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-400 text-xs">
                <Coins className="h-3 w-3" />
                <span>Silver</span>
              </div>
            )}
            {event.setting === 'outdoor' && (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs">
                <Trees className="h-3 w-3" />
                <span>Outdoor</span>
              </div>
            )}
            {event.is_volunteer && (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs">
                <Handshake className="h-3 w-3" />
                <span>Volunteer</span>
              </div>
            )}
            {!isFree && (
              <span className="text-slate-400 text-xs ml-auto">
                ${event.price}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}