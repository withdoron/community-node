import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, DollarSign, Repeat2, Users, CheckCircle2, Tag, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function EventDetailModal({ event, isOpen, onClose }) {
  if (!event) return null;

  const eventDate = new Date(event.date);
  const isFree = !event.price || event.price === 0;
  const punchPassEligible = event.punch_pass_accepted;
  const punchCount = punchPassEligible ? Math.max(1, Math.round((event.price || 0) / 10)) : 0;

  // Fetch spoke information if this is a spoke event
  const { data: spokeEvent } = useQuery({
    queryKey: ['spokeEvent', event.id],
    queryFn: async () => {
      const spokeEvents = await base44.entities.SpokeEvent.filter({ local_event_id: event.id });
      if (spokeEvents.length === 0) return null;
      
      const spokeId = spokeEvents[0].spoke_id;
      const spokes = await base44.entities.Spoke.filter({ spoke_id: spokeId });
      return spokes.length > 0 ? { ...spokeEvents[0], spokeName: spokes[0].organization_name } : spokeEvents[0];
    },
    enabled: isOpen && !!event.id
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-800">
              {/* Header with close button */}
              <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
                <h1 className="text-2xl font-bold text-white pr-8">{event.title}</h1>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Hero Image */}
                {event.thumbnail_url && (
                  <div className="relative rounded-xl overflow-hidden bg-slate-800 h-64">
                    <img
                      src={event.thumbnail_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                      {punchPassEligible && (
                        <Badge className="bg-amber-500 text-black border-0 rounded-full px-3 py-1 font-semibold shadow-lg">
                          {punchCount === 1 ? '1 Punch' : `${punchCount} Punches`}
                        </Badge>
                      )}
                      {!punchPassEligible && !isFree && (
                        <Badge className="bg-amber-500 text-black border-0 rounded-full px-3 py-1 font-semibold shadow-lg">
                          ${event.price.toFixed(2)}
                        </Badge>
                      )}
                      {isFree && (
                        <Badge className="bg-emerald-500 text-white border-0 rounded-full px-3 py-1 font-semibold shadow-lg">
                          FREE
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Date & Time */}
                <div className="bg-slate-800/50 rounded-xl p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-amber-500" />
                    <div className="text-amber-500 font-semibold text-lg">
                      {format(eventDate, 'EEEE, MMMM d, yyyy')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 ml-7">
                    <span className="text-base">{format(eventDate, 'h:mm a')}</span>
                    {event.duration_minutes && (
                      <span>· {event.duration_minutes} minutes</span>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="bg-slate-800/50 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-white font-medium text-base mb-2">{event.location}</div>
                      {event.is_virtual && (
                        <div className="text-slate-400 text-sm mb-2">Virtual event: {event.virtual_platform || 'TBD'}</div>
                      )}
                      {!event.is_location_tbd && (
                        <button className="text-amber-500 text-sm flex items-center gap-1 hover:text-amber-400 transition-colors">
                          View on map <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* About */}
                {event.description && (
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-white">About</h3>
                    <p className="text-slate-300 leading-relaxed">{event.description}</p>
                  </div>
                )}

                {/* Pricing */}
                {!isFree && (
                  <div className="bg-slate-800/50 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="h-5 w-5 text-amber-500" />
                      <h4 className="font-semibold text-white text-lg">Pricing</h4>
                    </div>
                    {event.first_visit_free && (
                      <div className="mb-3 text-emerald-400 font-medium">First Time: $0</div>
                    )}
                    {event.ticket_types && event.ticket_types.length > 0 ? (
                      <div className="space-y-2">
                        {event.ticket_types.map((ticket, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-slate-300">{ticket.name}</span>
                            <span className="text-white font-medium">${ticket.price}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-300">
                        {event.is_pay_what_you_wish ? (
                          <span>Pay what you wish {event.min_price && `(min $${event.min_price})`}</span>
                        ) : (
                          <span>30 Day Trial: ${event.price}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Categories */}
                {event.event_type && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Tag className="h-5 w-5 text-amber-500" />
                      <h4 className="font-semibold text-white text-lg">Categories</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-1">
                        {event.event_type.replace(/_/g, ' & ')}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {/* Communities/Network */}
                {event.network && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-white text-lg">Communities</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-3 py-1 capitalize">
                        {event.network}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Age & Audience */}
                {(event.audience && event.audience.length > 0) || punchPassEligible && (
                  <div className="bg-slate-800/50 rounded-xl p-5 space-y-3">
                    <h4 className="font-semibold text-white text-lg">Age & Audience</h4>
                    <div className="text-slate-300">
                      {event.audience && event.audience.length > 0 ? (
                        event.audience.map(a => a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')
                      ) : (
                        'All Ages'
                      )}
                    </div>
                    {punchPassEligible && (
                      <Badge className="bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-lg px-3 py-1 font-medium">
                        Punch Pass Eligible
                      </Badge>
                    )}
                  </div>
                )}

                {/* View on Spoke Source */}
                {spokeEvent && (
                  <div className="pt-4">
                    <a
                      href={event.website || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-center py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      View on {spokeEvent.spokeName || 'Partner Site'} <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}