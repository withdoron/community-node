import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { sanitizeText } from '@/utils/sanitize';
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
  ChevronDown,
  ChevronUp,
  Check,
  X,
  HelpCircle,
  BookOpen,
  Flame,
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

const DURATION_DEFAULTS = {
  game: 40,
  scrimmage: 40,
  practice: 60,
  meeting: 30,
  social: 90,
};

const DUTY_TYPES = [
  { value: 'snack', label: 'Snack' },
  { value: 'water', label: 'Water' },
  { value: 'setup', label: 'Setup' },
  { value: 'cleanup', label: 'Cleanup' },
  { value: 'custom', label: 'Other' },
];

const RSVP_OPTIONS = [
  { value: 'yes', label: 'Going', icon: Check, cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'no', label: 'Can\'t go', icon: X, cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'maybe', label: 'Maybe', icon: HelpCircle, cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
];

function formatEventDate(dateStr, timeStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  if (timeStr) return `${day} at ${formatTime(timeStr)}`;
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
  if (type === 'game') return 'bg-primary/20 text-primary';
  if (type === 'practice') return 'bg-surface text-foreground-soft';
  return 'bg-surface/80 text-muted-foreground';
}

function parseRsvps(event) {
  if (!event.rsvps) return {};
  if (typeof event.rsvps === 'string') {
    try { return JSON.parse(event.rsvps); } catch { return {}; }
  }
  return event.rsvps;
}

function parseDuties(event) {
  if (!event.duties) return [];
  if (typeof event.duties === 'string') {
    try { return JSON.parse(event.duties); } catch { return []; }
  }
  return Array.isArray(event.duties) ? event.duties : [];
}

// ─── Auto-rotation: suggest next family for a duty ───
function suggestDutyAssignment(dutyType, allEvents, families) {
  if (families.length === 0) return null;
  // Find who was last assigned this duty type across all events
  const assignments = [];
  for (const ev of allEvents) {
    const duties = parseDuties(ev);
    for (const d of duties) {
      if (d.type === dutyType && d.member_id) {
        assignments.push({ member_id: d.member_id, date: ev.start_date || '' });
      }
    }
  }
  // Sort by date descending — most recent first
  assignments.sort((a, b) => b.date.localeCompare(a.date));
  // Find the family who went LEAST recently (or never)
  const lastAssigned = {};
  for (const a of assignments) {
    if (!lastAssigned[a.member_id]) lastAssigned[a.member_id] = a.date;
  }
  // Families who were never assigned come first, then oldest assignment
  const sorted = [...families].sort((a, b) => {
    const aDate = lastAssigned[a.id] || '';
    const bDate = lastAssigned[b.id] || '';
    return aDate.localeCompare(bDate);
  });
  return sorted[0] || null;
}

export default function TeamSchedule({ teamId, teamScope }) {
  const currentUserId = teamScope?.currentUserId;
  const members = teamScope?.members || [];
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [expandedEventId, setExpandedEventId] = useState(null);

  const defaultForm = (type = 'practice') => ({
    event_type: type,
    title: EVENT_TYPE_SUGGESTIONS[type] || '',
    start_date: '',
    start_time: '',
    duration_minutes: DURATION_DEFAULTS[type] || 60,
    location: '',
    opponent: '',
    notes: '',
    recurring: false,
    recurring_pattern: 'weekly',
    recurring_days: [],
    recurring_end_date: '',
    recurring_count: 8,
    duties: [],
  });
  const [form, setForm] = useState(defaultForm());

  const isCoach = teamScope?.effectiveRole === 'coach';

  // Families = parents + coaches for duty assignment
  const families = useMemo(() =>
    members.filter((m) => m.role === 'parent' || m.role === 'coach' || m.role === 'assistant_coach'),
    [members]
  );
  const players = useMemo(() => members.filter((m) => m.role === 'player'), [members]);

  const { data: rawEvents = [], isLoading } = useQuery({
    queryKey: ['team-events', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const list = await base44.entities.TeamEvent.filter({ team_id: teamId });
      return Array.isArray(list) ? list : [];
    },
    enabled: !!teamId,
  });

  // Player stats for readiness (game events only)
  const { data: teamPlayerStats = [] } = useQuery({
    queryKey: ['team-player-stats', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const list = await base44.entities.PlayerStats.filter({ team_id: teamId });
      return Array.isArray(list) ? list : [];
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });

  // Play count for readiness denominator
  const { data: teamPlays = [] } = useQuery({
    queryKey: ['plays', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const list = await base44.entities.Play.filter({ team_id: teamId });
      return Array.isArray(list) ? list : [];
    },
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
  });

  const gameDayPlayCount = useMemo(() => teamPlays.filter((p) => p.game_day && p.status === 'active').length, [teamPlays]);

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
  }).reverse(), [events, now]);

  const openCreate = () => {
    setEditingEvent(null);
    setForm(defaultForm());
    setModalOpen(true);
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    const rule = event.recurring_rule || '';
    const pattern = rule.startsWith('biweekly') ? 'biweekly' : 'weekly';
    const daysPart = rule.includes(':') ? rule.split(':')[1].trim() : '';
    const recurring_days = daysPart ? daysPart.split(',').map((s) => {
      const d = s.trim().slice(0, 3);
      return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
    }).filter(Boolean) : [];
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
      recurring_pattern: pattern,
      recurring_days,
      recurring_end_date: event.recurring_end_date ? event.recurring_end_date.slice(0, 10) : '',
      recurring_count: 8,
      duties: parseDuties(event),
    });
    setModalOpen(true);
  };

  const updateForm = (updates) => {
    setForm((f) => {
      const next = { ...f, ...updates };
      if (updates.event_type !== undefined) {
        next.title = EVENT_TYPE_SUGGESTIONS[updates.event_type] ?? next.title;
        next.duration_minutes = DURATION_DEFAULTS[updates.event_type] ?? next.duration_minutes;
      }
      return next;
    });
  };

  // ─── Duty management in form ───
  const addDuty = () => {
    setForm((f) => ({
      ...f,
      duties: [...f.duties, { type: 'snack', member_id: '', family_name: '', custom_label: '' }],
    }));
  };
  const updateDuty = (idx, updates) => {
    setForm((f) => {
      const duties = [...f.duties];
      duties[idx] = { ...duties[idx], ...updates };
      if (updates.member_id) {
        const m = families.find((fam) => fam.id === updates.member_id);
        duties[idx].family_name = m?.jersey_name || '';
      }
      return { ...f, duties };
    });
  };
  const removeDuty = (idx) => {
    setForm((f) => ({ ...f, duties: f.duties.filter((_, i) => i !== idx) }));
  };

  // ─── Mutations ───
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return base44.entities.TeamEvent.create({
        team_id: teamId,
        ...payload,
        created_by: currentUserId,
      });
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

  // RSVP mutation
  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, userId, response }) => {
      const event = rawEvents.find((e) => e.id === eventId);
      const current = parseRsvps(event);
      const updated = { ...current, [userId]: response };
      return base44.entities.TeamEvent.update(eventId, { rsvps: JSON.stringify(updated) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-events', teamId] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to update RSVP'),
  });

  const handleSave = async () => {
    const dutiesJson = form.duties.length > 0 ? JSON.stringify(form.duties) : null;
    const payload = {
      event_type: form.event_type,
      title: sanitizeText(form.title),
      start_date: form.start_date || null,
      start_time: form.start_time || null,
      duration_minutes: form.duration_minutes,
      location: sanitizeText(form.location) || null,
      opponent: ['game', 'scrimmage'].includes(form.event_type) ? (sanitizeText(form.opponent) || null) : null,
      notes: sanitizeText(form.notes) || null,
      duties: dutiesJson,
    };

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, ...payload });
      return;
    }

    // Handle recurring: create multiple instances
    if (form.recurring && form.start_date) {
      const count = form.recurring_count || 8;
      const interval = form.recurring_pattern === 'biweekly' ? 14 : 7;
      const startDate = new Date(form.start_date + 'T12:00:00');
      const endDate = form.recurring_end_date ? new Date(form.recurring_end_date + 'T23:59:59') : null;

      let created = 0;
      for (let i = 0; i < count; i++) {
        const d = new Date(startDate.getTime() + i * interval * 86400000);
        if (endDate && d > endDate) break;
        const dateStr = d.toISOString().split('T')[0];
        await base44.entities.TeamEvent.create({
          team_id: teamId,
          ...payload,
          start_date: dateStr,
          recurring_rule: `${form.recurring_pattern}:${(form.recurring_days || []).join(',')}`,
          created_by: currentUserId,
        });
        created++;
      }
      queryClient.invalidateQueries({ queryKey: ['team-events', teamId] });
      setModalOpen(false);
      toast.success(`${created} events created`);
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!teamId) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Schedule</h2>
        {isCoach && (
          <Button
            type="button"
            onClick={openCreate}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium px-4 py-2 rounded-lg min-h-[44px] transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No events scheduled yet.</p>
          {isCoach
            ? <p className="text-muted-foreground text-sm mt-1">Tap "Add Event" to schedule a practice or game.</p>
            : <p className="text-muted-foreground text-sm mt-1">Your coach will add practices and games here.</p>
          }
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</h3>
              <div className="space-y-3">
                {upcoming.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isCoach={isCoach}
                    currentUserId={currentUserId}
                    members={members}
                    families={families}
                    players={players}
                    allEvents={rawEvents}
                    teamPlayerStats={teamPlayerStats}
                    gameDayPlayCount={gameDayPlayCount}
                    expanded={expandedEventId === event.id}
                    onToggle={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                    onEdit={() => openEdit(event)}
                    onDelete={() => setDeleteConfirmId(event.id)}
                    onRsvp={(response) => rsvpMutation.mutate({ eventId: event.id, userId: currentUserId, response })}
                  />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Past</h3>
              <div className="space-y-3">
                {past.slice(0, 5).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isCoach={isCoach}
                    currentUserId={currentUserId}
                    members={members}
                    families={families}
                    players={players}
                    allEvents={rawEvents}
                    teamPlayerStats={teamPlayerStats}
                    gameDayPlayCount={gameDayPlayCount}
                    expanded={expandedEventId === event.id}
                    onToggle={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                    onEdit={() => openEdit(event)}
                    onDelete={() => setDeleteConfirmId(event.id)}
                    onRsvp={(response) => rsvpMutation.mutate({ eventId: event.id, userId: currentUserId, response })}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* ─── Create/Edit Modal ─── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-secondary border-border text-foreground max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* ─── Event Type + Title ─── */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((t) => {
                  const TypeIcon = t.icon;
                  const isActive = form.event_type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => updateForm({ event_type: t.value })}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-foreground-soft hover:border-primary/30'
                      }`}
                    >
                      <TypeIcon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                  placeholder="e.g. Practice"
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            {/* ─── Date, Time, Duration ─── */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">When</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-foreground-soft text-sm block mb-1">Date</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => updateForm({ start_date: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none [color-scheme:dark] min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-foreground-soft text-sm block mb-1">Time</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => updateForm({ start_time: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none [color-scheme:dark] min-h-[44px]"
                  />
                </div>
              </div>
              <div>
                <label className="text-foreground-soft text-sm block mb-1">Duration</label>
                <select
                  value={form.duration_minutes}
                  onChange={(e) => updateForm({ duration_minutes: Number(e.target.value) })}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none min-h-[44px]"
                >
                  <option value={30}>30 minutes</option>
                  <option value={40}>40 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>

            {/* ─── Location + Opponent + Notes ─── */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Details</p>
              <div>
                <label className="text-foreground-soft text-sm block mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => updateForm({ location: e.target.value })}
                  placeholder="Field, park, gym..."
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none min-h-[44px]"
                />
              </div>
              {['game', 'scrimmage'].includes(form.event_type) && (
                <div>
                  <label className="text-foreground-soft text-sm block mb-1">Opponent</label>
                  <input
                    type="text"
                    value={form.opponent}
                    onChange={(e) => updateForm({ opponent: e.target.value })}
                    placeholder="Team name"
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none min-h-[44px]"
                  />
                </div>
              )}
              <div>
                <label className="text-foreground-soft text-sm block mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm({ notes: e.target.value })}
                  placeholder="Wear white jerseys, bring water, etc."
                  rows={2}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* ─── Duties ─── */}
            {isCoach && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Duties</label>
                  <button
                    type="button"
                    onClick={addDuty}
                    className="text-xs text-primary hover:text-primary-hover transition-colors"
                  >
                    + Add duty
                  </button>
                </div>
                {form.duties.map((duty, idx) => {
                  const suggestion = suggestDutyAssignment(duty.type, rawEvents, families);
                  return (
                    <div key={idx} className="flex gap-2 mb-2 items-start">
                      <select
                        value={duty.type}
                        onChange={(e) => updateDuty(idx, { type: e.target.value })}
                        className="bg-card border border-border rounded-lg px-2 py-1.5 text-foreground text-sm min-h-[40px] w-28"
                      >
                        {DUTY_TYPES.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                      <div className="flex-1">
                        <select
                          value={duty.member_id}
                          onChange={(e) => updateDuty(idx, { member_id: e.target.value })}
                          className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-foreground text-sm min-h-[40px]"
                        >
                          <option value="">Assign to...</option>
                          {families.map((f) => (
                            <option key={f.id} value={f.id}>{f.jersey_name || 'Member'}</option>
                          ))}
                        </select>
                        {!duty.member_id && suggestion && (
                          <button
                            type="button"
                            onClick={() => updateDuty(idx, { member_id: suggestion.id })}
                            className="text-xs text-primary/70 hover:text-primary mt-1 transition-colors"
                          >
                            Suggest: {suggestion.jersey_name || 'Next in rotation'}
                          </button>
                        )}
                      </div>
                      {duty.type === 'custom' && (
                        <input
                          type="text"
                          value={duty.custom_label || ''}
                          onChange={(e) => updateDuty(idx, { custom_label: e.target.value })}
                          placeholder="Label"
                          className="bg-card border border-border rounded-lg px-2 py-1.5 text-foreground text-sm min-h-[40px] w-24"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeDuty(idx)}
                        className="text-muted-foreground hover:text-red-400 p-1.5 transition-colors min-h-[40px] flex items-center"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─── Recurring ─── */}
            {!editingEvent && (
              <>
                <div
                  onClick={() => updateForm({ recurring: !form.recurring })}
                  className="flex items-center justify-between p-4 bg-secondary/50 border border-border rounded-xl transition-colors hover:border-primary/50 cursor-pointer"
                >
                  <div className="flex-1">
                    <p className="text-foreground font-medium">This event repeats</p>
                    <p className="text-muted-foreground text-sm">Create multiple instances on a schedule</p>
                  </div>
                  <div className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.recurring ? 'bg-primary' : 'bg-surface'}`}>
                    <div className={`w-5 h-5 bg-slate-100 rounded-full absolute top-0.5 transition-transform ${form.recurring ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>
                {form.recurring && (
                  <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                    <div>
                      <label className="text-foreground-soft text-sm block mb-1">Frequency</label>
                      <select
                        value={form.recurring_pattern}
                        onChange={(e) => updateForm({ recurring_pattern: e.target.value })}
                        className="w-full bg-card border border-border text-foreground rounded-lg px-3 py-2 min-h-[44px] focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                      >
                        <option value="weekly">Every week</option>
                        <option value="biweekly">Every 2 weeks</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-foreground-soft text-sm block mb-2">Repeats on</label>
                      <div className="flex flex-wrap gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const currentDays = form.recurring_days || [];
                              const days = currentDays.includes(day)
                                ? currentDays.filter((d) => d !== day)
                                : [...currentDays, day];
                              updateForm({ recurring_days: days });
                            }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                              (form.recurring_days || []).includes(day)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card border border-border text-foreground-soft hover:border-primary/30'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-foreground-soft text-sm block mb-1">How many</label>
                        <input
                          type="number"
                          min={2}
                          max={20}
                          value={form.recurring_count}
                          onChange={(e) => updateForm({ recurring_count: Number(e.target.value) || 8 })}
                          className="w-full bg-card border border-border text-foreground rounded-lg px-3 py-2 min-h-[44px] focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-foreground-soft text-sm block mb-1">Ends on</label>
                        <input
                          type="date"
                          value={form.recurring_end_date || ''}
                          onChange={(e) => updateForm({ recurring_end_date: e.target.value })}
                          className="w-full bg-secondary border border-border text-foreground rounded-lg px-3 py-2 [color-scheme:dark] min-h-[44px] focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground bg-card border border-border rounded-lg p-3">
                      {form.recurring_count} {form.event_type === 'game' ? 'games' : 'events'} will be created{form.recurring_pattern === 'biweekly' ? ' every 2 weeks' : ' weekly'} starting {form.start_date || 'from the date above'}.{form.recurring_end_date ? ` Ends ${form.recurring_end_date}.` : ''} Each occurrence is a separate event you can edit or cancel individually.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="border-border text-foreground-soft hover:bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary-hover text-primary-foreground" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingEvent ? 'Save' : form.recurring ? `Create ${form.recurring_count} events` : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-secondary border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete event?</DialogTitle>
          </DialogHeader>
          <p className="text-foreground-soft text-sm">This cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="border-border text-foreground-soft hover:bg-transparent">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)} disabled={deleteMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  EventCard — expandable card with RSVP, duties, readiness
// ═══════════════════════════════════════════════════

function EventCard({
  event, isCoach, currentUserId, members, families, players, allEvents,
  teamPlayerStats, gameDayPlayCount,
  expanded, onToggle, onEdit, onDelete, onRsvp,
}) {
  const Icon = getEventIcon(event.event_type);
  const badgeClass = getEventBadgeClass(event.event_type);
  const typeLabel = EVENT_TYPES.find((t) => t.value === event.event_type)?.label || event.event_type;
  const rsvps = parseRsvps(event);
  const duties = parseDuties(event);
  const myRsvp = currentUserId ? rsvps[currentUserId] : null;
  const isGame = event.event_type === 'game' || event.event_type === 'scrimmage';

  // RSVP counts
  const yesCount = Object.values(rsvps).filter((v) => v === 'yes').length;
  const noCount = Object.values(rsvps).filter((v) => v === 'no').length;
  const totalMembers = members.length;

  // My duties
  const myDuties = duties.filter((d) => {
    const m = families.find((f) => f.id === d.member_id);
    return m?.user_id === currentUserId;
  });

  // Member name lookup
  const memberName = useCallback((userId) => {
    const m = members.find((mem) => mem.user_id === userId);
    return m?.jersey_name || m?.name || 'Member';
  }, [members]);

  // Stats lookup for readiness
  const statsMap = useMemo(() => {
    const map = {};
    teamPlayerStats.forEach((s) => { if (s.user_id) map[s.user_id] = s; });
    return map;
  }, [teamPlayerStats]);

  return (
    <div className="bg-secondary border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 flex items-start justify-between gap-3 text-left"
      >
        <div className="flex gap-3 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">{event.title || typeLabel}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass}`}>{typeLabel}</span>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatEventDate(event.start_date, event.start_time)}
            </p>
            {event.location && (
              <p className="text-muted-foreground text-sm flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                {event.location}
              </p>
            )}
            {event.opponent && (
              <p className="text-muted-foreground text-sm mt-0.5">vs {event.opponent}</p>
            )}
            {/* Inline status row */}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {yesCount > 0 && (
                <span className="text-xs text-muted-foreground">{yesCount} confirmed</span>
              )}
              {myDuties.length > 0 && (
                <span className="text-xs text-primary font-medium">
                  {myDuties.map((d) => d.type === 'custom' ? (d.custom_label || 'Duty') : DUTY_TYPES.find((dt) => dt.value === d.type)?.label || d.type).join(', ')} duty
                </span>
              )}
              {!myRsvp && (
                <span className="text-xs text-muted-foreground/70">RSVP needed</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isCoach && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span
                  role="button"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-primary p-1"
                >
                  <MoreVertical className="h-4 w-4" />
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-secondary border-border">
                <DropdownMenuItem onClick={onEdit} className="text-foreground-soft focus:bg-surface focus:text-primary cursor-pointer">
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:bg-surface focus:text-red-300 cursor-pointer">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {/* RSVP section */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Your response</p>
            <div className="flex gap-2">
              {RSVP_OPTIONS.map((opt) => {
                const RsvpIcon = opt.icon;
                const isActive = myRsvp === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onRsvp(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors min-h-[44px] ${
                      isActive ? opt.cls : 'border-border text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    <RsvpIcon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {yesCount} going{noCount > 0 ? `, ${noCount} can't` : ''}{totalMembers - yesCount - noCount > 0 ? `, ${totalMembers - yesCount - noCount} no response` : ''}
            </p>
          </div>

          {/* Duties section */}
          {duties.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Duties</p>
              <div className="space-y-1">
                {duties.map((duty, i) => {
                  const label = duty.type === 'custom' ? (duty.custom_label || 'Other') : (DUTY_TYPES.find((dt) => dt.value === duty.type)?.label || duty.type);
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-foreground-soft font-medium w-16">{label}:</span>
                      <span className="text-foreground">{duty.family_name || 'Unassigned'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
              <p className="text-foreground-soft text-sm">{event.notes}</p>
            </div>
          )}

          {/* Readiness — games only, coach view */}
          {isGame && isCoach && gameDayPlayCount > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Team Readiness</p>
              <div className="space-y-1.5">
                {players
                  .filter((p) => rsvps[p.user_id] === 'yes' || !rsvps[p.user_id])
                  .map((p) => {
                    const stats = statsMap[p.user_id];
                    const mastered = stats?.plays_mastered || 0;
                    const pct = gameDayPlayCount > 0 ? Math.round((mastered / gameDayPlayCount) * 100) : 0;
                    const rsvpStatus = rsvps[p.user_id];
                    return (
                      <div key={p.id} className="flex items-center gap-2 text-sm">
                        <span className="text-foreground flex-1 truncate">{p.jersey_name || 'Player'}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-16 h-1.5 bg-surface rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                            {mastered}/{gameDayPlayCount}
                          </span>
                          {rsvpStatus === 'yes' && <Check className="h-3 w-3 text-green-400" />}
                          {rsvpStatus === 'no' && <X className="h-3 w-3 text-red-400" />}
                          {!rsvpStatus && <span className="text-xs text-muted-foreground/50">--</span>}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
