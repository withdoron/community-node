import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfig } from '@/hooks/useConfig';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Plus, Pencil, Trash2, PlusCircle, MoreHorizontal, Copy, ExternalLink, XCircle, UserCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, addWeeks, addDays, addMonths } from "date-fns";
import { toast } from "sonner";
import EventEditor from '../EventEditor';

export default function EventsWidget({ business, allowEdit, userRole, onEnterCheckIn }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [selectedEventForAction, setSelectedEventForAction] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const queryClient = useQueryClient();
  const { data: networksConfig = [] } = useConfig('platform', 'networks');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['business-events', business.id],
    queryFn: () => base44.entities.Event.filter({ business_id: business.id, is_active: true }, '-date', 50)
  });

  const { data: eventRsvpCounts = {} } = useQuery({
    queryKey: ['event-rsvp-counts', business.id, events.map((e) => e.id).join(',')],
    queryFn: async () => {
      const counts = {};
      await Promise.all(
        events.map(async (e) => {
          const list = await base44.entities.RSVP.filter({ event_id: e.id, is_active: true });
          counts[e.id] = list.length;
        })
      );
      return counts;
    },
    enabled: events.length > 0,
  });

  const { data: instructors = [] } = useQuery({
    queryKey: ['business-instructors', business.id],
    queryFn: async () => {
      if (!business.instructors?.length) return [];
      const users = await Promise.all(
        business.instructors.map(id => base44.entities.User.filter({ id }, '', 1))
      );
      return users.flat();
    },
    enabled: !!business.instructors?.length
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['business-locations', business.id],
    queryFn: () => base44.entities.Location.filter({ business_id: business.id, is_active: true }, '-created_date', 50)
  });

  const sortedEvents = useMemo(() => {
    const list = [...events];
    const getDate = (e) => new Date(e.date || e.start_date || 0).getTime();
    list.sort((a, b) => sortOrder === 'asc' ? getDate(a) - getDate(b) : getDate(b) - getDate(a));
    return list;
  }, [events, sortOrder]);

  // NOTE: Recurring instances are only generated on NEW event creation.
  // Editing an existing event to add recurrence does not generate instances.
  // To create a recurring series, create a new event with recurrence enabled.

  // Generate recurring event instances for all patterns: daily, weekly, biweekly, monthly
  const generateRecurringEvents = async (eventData) => {
    const pattern = eventData.recurrence_pattern;
    const startDate = new Date(eventData.date);
    const durationMs = (eventData.duration_minutes || 60) * 60 * 1000;
    const seriesId = `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Instance caps to prevent runaway creation
    const MAX_INSTANCES = { daily: 365, weekly: 52, biweekly: 52, monthly: 24 };
    const maxInstances = MAX_INSTANCES[pattern] || 52;

    // Default end dates when none specified
    const defaultEnd = {
      daily: addWeeks(startDate, 4),
      weekly: addWeeks(startDate, 12),
      biweekly: addWeeks(startDate, 24),
      monthly: addMonths(startDate, 12),
    };
    const endDate = eventData.recurrence_end_date
      ? new Date(eventData.recurrence_end_date)
      : defaultEnd[pattern] || addWeeks(startDate, 12);

    // Build array of event dates based on pattern
    const dates = [];

    if (pattern === 'daily') {
      let current = new Date(startDate);
      while (current <= endDate && dates.length < maxInstances) {
        dates.push(new Date(current));
        current = addDays(current, 1);
      }
    } else if (pattern === 'weekly' || pattern === 'biweekly') {
      const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
      const selectedDays = (eventData.recurrence_days || [])
        .map((d) => dayMap[d])
        .filter((n) => n !== undefined)
        .sort((a, b) => a - b);

      // If no days selected for weekly/biweekly, use the start date's day
      if (selectedDays.length === 0) {
        selectedDays.push(startDate.getDay());
      }

      let weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStep = pattern === 'biweekly' ? 2 : 1;

      while (weekStart <= endDate && dates.length < maxInstances) {
        for (const dayNum of selectedDays) {
          const d = new Date(weekStart);
          d.setDate(weekStart.getDate() + dayNum);
          if (d >= startDate && d <= endDate && dates.length < maxInstances) {
            dates.push(d);
          }
        }
        weekStart = addWeeks(weekStart, weekStep);
      }
    } else if (pattern === 'monthly') {
      let current = new Date(startDate);
      while (current <= endDate && dates.length < maxInstances) {
        dates.push(new Date(current));
        current = addMonths(current, 1);
        // Handle end-of-month edge cases (Jan 31 → Feb 28)
        // addMonths from date-fns handles this automatically
      }
    }

    if (dates.length === 0) {
      // Fallback: create a single event
      return base44.functions.invoke('manageEvent', {
        action: 'create',
        business_id: business.id,
        data: eventData,
      });
    }

    // Create each instance through the manageEvent server function
    let created = 0;
    for (const eventDate of dates) {
      eventDate.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
      const instanceEnd = new Date(eventDate.getTime() + durationMs);

      const eventPayload = {
        ...eventData,
        date: eventDate.toISOString(),
        end_date: instanceEnd.toISOString(),
        recurring_series_id: seriesId,
      };
      try {
        await base44.functions.invoke('manageEvent', {
          action: 'create',
          business_id: business.id,
          data: eventPayload,
        });
        created++;
      } catch (err) {
        console.error('[EventsWidget] Recurring event failed:', err);
      }
    }

    toast.success(`Created ${created} recurring event${created !== 1 ? 's' : ''}`);
    return null; // success handled by invalidation
  };

  const createMutation = useMutation({
    mutationFn: async (eventData) => {
      if (eventData.is_recurring && eventData.recurrence_pattern) {
        await generateRecurringEvents(eventData);
        return {};
      }
      return base44.functions.invoke('manageEvent', {
        action: 'create',
        business_id: business.id,
        data: eventData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events', business.id] });
      setEditorOpen(false);
      setEditingEvent(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) =>
      base44.functions.invoke('manageEvent', {
        action: 'update',
        event_id: id,
        business_id: business.id,
        data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events', business.id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setEditorOpen(false);
      setEditingEvent(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      base44.functions.invoke('manageEvent', {
        action: 'delete',
        event_id: id,
        business_id: business.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events', business.id] });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id) =>
      base44.functions.invoke('manageEvent', {
        action: 'cancel',
        event_id: id,
        business_id: business.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events', business.id] });
      setCancelConfirmOpen(false);
      setSelectedEventForAction(null);
    }
  });

  const handleSave = (eventData) => {
    if (editingEvent?.id || eventData?.event_id) {
      const eventId = eventData?.event_id ?? editingEvent?.id;
      const { event_id: _omit, ...data } = eventData;
      return updateMutation.mutateAsync({ id: eventId, data });
    }
    return createMutation.mutateAsync(eventData);
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    setEditorOpen(true);
  };

  const handleEditEvent = async (event) => {
    try {
      const full = await base44.entities.Event.get(event.id);
      setEditingEvent(full ?? event);
    } catch {
      setEditingEvent(event);
    }
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditingEvent(null);
  };

  const handleDelete = (eventId) => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteMutation.mutate(eventId);
    }
  };

  const handleDuplicate = (event) => {
    const duplicatedEvent = {
      ...event,
      id: undefined,
      title: `${event.title} (Copy)`,
      status: undefined,
      created_date: undefined,
    };
    setEditingEvent(duplicatedEvent);
    setEditorOpen(true);
  };

  const handleViewOnLocalLane = (event) => {
    window.location.href = '/Events';
  };

  const handleCancelEvent = (event) => {
    setSelectedEventForAction(event);
    setCancelConfirmOpen(true);
  };

  const handleDeleteEvent = (event) => {
    setSelectedEventForAction(event);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (selectedEventForAction) {
      deleteMutation.mutate(selectedEventForAction.id);
      setDeleteConfirmOpen(false);
      setSelectedEventForAction(null);
    }
  };

  const confirmCancel = () => {
    if (selectedEventForAction) {
      cancelMutation.mutate(selectedEventForAction.id);
    }
  };

  return (
    <>
    <Card className="p-6 bg-card border-border">
      <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Events</h2>
          <p className="text-sm text-muted-foreground">Manage your upcoming events</p>
        </div>
        {allowEdit && (
          <Button 
            onClick={handleAddEvent}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading events...</p>
      ) : events.length === 0 ? (
        <div 
          className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-12 text-center cursor-pointer transition-all group"
          onClick={allowEdit ? handleAddEvent : undefined}
        >
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <PlusCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Schedule your first event</h3>
            <p className="text-sm text-muted-foreground mb-4">Create classes, workshops, or gatherings for your community</p>
            {allowEdit && (
              <Button 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddEvent();
                }}
                className="bg-secondary border-border text-foreground hover:border-primary hover:text-primary-hover"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEvents.map((event) => (
            <div key={event.id} className="border border-border rounded-lg p-4 bg-secondary hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{event.title}</h3>
                    {event.network && (
                      <Badge variant="outline" className="text-xs border-border text-foreground-soft">
                        {(() => {
                          const matched = Array.isArray(networksConfig) && networksConfig.find((n) => n.value === event.network);
                          return matched?.label ?? (event.network && event.network.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())) ?? '';
                        })()}
                      </Badge>
                    )}
                    {event.boost_end_at && new Date(event.boost_end_at) > new Date() && (
                      <Badge className="bg-primary/10 text-primary text-xs border-primary/30">Boosted</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground/70">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(event.date), 'MMM d, yyyy • h:mm a')}
                    </span>
                    {(eventRsvpCounts[event.id] ?? 0) >= 0 && (
                      <span>
                        — {eventRsvpCounts[event.id] === 0 ? 'No RSVPs yet' : `${eventRsvpCounts[event.id]} RSVP${eventRsvpCounts[event.id] !== 1 ? 's' : ''}`}
                      </span>
                    )}
                    {event.pricing_type === 'free' ? (
                      <span className="text-emerald-400 font-semibold">FREE</span>
                    ) : (
                      <span>${Number(event.price) || 0}</span>
                    )}
                  </div>
                </div>
                {allowEdit && ['owner', 'manager'].includes(userRole?.toLowerCase()) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-surface">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-secondary border-border min-w-[160px]">
                      <DropdownMenuItem
                        onClick={() => handleEditEvent(event)}
                        className="text-foreground focus:bg-surface focus:text-foreground cursor-pointer"
                      >
                        <Pencil className="h-4 w-4 mr-2 text-muted-foreground" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(event)}
                        className="text-foreground focus:bg-surface focus:text-foreground cursor-pointer"
                      >
                        <Copy className="h-4 w-4 mr-2 text-muted-foreground" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleViewOnLocalLane(event)}
                        className="text-foreground focus:bg-surface focus:text-foreground cursor-pointer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2 text-muted-foreground" />
                        View on Local Lane
                      </DropdownMenuItem>
                      {onEnterCheckIn && new Date(event.date || event.start_date) >= new Date() && (
                        <DropdownMenuItem
                          onClick={() => onEnterCheckIn(event)}
                          className="text-emerald-400 focus:bg-surface focus:text-emerald-300 cursor-pointer"
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Check-In Mode
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-surface" />
                      <DropdownMenuItem
                        onClick={() => handleCancelEvent(event)}
                        className="text-orange-500 focus:bg-surface focus:text-orange-400 cursor-pointer"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Event
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteEvent(event)}
                        className="text-red-500 focus:bg-surface focus:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>

    <Dialog open={editorOpen} onOpenChange={(open) => { setEditorOpen(open); if (!open) setEditingEvent(null); }}>
      <DialogContent className="w-[calc(100vw-32px)] sm:w-auto max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {editingEvent ? 'Edit Event' : 'Create Event'}
          </DialogTitle>
        </DialogHeader>
        <EventEditor
          business={business}
          existingEvent={editingEvent}
          onSave={handleSave}
          onCancel={handleEditorClose}
          instructors={instructors}
          locations={locations}
        />
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Delete Event</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Are you sure you want to delete &quot;{selectedEventForAction?.title}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-secondary border-border text-foreground-soft hover:bg-surface hover:text-foreground">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDelete}
            className="bg-red-500 hover:bg-red-400 text-foreground font-semibold"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Cancel Event Confirmation Dialog */}
    <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Cancel Event</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Are you sure you want to cancel &quot;{selectedEventForAction?.title}&quot;? This will mark the event as cancelled and hide it from listings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-secondary border-border text-foreground-soft hover:bg-surface hover:text-foreground">
            Go Back
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmCancel}
            className="bg-orange-500 hover:bg-orange-400 text-foreground font-semibold"
          >
            Cancel Event
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}