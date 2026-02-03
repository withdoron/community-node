import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, UserCheck } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

export default function CheckInWidget({ business, onEnterCheckIn }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['business-events-checkin', business.id],
    queryFn: () => base44.entities.Event.filter(
      { business_id: business.id, is_active: true },
      'date',
      50
    )
  });

  const now = new Date();
  const upcomingEvents = events
    .filter((e) => e.status !== 'cancelled' && new Date(e.date || e.start_date) >= now)
    .slice(0, 5);

  return (
    <Card className="p-6 bg-slate-900 border-slate-800">
      <div className="flex items-center gap-3 mb-4">
        <UserCheck className="h-5 w-5 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-100">Check-In</h2>
      </div>
      {isLoading ? (
        <p className="text-sm text-slate-500 py-4">Loading events...</p>
      ) : upcomingEvents.length === 0 ? (
        <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
          <div className="flex flex-col items-center">
            <div className="h-14 w-14 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Calendar className="h-7 w-7 text-slate-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-100 mb-1">No upcoming events</h3>
            <p className="text-sm text-slate-400">Create an event to enable check-in.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-400 mb-3">Select an event to check in attendees:</p>
          {upcomingEvents.map((event) => {
            const eventDate = new Date(event.date || event.start_date);
            const dateLabel = isToday(eventDate)
              ? 'Today'
              : isTomorrow(eventDate)
                ? 'Tomorrow'
                : format(eventDate, 'EEE, MMM d');
            return (
              <div
                key={event.id}
                className="flex items-center justify-between py-3 px-4 bg-slate-800 rounded-lg border border-slate-700"
              >
                <div>
                  <p className="font-medium text-slate-100">{event.title}</p>
                  <p className="text-sm text-slate-500">
                    {dateLabel} · {format(eventDate, 'h:mm a')}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => onEnterCheckIn(event)}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Check-In Mode
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
