import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, DollarSign, Repeat2, Users, CheckCircle2, Tag, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function EventDetailModal({ event, isOpen, onClose }) {
  if (!event) return null;

  const eventDate = new Date(event.date);
  const isFree = !event.price || event.price === 0;

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
              <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900">
                <h1 className="text-3xl font-bold text-white">{event.title}</h1>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-100"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Hero Image */}
                {event.thumbnail_url && (
                  <div className="relative rounded-xl overflow-hidden bg-slate-800 aspect-video">
                    <img
                      src={event.thumbnail_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    {isFree && (
                      <Badge className="absolute top-4 right-4 bg-emerald-500 text-white text-sm px-3 py-1">
                        FREE
                      </Badge>
                    )}
                  </div>
                )}

                {/* Date & Time */}
                <div className="bg-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-slate-400 text-sm">Date & Time</div>
                      <div className="text-white">
                        {format(eventDate, 'EEEE, MMMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="h-4 w-4" />
                        <span>{format(eventDate, 'h:mm a')}</span>
                        {event.duration_minutes && (
                          <span className="text-slate-400">• {event.duration_minutes} minutes</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-slate-400 text-sm">Location</div>
                      <div className="text-white">{event.location}</div>
                      {event.is_virtual && (
                        <div className="text-slate-300 text-sm mt-2">Virtual event: {event.virtual_platform || 'TBD'}</div>
                      )}
                      {!event.is_location_tbd && (
                        <button className="text-amber-400 text-sm mt-2 flex items-center gap-1 hover:text-amber-300">
                          View on map <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* About */}
                {event.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">About</h3>
                    <p className="text-slate-300">{event.description}</p>
                  </div>
                )}

                {/* Pricing */}
                {(isFree || event.pricing_type) && (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-5 w-5 text-amber-500" />
                      <h4 className="font-semibold text-white">Pricing</h4>
                    </div>
                    <div className="text-slate-300">
                      {isFree ? 'Free event' : `$${event.price}`}
                    </div>
                  </div>
                )}

                {/* Categories */}
                {event.event_type && (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="h-5 w-5 text-amber-500" />
                      <h4 className="font-semibold text-white">Categories</h4>
                    </div>
                    <Badge className="bg-slate-700 text-slate-100">
                      {event.event_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                )}

                {/* Recurring */}
                {event.is_recurring && (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Repeat2 className="h-5 w-5 text-amber-500" />
                      <h4 className="font-semibold text-white">Recurring Event</h4>
                    </div>
                    <div className="text-slate-300">
                      Repeats {event.recurring_pattern || 'weekly'} on {event.recurring_days?.join(', ') || 'specific days'}
                    </div>
                  </div>
                )}

                {/* Accessibility & Inclusion */}
                {event.accessibility_features && event.accessibility_features.length > 0 && (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-amber-500" />
                      <h4 className="font-semibold text-white">Accessibility & Inclusion</h4>
                    </div>
                    <div className="space-y-2">
                      {event.accessibility_features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-amber-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-slate-300 capitalize">{feature.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Age & Audience */}
                {event.audience && event.audience.length > 0 && (
                  <div className="bg-slate-800 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">Age & Audience</h4>
                    <div className="text-slate-300">
                      {event.audience.map(a => a.replace(/_/g, ' ')).join(', ')}
                    </div>
                  </div>
                )}

                {/* Accept RSVPs */}
                {event.accepts_rsvps && (
                  <div className="bg-slate-800 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <div className="text-white font-medium">Accept RSVPs for this event</div>
                  </div>
                )}

                {/* Additional Notes */}
                {event.instructor_note && (
                  <div>
                    <h4 className="font-semibold text-white mb-3">Additional Notes</h4>
                    <div className="bg-slate-800 rounded-lg p-4 text-slate-300">
                      {event.instructor_note}
                    </div>
                  </div>
                )}

                {/* Organizer Info */}
                {(event.organizer_name || event.organizer_email || event.organizer_phone || event.website) && (
                  <div className="bg-slate-800 rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-white mb-3">Organizer</h4>
                    {event.organizer_name && (
                      <div className="text-slate-300">{event.organizer_name}</div>
                    )}
                    {event.organizer_email && (
                      <div className="text-slate-400 text-sm">{event.organizer_email}</div>
                    )}
                    {event.organizer_phone && (
                      <div className="text-slate-400 text-sm">{event.organizer_phone}</div>
                    )}
                    {event.website && (
                      <a
                        href={event.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1 inline-flex"
                      >
                        Visit Website <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
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