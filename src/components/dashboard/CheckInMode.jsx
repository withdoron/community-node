import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, Users, CheckCircle, Clock, Printer } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function PinEntryModal({ attendee, onConfirm, onCancel, isLoading }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }
    setError('');
    onConfirm(pin);
  };

  const partyLabel = attendee.party_size > 1
    ? `${attendee.user_name} + ${attendee.party_size - 1}`
    : attendee.user_name;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl max-w-sm w-full p-6 border border-slate-800">
        <h3 className="text-lg font-semibold text-slate-100 mb-1">
          Check In — {partyLabel}
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          {attendee.party_size > 1 ? `Party of ${attendee.party_size}` : 'Single attendee'}
          {attendee.joy_coin_total > 0 && ` · ${attendee.joy_coin_total} coins`}
        </p>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-400 mb-2">Enter 4-digit PIN</label>
          <Input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="• • • •"
            className="bg-slate-800 border-slate-700 text-slate-100 text-center text-2xl tracking-widest mb-2"
            autoFocus
          />
          {error && <p className="text-sm text-red-400 mb-2">{error}</p>}

          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 text-slate-400 hover:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || pin.length !== 4}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black"
            >
              {isLoading ? 'Checking...' : 'Confirm'}
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => onConfirm(null)}
              className="text-sm text-slate-500 hover:text-slate-400 w-full text-center py-2 inline-block"
            >
              Can&apos;t get PIN? Check in without PIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AttendeeRow({ attendee, onCheckIn, isCheckedIn }) {
  const partyLabel = attendee.party_size > 1
    ? `${attendee.user_name} + ${attendee.party_size - 1}`
    : attendee.user_name;

  const partyNames = attendee.party_composition?.length > 0
    ? attendee.party_composition.map((p) => p.name).join(', ')
    : null;

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isCheckedIn ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>
          {isCheckedIn ? (
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          ) : (
            <Clock className="h-5 w-5 text-slate-500" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-100">{partyLabel}</p>
          {partyNames && (
            <p className="text-xs text-slate-500">{partyNames}</p>
          )}
          {attendee.joy_coin_total > 0 && (
            <p className="text-xs text-amber-500">{attendee.joy_coin_total} coins</p>
          )}
        </div>
      </div>

      <div>
        {isCheckedIn ? (
          <span className="text-sm text-emerald-500">
            ✓ {attendee.checked_in_at && new Date(attendee.checked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </span>
        ) : (
          <Button
            size="sm"
            onClick={() => onCheckIn(attendee)}
            className="bg-amber-500 hover:bg-amber-400 text-black"
          >
            Check In
          </Button>
        )}
      </div>
    </div>
  );
}

export function CheckInMode({ event, onExit }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [checkingIn, setCheckingIn] = useState(null);
  const [processingNoShows, setProcessingNoShows] = useState(false);

  const eventDate = event?.date || event?.start_date;
  const eventEnd = event?.end_date
    ? new Date(event.end_date)
    : new Date(
        new Date(event?.date || event?.start_date || 0).getTime() +
          (event?.duration_minutes || 60) * 60 * 1000
      );
  const hasEnded = new Date() > eventEnd;

  const { data: rsvps = [], isLoading } = useQuery({
    queryKey: ['eventRsvps', event?.id],
    queryFn: async () => {
      const records = await base44.entities.RSVP.filter({
        event_id: event.id,
        status: 'going',
        is_active: true
      });
      return records.sort((a, b) => (a.user_name || '').localeCompare(b.user_name || ''));
    },
    enabled: !!event?.id
  });

  const filteredRsvps = useMemo(() => {
    if (!searchQuery.trim()) return rsvps;
    const query = searchQuery.toLowerCase();
    return rsvps.filter((r) =>
      r.user_name?.toLowerCase().includes(query) ||
      r.party_composition?.some((p) => p?.name?.toLowerCase().includes(query))
    );
  }, [rsvps, searchQuery]);

  const totalExpected = rsvps.reduce((sum, r) => sum + (r.party_size || 1), 0);
  const checkedInRsvps = rsvps.filter((r) => r.checked_in);
  const checkedInCount = checkedInRsvps.reduce((sum, r) => sum + (r.party_size || 1), 0);

  const checkInMutation = useMutation({
    mutationFn: async ({ rsvp }) => {
      const result = await base44.functions.invoke('manageRSVP', {
        action: 'checkin',
        event_id: event.id,
        rsvp_id: rsvp.id,
      });
      const data = result?.data ?? result;
      if (data?.error) {
        throw new Error(data.error);
      }
      return { rsvp };
    },
    onSuccess: ({ rsvp }) => {
      queryClient.invalidateQueries({ queryKey: ['eventRsvps', event.id] });
      queryClient.invalidateQueries({ queryKey: ['joyCoins', rsvp.user_id] });
      queryClient.invalidateQueries({ queryKey: ['joyCoinsTransactions', rsvp.user_id] });
      setCheckingIn(null);
      const partyLabel = rsvp.party_size > 1
        ? `${rsvp.user_name} + ${rsvp.party_size - 1}`
        : rsvp.user_name;
      toast.success(`${partyLabel} checked in!`);
    },
    onError: () => {
      toast.error('Check-in failed. Please try again.');
    }
  });

  const handleCheckIn = (attendee) => {
    setCheckingIn(attendee);
  };

  const handleConfirmCheckIn = (pin) => {
    if (checkingIn) {
      checkInMutation.mutate({ rsvp: checkingIn });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-sm text-amber-500 font-medium">CHECK-IN MODE</p>
              <h1 className="text-lg font-bold text-slate-100 truncate">{event.title}</h1>
              <p className="text-sm text-slate-400">
                {eventDate && new Date(eventDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onExit}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Exit Check-In
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-100">{checkedInCount}</p>
              <p className="text-sm text-slate-400">Checked In</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-100">{totalExpected}</p>
              <p className="text-sm text-slate-400">Expected</p>
            </CardContent>
          </Card>
        </div>

        {hasEnded && (
          <div className="mb-6">
            <Button
              onClick={async () => {
                setProcessingNoShows(true);
                try {
                  const { processNoShowsForEvent } = await import('@/functions/processNoShows');
                  const results = await processNoShowsForEvent(event.id);
                  toast.success(`Processed ${results.rsvpsMarkedNoShow} no-shows`);
                  queryClient.invalidateQueries({ queryKey: ['eventRsvps', event.id] });
                } catch (error) {
                  toast.error(error?.message || 'Failed to process no-shows');
                } finally {
                  setProcessingNoShows(false);
                }
              }}
              disabled={processingNoShows}
              variant="outline"
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              {processingNoShows ? 'Processing...' : 'Mark Remaining as No-Show'}
            </Button>
          </div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name..."
            className="pl-10 bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
          />
        </div>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-400">
              Expected ({rsvps.length} {rsvps.length === 1 ? 'RSVP' : 'RSVPs'})
            </CardTitle>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-400"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-slate-500 py-4 text-center">Loading...</p>
            ) : filteredRsvps.length === 0 ? (
              <div className="py-6 text-center">
                <Users className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  {searchQuery ? 'No matching attendees' : 'No RSVPs yet'}
                </p>
              </div>
            ) : (
              <div>
                {filteredRsvps.map((rsvp) => (
                  <AttendeeRow
                    key={rsvp.id}
                    attendee={rsvp}
                    onCheckIn={handleCheckIn}
                    isCheckedIn={rsvp.checked_in}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {checkingIn && (
        <PinEntryModal
          attendee={checkingIn}
          onConfirm={handleConfirmCheckIn}
          onCancel={() => setCheckingIn(null)}
          isLoading={checkInMutation.isPending}
        />
      )}
    </div>
  );
}
