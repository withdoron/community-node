import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, DollarSign, Repeat2, Users, CheckCircle2, Tag, ExternalLink, UserCheck, UserPlus, Coins } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useRSVP, getRefundEligibility } from '@/hooks/useRSVP';
import { useJoyCoins } from '@/hooks/useJoyCoins';
import { toast } from 'sonner';

export default function EventDetailModal({ event, isOpen, onClose }) {
  if (!event) return null;

  const eventDate = new Date(event.date || event.start_date);
  const isPast = eventDate < new Date();
  const isFree = !event.price || event.price === 0;
  const acceptsLegacyJoyCoins = event.punch_pass_accepted;
  const legacyJoyCoinCost = acceptsLegacyJoyCoins ? Math.max(1, Math.round((event.price || 0) / 10)) : 0;
  const isCancelled = event.status === 'cancelled';
  const isJoyCoinEvent = event?.joy_coin_enabled && (event?.joy_coin_cost ?? 0) > 0;
  const joyCoinCost = isJoyCoinEvent ? (event.joy_coin_cost || 0) : 0;

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) return null;
        return base44.auth.me();
      } catch {
        return null;
      }
    },
    retry: false
  });

  const {
    isGoing,
    attendeeCount,
    userRSVP,
    rsvpLoading,
    rsvpGoing,
    rsvpCancel
  } = useRSVP(event?.id, currentUser);

  const { balance: joyCoinBalance, hasJoyCoins, isLoading: joyCoinsLoading } = useJoyCoins();

  const [partySize, setPartySize] = useState(1);
  const [showPartyPicker, setShowPartyPicker] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [rsvpConfirmation, setRsvpConfirmation] = useState(null); // 'going' | 'cancelled' | null
  const [cancelConfirming, setCancelConfirming] = useState(false);

  const maxPartySize = event?.max_party_size != null ? event.max_party_size : 10;
  const totalCost = joyCoinCost * partySize;
  const hasEnoughJoyCoins = !isJoyCoinEvent || joyCoinBalance >= totalCost;

  const hasJoyCoinReservation = !!(userRSVP?.joy_coin_reservation_id && (userRSVP?.joy_coin_total ?? 0) > 0);
  const joyCoinCancelAmount = userRSVP?.joy_coin_total ?? 0;
  const willRefundOnCancel = hasJoyCoinReservation && getRefundEligibility(event);

  const { data: householdMembers = [] } = useQuery({
    queryKey: ['householdMembers', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      return base44.entities.HouseholdMembers.filter({ user_id: currentUser.id });
    },
    enabled: !!currentUser?.id && isOpen,
  });

  useEffect(() => {
    if (showPartyPicker && selectedMembers.length > 0) {
      setPartySize(selectedMembers.length);
    }
  }, [selectedMembers, showPartyPicker]);

  useEffect(() => {
    if (showPartyPicker && selectedMembers.length === 0) {
      setSelectedMembers([{
        household_member_id: null,
        name: currentUser?.full_name || currentUser?.data?.display_name || currentUser?.email || 'Me',
        is_primary: true
      }]);
    }
  }, [showPartyPicker]);

  const toggleMember = (member, isPrimary = false) => {
    setSelectedMembers((prev) => {
      const exists = prev.find((m) =>
        isPrimary ? m.is_primary : m.household_member_id === member.id
      );
      if (exists) {
        if (isPrimary) return prev;
        return prev.filter((m) => m.household_member_id !== member.id);
      }
      return [...prev, {
        household_member_id: isPrimary ? null : member.id,
        name: isPrimary ? (currentUser?.full_name || currentUser?.data?.display_name || currentUser?.email || 'Me') : member.name,
        is_primary: isPrimary,
      }];
    });
  };

  useEffect(() => {
    setRsvpConfirmation(null);
    setCancelConfirming(false);
    setPartySize(1);
    setShowPartyPicker(false);
    setSelectedMembers([]);
  }, [event?.id]);


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
                <div className="flex-1 pr-8">
                  <h1 className={`text-2xl font-bold ${isCancelled ? 'text-red-400 line-through' : 'text-white'}`}>
                    {event.title}
                  </h1>
                  {isCancelled && (
                    <Badge className="mt-2 bg-red-500 text-white border-0 rounded-full px-3 py-1 font-semibold">
                      EVENT CANCELLED
                    </Badge>
                  )}
                </div>
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
                      {isCancelled ? (
                        <Badge className="bg-red-500 text-white border-0 rounded-full px-3 py-1 font-semibold shadow-lg">
                          CANCELLED
                        </Badge>
                      ) : (
                        <>
                          {isJoyCoinEvent && (
                            <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-3 py-1 font-semibold shadow-lg flex items-center gap-1">
                              <Coins className="h-3 w-3" />
                              {joyCoinCost === 1 ? '1 coin' : `${joyCoinCost} coins`}
                            </Badge>
                          )}
                          {acceptsLegacyJoyCoins && (
                            <Badge className="bg-amber-500 text-black border-0 rounded-full px-3 py-1 font-semibold shadow-lg">
                              {legacyJoyCoinCost === 1 ? '1 Joy Coin' : `${legacyJoyCoinCost} Joy Coins`}
                            </Badge>
                          )}
                          {!acceptsLegacyJoyCoins && !isFree && (
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
                )}

                {/* Price badge when no hero image */}
                {!event.thumbnail_url && !isCancelled && (
                  <div className="flex flex-wrap gap-2">
                    {isJoyCoinEvent && (
                      <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-3 py-1 font-semibold flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        {joyCoinCost === 1 ? '1 coin' : `${joyCoinCost} coins`}
                      </Badge>
                    )}
                    {acceptsLegacyJoyCoins && (
                      <Badge className="bg-amber-500 text-black border-0 rounded-full px-3 py-1 font-semibold">
                        {legacyJoyCoinCost === 1 ? '1 Joy Coin' : `${legacyJoyCoinCost} Joy Coins`}
                      </Badge>
                    )}
                    {!acceptsLegacyJoyCoins && !isFree && event.price > 0 && (
                      <Badge className="bg-amber-500 text-black border-0 rounded-full px-3 py-1 font-semibold">
                        ${event.price.toFixed(2)}
                      </Badge>
                    )}
                    {isFree && !isJoyCoinEvent && (
                      <Badge className="bg-emerald-500 text-white border-0 rounded-full px-3 py-1 font-semibold">
                        FREE
                      </Badge>
                    )}
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
                {(!isFree || event.first_visit_free || event.ticket_types?.length > 0) && (
                  <div className="bg-slate-800/50 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="h-5 w-5 text-amber-500" />
                      <h4 className="font-semibold text-white text-lg">Pricing</h4>
                    </div>
                    <div className="space-y-2">
                      {event.first_visit_free && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">First Time</span>
                          <span className="text-white font-medium">$0</span>
                        </div>
                      )}
                      {event.ticket_types && event.ticket_types.length > 0 ? (
                        event.ticket_types.map((ticket, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-slate-300">{ticket.name}</span>
                            <span className="text-white font-medium">${ticket.price}</span>
                          </div>
                        ))
                      ) : event.price > 0 ? (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">
                            {event.is_pay_what_you_wish ? 
                              `Pay what you wish${event.min_price ? ` (min $${event.min_price})` : ''}` : 
                              '30 Day Trial'}
                          </span>
                          <span className="text-white font-medium">${event.price}</span>
                        </div>
                      ) : null}
                    </div>
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
                        {event.event_type.replace(/_+/g, ' ')}
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

                {/* Recurring */}
                {event.is_recurring && (
                  <div className="bg-slate-800/50 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Repeat2 className="h-5 w-5 text-amber-500" />
                      <h4 className="font-semibold text-white text-lg">Recurring Event</h4>
                    </div>
                    <div className="text-slate-300">
                      Repeats {event.recurring_pattern || 'weekly'} on {event.recurring_days?.join(', ') || 'specific days'}
                    </div>
                  </div>
                )}

                {/* Accessibility & Inclusion */}
                {event.accessibility_features && event.accessibility_features.length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-amber-500" />
                      <h4 className="font-semibold text-white text-lg">Accessibility & Inclusion</h4>
                    </div>
                    <div className="space-y-2">
                      {event.accessibility_features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-amber-500" />
                          <span className="text-slate-300 capitalize">{feature.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Age & Audience */}
                {(event.audience && event.audience.length > 0) || acceptsLegacyJoyCoins && (
                  <div className="bg-slate-800/50 rounded-xl p-5 space-y-3">
                    <h4 className="font-semibold text-white text-lg">Age & Audience</h4>
                    <div className="text-slate-300">
                      {event.audience && event.audience.length > 0 ? (
                        event.audience.map(a => a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')
                      ) : (
                        'All Ages'
                      )}
                    </div>
                    {acceptsLegacyJoyCoins && (
                      <Badge className="bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-lg px-3 py-1 font-medium">
                        Accepts Joy Coins
                      </Badge>
                    )}
                  </div>
                )}

                {/* Joy Coin cost */}
                {isJoyCoinEvent && (
                  <div className="bg-slate-800/50 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <Coins className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      <div>
                        <div className="text-white font-medium">Joy Coins</div>
                        <div className="text-sm text-slate-400">{joyCoinCost === 1 ? '1 coin per person' : `${joyCoinCost} coins per person`} — Community Pass members</div>
                      </div>
                    </div>
                    {currentUser && !isGoing && rsvpConfirmation === null && joyCoinCost > 0 && (
                      <div className="space-y-3 pt-2 border-t border-slate-700">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Cost per person</span>
                          <span className="text-slate-200">{joyCoinCost} {joyCoinCost === 1 ? 'coin' : 'coins'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400">How many people?</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPartySize(Math.max(1, partySize - 1))}
                              disabled={partySize <= 1}
                              className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-lg font-semibold text-slate-100">{partySize}</span>
                            <button
                              type="button"
                              onClick={() => setPartySize(partySize + 1)}
                              disabled={partySize >= maxPartySize}
                              className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        {partySize > 1 && (
                          <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-800">
                            <span className="text-slate-300 font-medium">Total</span>
                            <span className="text-amber-500 font-semibold">{totalCost} coins</span>
                          </div>
                        )}
                        {hasJoyCoins && !joyCoinsLoading && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Your balance</span>
                            <span className={hasEnoughJoyCoins ? 'text-slate-200' : 'text-red-400'}>
                              {joyCoinBalance} coins {!hasEnoughJoyCoins && totalCost > joyCoinBalance && `(need ${totalCost - joyCoinBalance} more)`}
                            </span>
                          </div>
                        )}
                        {householdMembers.length > 0 && (
                          <div className="pt-2">
                            {!showPartyPicker ? (
                              <button
                                type="button"
                                onClick={() => setShowPartyPicker(true)}
                                className="text-sm text-amber-500 hover:text-amber-400"
                              >
                                Select who&apos;s going (optional)
                              </button>
                            ) : (
                              <div className="space-y-2 p-3 bg-slate-800/50 rounded-lg mt-2">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-slate-400">Who&apos;s going?</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowPartyPicker(false);
                                      setSelectedMembers([]);
                                      setPartySize(1);
                                    }}
                                    className="text-xs text-slate-500 hover:text-slate-400"
                                  >
                                    Just use number
                                  </button>
                                </div>
                                <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 cursor-default">
                                  <input
                                    type="checkbox"
                                    checked
                                    readOnly
                                    disabled
                                    className="rounded border-slate-600 bg-slate-800"
                                  />
                                  <span className="text-sm text-slate-200">{currentUser?.full_name || currentUser?.data?.display_name || currentUser?.email || 'Me'} (me)</span>
                                </label>
                                {householdMembers.map((member) => (
                                  <label key={member.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={selectedMembers.some((m) => m.household_member_id === member.id)}
                                      onChange={() => toggleMember(member)}
                                      className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                                    />
                                    <span className="text-sm text-slate-200">{member.name}</span>
                                    {(member.category === 'child' || member.category === 'infant') && (
                                      <span className="text-xs text-slate-500">({member.category})</span>
                                    )}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {currentUser && hasJoyCoins && !joyCoinsLoading && (isGoing || rsvpConfirmation !== null) && (
                      <span className={`text-sm font-medium ${hasEnoughJoyCoins ? 'text-emerald-400' : 'text-red-400'}`}>
                        Your balance: {joyCoinBalance}
                      </span>
                    )}
                  </div>
                )}

                {/* Accept RSVPs */}
                {event.accepts_rsvps && (
                  <div className="bg-slate-800/50 rounded-xl p-5 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <div className="text-white font-medium">Accept RSVPs for this event</div>
                  </div>
                )}

                {/* Additional Notes */}
                {event.instructor_note && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-white text-lg">Additional Notes</h4>
                    <div className="bg-slate-800/50 rounded-xl p-5 text-slate-300">
                      {event.instructor_note}
                    </div>
                  </div>
                )}

                {/* Organizer Info */}
                {(event.organizer_name || event.organizer_email || event.organizer_phone || event.website) && (
                  <div className="bg-slate-800/50 rounded-xl p-5 space-y-3">
                    <h4 className="font-semibold text-white text-lg">Organizer</h4>
                    {event.organizer_name && (
                      <div className="text-slate-300 font-medium">{event.organizer_name}</div>
                    )}
                    {event.organizer_email && (
                      <div className="text-slate-400 text-sm">{event.organizer_email}</div>
                    )}
                    {event.organizer_phone && (
                      <div className="text-slate-400 text-sm">{event.organizer_phone}</div>
                    )}
                    {event.website && !spokeEvent && (
                      <a
                        href={event.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-500 hover:text-amber-400 text-sm flex items-center gap-1 inline-flex transition-colors"
                      >
                        Visit Website <ExternalLink className="h-3 w-3" />
                      </a>
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

                {/* RSVP Section */}
                {!isCancelled && !isPast && (
                  <div className="space-y-3 pt-2">
                    {rsvpConfirmation === 'going' && (
                      <div className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                        <CheckCircle2 className="h-5 w-5" />
                        You&apos;re in! See you there.
                      </div>
                    )}

                    {rsvpConfirmation === 'cancelled' && (
                      <div className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 font-semibold">
                        RSVP removed
                      </div>
                    )}

                    {rsvpConfirmation === null && (
                      <>
                        {attendeeCount > 0 && (
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <Users className="h-4 w-4 text-amber-500" />
                            {isGoing ? (
                              <span>
                                You{attendeeCount > 1 ? ` and ${attendeeCount - 1} other${attendeeCount > 2 ? 's' : ''}` : ''} attending
                              </span>
                            ) : (
                              <span>
                                {attendeeCount} {attendeeCount === 1 ? 'person' : 'people'} attending
                              </span>
                            )}
                          </div>
                        )}

                        {currentUser ? (
                          isGoing ? (
                            cancelConfirming && hasJoyCoinReservation ? (
                              <div className="space-y-3">
                                <div className={`py-3 px-4 rounded-lg text-sm font-medium ${willRefundOnCancel ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                                  {willRefundOnCancel
                                    ? `${joyCoinCancelAmount} coin${joyCoinCancelAmount !== 1 ? 's' : ''} will be refunded`
                                    : `${joyCoinCancelAmount} coin${joyCoinCancelAmount !== 1 ? 's' : ''} will be forfeited (outside refund window)`}
                                </div>
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => setCancelConfirming(false)}
                                    className="flex-1 py-3 px-6 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-semibold hover:bg-slate-700 transition-colors"
                                  >
                                    Keep RSVP
                                  </button>
                                  <button
                                    onClick={() => {
                                      rsvpCancel.mutate({ event }, {
                                        onSuccess: () => {
                                          setCancelConfirming(false);
                                          setPartySize(1);
                                          setRsvpConfirmation('cancelled');
                                          setTimeout(() => {
                                            setRsvpConfirmation(null);
                                            onClose();
                                          }, 1200);
                                        },
                                        onError: () => {
                                          toast.error('Failed to cancel. Please try again.');
                                        }
                                      });
                                    }}
                                    disabled={rsvpCancel.isPending}
                                    className="flex-1 py-3 px-6 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                                  >
                                    {rsvpCancel.isPending ? 'Cancelling...' : 'Confirm Cancel'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  if (hasJoyCoinReservation) {
                                    setCancelConfirming(true);
                                  } else {
                                    rsvpCancel.mutate({ event }, {
                                      onSuccess: () => {
                                        setPartySize(1);
                                        setRsvpConfirmation('cancelled');
                                        setTimeout(() => {
                                          setRsvpConfirmation(null);
                                          onClose();
                                        }, 1200);
                                      },
                                      onError: () => toast.error('Failed to cancel. Please try again.')
                                    });
                                  }
                                }}
                                disabled={rsvpCancel.isPending}
                                className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 font-semibold hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                              >
                                <UserCheck className="h-5 w-5" />
                                {rsvpCancel.isPending ? 'Cancelling...' : "You're Going — Tap to Cancel"}
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => {
                                rsvpGoing.mutate({
                                  event,
                                  partySize,
                                  partyComposition: showPartyPicker && selectedMembers.length > 0 ? selectedMembers : null
                                }, {
                                  onSuccess: () => {
                                    setRsvpConfirmation('going');
                                    setTimeout(() => {
                                      setRsvpConfirmation(null);
                                      setPartySize(1);
                                      onClose();
                                    }, 1200);
                                  },
                                  onError: (err) => {
                                    if (err?.message === 'INSUFFICIENT_JOY_COINS') {
                                      toast.error('Not enough Joy Coins. Subscribe to Community Pass or earn more coins.');
                                    } else {
                                      toast.error('Failed to RSVP. Please try again.');
                                    }
                                  }
                                });
                              }}
                              disabled={rsvpGoing.isPending || (isJoyCoinEvent && !hasEnoughJoyCoins)}
                              className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold transition-colors disabled:bg-amber-500/50 disabled:cursor-not-allowed"
                            >
                              <UserPlus className="h-5 w-5" />
                              {rsvpGoing.isPending ? 'Saving...' : isJoyCoinEvent && !hasEnoughJoyCoins ? `Need ${totalCost} coins` : "I'm Going"}
                            </button>
                          )
                        ) : (
                          <div className="text-center py-3 px-6 rounded-lg bg-slate-800 border border-slate-700">
                            <p className="text-slate-400 text-sm">
                              <button
                                type="button"
                                onClick={() => base44.auth.redirectToLogin()}
                                className="text-amber-500 hover:text-amber-400 font-semibold"
                              >
                                Sign in
                              </button>
                              {' '}to RSVP for this event
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {isPast && !isCancelled && (
                  <div className="text-center py-3 px-6 rounded-lg bg-slate-800 border border-slate-700">
                    <p className="text-slate-400 text-sm">This event has ended</p>
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