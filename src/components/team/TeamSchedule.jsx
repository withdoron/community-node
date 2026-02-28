import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Calendar,
  Plus,
  ClipboardList,
  Trophy,
  Shield,
  Users,
  PartyPopper,
  MoreVertical,
  MapPin,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const EVENT_TYPES = [
  { value: 'practice', label: 'Practice', icon: ClipboardList },
  { value: 'game', label: 'Game', icon: Trophy },
  { value: 'scrimmage', label: 'Scrimmage', icon: Shield },
  { value: 'meeting', label: 'Meeting', icon: Users },
  { value: 'social', label: 'Social', icon: PartyPopper },
];

const EVENT_TYPE_SUGGESTIONS = {
  practice: 'Practice',
  game: 'Game',
  scrimmage: 'Scrimmage',
  meeting: 'Team Meeting',
  social: 'Team Social',
};

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function formatEventDate(dateStr, timeStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  if (timeStr) return `${day} · ${formatTime(timeStr)}`;
  return day;
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

function getEventIcon(type) {
  const t = EVENT_TYPES.find((e) => e.value === type);
  return t?.icon || Calendar;
}

function getEventBadgeClass(type) {
  if (type === 'game') return 'bg-amber-500/20 text-amber-500';
  if (type === 'practice') return 'bg-slate-700 text-slate-300';
  return 'bg-slate-700/80 text-slate-400';
}

export default function TeamSchedule({ teamId, teamScope }) {
  const currentUserId = teamScope?.currentUserId;
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [form, setForm] = useState({
    event_type: 'practice',
    title: '',
    start_date: '',
    start_time: '',
    duration_minutes: 60,
    location: '',
    opponent: '',
    notes: '',
    recurring: false,
    recurring_freq: 'weekly',
    recurring_day: 'tuesday',
    recurring_rule: '',
  });

  const isCoach = teamScope?.effectiveRole === 'coach' || teamScope?.effectiveRole === 'assistant_coach';

  const { data: rawEvents = [], isLoading } = useQuery({
    queryKey: ['team-events', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const list = await base44.entities.TeamEvent.filter({ team_id: teamId }).list();
      return Array.isArray(list) ? list : [];
    },
    enabled: !!teamId,
  });

  const events = useMemo(() => {
    const sorted = [...rawEvents].sort((a, b) => {
      const da = a.start_date ? new Date(a.start_date + (a.start_time ? `T${a.start_time}` : '')).getTime() : 0;
      const db = b.start_date ? new Date(b.start_date + (b.start_time ? `T${b.start_time}` : '')).getTime() : 0;
      return da - db;
    });
    return sorted;
  }, [rawEvents]);

  const now = Date.now();
  const upcoming = useMemo(() => events.filter((e) => {
    const t = e.start_date ? new Date(e.start_date + (e.start_time ? `T${e.start_time}` : '')).getTime() : 0;
    return t >= now;
  }), [events, now]);
  const past = useMemo(() => events.filter((e) => {
    const t = e.start_date ? new Date(e.start_date + (e.start_time ? `T${e.start_time}` : '')).getTime() : 0;
    return t < now;
  }), [events, now]);

  const openCreate = () => {
    setEditingEvent(null);
    setForm({
      event_type: 'practice',
      title: 'Practice',
      start_date: '',
      start_time: '',
      duration_minutes: 60,
      location: '',
      opponent: '',
      notes: '',
      recurring: false,
      recurring_freq: 'weekly',
      recurring_day: 'tuesday',
      recurring_rule: '',
    });
    setModalOpen(true);
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    setForm({
      event_type: event.event_type || 'practice',
      title: event.title || '',
      start_date: event.start_date ? event.start_date.slice(0, 10) : '',
      start_time: event.start_time || '',
      duration_minutes: event.duration_minutes ?? 60,
      location: event.location || '',
      opponent: event.opponent || '',
      notes: event.notes || '',
      recurring: !!event.recurring_rule,
      recurring_freq: (event.recurring_rule && event.recurring_rule.startsWith('biweekly')) ? 'biweekly' : 'weekly',
      recurring_day: (event.recurring_rule && event.recurring_rule.includes(':')) ? event.recurring_rule.split(':')[1] : 'tuesday',
      recurring_rule: event.recurring_rule || '',
    });
    setModalOpen(true);
  };

  const updateForm = (updates) => {
    setForm((f) => {
      const next = { ...f, ...updates };
      if (updates.event_type !== undefined) {
        next.title = EVENT_TYPE_SUGGESTIONS[updates.event_type] ?? next.title;
      }
      if (next.recurring) {
        next.recurring_rule = `${next.recurring_freq}:${next.recurring_day}`;
      } else {
        next.recurring_rule = '';
      }
      return next;
    });
  };

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const created = await base44.entities.TeamEvent.create({
        team_id: teamId,
        ...payload,
        created_by: currentUserId,
      });
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-events', teamId] });
      setModalOpen(false);
      toast.success('Event created');
    },
    onError: (err) => toast.error(err?.message || 'Failed to create event'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => base44.entities.TeamEvent.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-events', teamId] });
      setModalOpen(false);
      setEditingEvent(null);
      toast.success('Event updated');
    },
    onError: (err) => toast.error(err?.message || 'Failed to update event'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-events', teamId] });
      setDeleteConfirmId(null);
      toast.success('Event deleted');
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete event'),
  });

  const handleSave = () => {
    const payload = {
      event_type: form.event_type,
      title: form.title,
      start_date: form.start_date || null,
      start_time: form.start_time || null,
      duration_minutes: form.duration_minutes,
      location: form.location || null,
      opponent: ['game', 'scrimmage'].includes(form.event_type) ? (form.opponent || null) : null,
      notes: form.notes || null,
      recurring_rule: form.recurring ? form.recurring_rule : null,
    };
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!teamId) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">Schedule</h2>
        {isCoach && (
          <Button
            type="button"
            onClick={openCreate}
            className="bg-amber-500 hover:bg-amber-400 text-black font-medium px-4 py-2 rounded-lg min-h-[44px] transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-slate-400">Loading events…</p>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-xl">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-slate-600" />
          <p className="text-slate-400">No events scheduled yet</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Upcoming</h3>
              <div className="space-y-3">
                {upcoming.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isCoach={isCoach}
                    onEdit={() => openEdit(event)}
                    onDelete={() => setDeleteConfirmId(event.id)}
                  />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Past</h3>
              <div className="space-y-3">
                {past.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isCoach={isCoach}
                    onEdit={() => openEdit(event)}
                    onDelete={() => setDeleteConfirmId(event.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Type</label>
              <select
                value={form.event_type}
                onChange={(e) => updateForm({ event_type: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
                placeholder="e.g. Practice"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => updateForm({ start_date: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Time</label>
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => updateForm({ start_time: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Duration (minutes)</label>
              <input
                type="number"
                min={15}
                value={form.duration_minutes}
                onChange={(e) => updateForm({ duration_minutes: Number(e.target.value) || 60 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => updateForm({ location: e.target.value })}
                placeholder="Optional"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            {['game', 'scrimmage'].includes(form.event_type) && (
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Opponent</label>
                <input
                  type="text"
                  value={form.opponent}
                  onChange={(e) => updateForm({ opponent: e.target.value })}
                  placeholder="Optional"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            )}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateForm({ notes: e.target.value })}
                placeholder="Optional"
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="recurring"
                checked={form.recurring}
                onChange={(e) => updateForm({ recurring: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
              />
              <label htmlFor="recurring" className="text-sm text-slate-300">Recurring</label>
            </div>
            {form.recurring && (
              <div className="flex gap-2 flex-wrap">
                <select
                  value={form.recurring_freq}
                  onChange={(e) => updateForm({ recurring_freq: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                </select>
                <select
                  value={form.recurring_day}
                  onChange={(e) => updateForm({ recurring_day: e.target.value })}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                  ))}
                </select>
                <span className="text-slate-400 text-sm self-center">→ stored as "{form.recurring_rule || `${form.recurring_freq}:${form.recurring_day}`}"</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-amber-500 hover:bg-amber-400 text-black" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingEvent ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete event?</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300 text-sm">This cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="border-slate-600 text-slate-300">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventCard({ event, isCoach, onEdit, onDelete }) {
  const Icon = getEventIcon(event.event_type);
  const badgeClass = getEventBadgeClass(event.event_type);
  const typeLabel = EVENT_TYPES.find((t) => t.value === event.event_type)?.label || event.event_type;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/50 transition-colors flex items-start justify-between gap-3">
      <div className="flex gap-3 min-w-0">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
          <Icon className="h-5 w-5 text-amber-500" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white">{event.title || typeLabel}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>{typeLabel}</span>
          </div>
          <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatEventDate(event.start_date, event.start_time)}
          </p>
          {event.location && (
            <p className="text-slate-400 text-sm flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5" />
              {event.location}
            </p>
          )}
          {event.opponent && (
            <p className="text-slate-400 text-sm mt-0.5">vs {event.opponent}</p>
          )}
          {event.recurring_rule && (
            <p className="text-slate-500 text-xs mt-1">Recurring: {event.recurring_rule}</p>
          )}
        </div>
      </div>
      {isCoach && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-amber-500 h-8 w-8 flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
            <DropdownMenuItem onClick={onEdit} className="text-slate-300 focus:bg-slate-700 focus:text-amber-500 cursor-pointer">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:bg-slate-700 focus:text-red-300 cursor-pointer">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
