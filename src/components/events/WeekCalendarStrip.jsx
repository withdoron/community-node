/**
 * Week-at-a-glance strip + Coming Up section. Reusable for NetworkPage and MyLane Happening Soon.
 */
import React, { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay, startOfDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonday(date) {
  return startOfWeek(new Date(date), { weekStartsOn: 1 });
}

function formatDateRange(start, end) {
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
}

export default function WeekCalendarStrip({ events = [], onEventClick, emptyMessage = 'No upcoming events.' }) {
  const today = startOfDay(new Date());
  const mondayThisWeek = getMonday(today);
  const [currentWeekStart, setCurrentWeekStart] = useState(mondayThisWeek);

  const weekEnd = useMemo(() => addDays(currentWeekStart, 6), [currentWeekStart]);
  const isViewingCurrentWeek = isSameDay(currentWeekStart, mondayThisWeek);

  const { inWeek, comingUp } = useMemo(() => {
    const inWeekList = [];
    const comingUpList = [];
    events.forEach((ev) => {
      const d = startOfDay(new Date(ev.date));
      if (d >= currentWeekStart && d <= weekEnd) inWeekList.push(ev);
      else if (d > weekEnd) comingUpList.push(ev);
    });
    return { inWeek: inWeekList, comingUp: comingUpList };
  }, [events, currentWeekStart, weekEnd]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    weekDays.forEach((d) => map.set(d.getTime(), []));
    inWeek.forEach((ev) => {
      const d = startOfDay(new Date(ev.date));
      const t = d.getTime();
      if (map.has(t)) map.get(t).push(ev);
    });
    return map;
  }, [weekDays, inWeek]);

  const { comingUpGroups, hasMoreComingUp } = useMemo(() => {
    const byTitle = new Map();
    comingUp.forEach((ev) => {
      const key = (ev.title || 'Event').trim().toLowerCase();
      if (!byTitle.has(key)) byTitle.set(key, { title: ev.title || 'Event', events: [] });
      byTitle.get(key).events.push(ev);
    });
    const groups = Array.from(byTitle.values())
      .map((g) => ({
        ...g,
        events: g.events.sort((a, b) => new Date(a.date) - new Date(b.date)),
      }))
      .slice(0, 5);
    return { comingUpGroups: groups, hasMoreComingUp: byTitle.size > 5 };
  }, [comingUp]);

  if (events.length === 0) {
    return <p className="text-slate-500 text-sm py-4">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-6">
      {/* Week strip */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            type="button"
            onClick={() => setCurrentWeekStart((w) => addDays(w, -7))}
            disabled={isViewingCurrentWeek}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-800/50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <span className="text-slate-300 text-sm font-medium">
            {isViewingCurrentWeek ? 'This Week' : formatDateRange(currentWeekStart, weekEnd)}
          </span>
          <button
            type="button"
            onClick={() => setCurrentWeekStart((w) => addDays(w, 7))}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-800/50 transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const dayEvents = eventsByDay.get(day.getTime()) || [];
            const show = dayEvents.slice(0, 2);
            const more = dayEvents.length - 2;
            return (
              <div key={day.getTime()} className="min-w-0 flex flex-col items-center">
                <span className="text-slate-400 text-xs">{DAY_LABELS[(day.getDay() + 6) % 7]}</span>
                <span
                  className={`text-slate-200 text-sm font-medium mt-0.5 flex items-center justify-center w-8 h-8 rounded-full ${isToday(day) ? 'bg-amber-500 text-black' : ''}`}
                >
                  {format(day, 'd')}
                </span>
                <div className="mt-2 w-full space-y-1 min-h-[44px]">
                  {show.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onEventClick(ev)}
                      className="w-full text-left text-xs truncate max-w-[20ch] bg-slate-800 border border-slate-700 rounded px-2 py-1.5 min-h-[44px] flex items-center cursor-pointer hover:border-amber-500/50 transition-colors text-slate-200"
                      title={ev.title}
                    >
                      {ev.title ? (ev.title.length > 20 ? `${ev.title.slice(0, 20)}…` : ev.title) : 'Event'}
                    </button>
                  ))}
                  {more > 0 && (
                    <span className="text-slate-500 text-xs block px-1">+{more} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coming Up */}
      {comingUpGroups.length > 0 && (
        <div className="divide-y divide-slate-800">
          <h3 className="text-slate-300 text-sm font-semibold mb-2">Coming Up</h3>
          {comingUpGroups.map((group) => {
            const nextEvent = group.events[0];
            const dates = group.events.map((e) => format(new Date(e.date), 'MMM d')).join(', ');
            return (
              <button
                key={group.title + nextEvent.id}
                type="button"
                onClick={() => onEventClick(nextEvent)}
                className="w-full text-left py-3 block hover:bg-slate-800/30 rounded-lg px-1 -mx-1 transition-colors min-h-[44px] flex flex-col justify-center"
              >
                <span className="text-slate-200 text-sm font-medium">{group.title}</span>
                <span className="text-slate-400 text-xs mt-0.5">{dates}</span>
              </button>
            );
          })}
          {hasMoreComingUp && (
            <div className="pt-2">
              <Link
                to="/events"
                className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
              >
                View all events →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
