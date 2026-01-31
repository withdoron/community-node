import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Plus, Pencil, Trash2, PlusCircle, MoreHorizontal, Copy, ExternalLink, XCircle } from "lucide-react";
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
import { format } from "date-fns";
import EventEditor from '../EventEditor';

export default function EventsWidget({ business, allowEdit, userRole }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [selectedEventForAction, setSelectedEventForAction] = useState(null);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['business-events', business.id],
    queryFn: () => base44.entities.Event.filter({ business_id: business.id, is_active: true }, '-date', 50)
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

  const createMutation = useMutation({
    mutationFn: (eventData) => base44.entities.Event.create(eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events', business.id] });
      setEditorOpen(false);
      setEditingEvent(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events', business.id] });
      setEditorOpen(false);
      setEditingEvent(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events', business.id] });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.update(id, { status: 'cancelled', is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events', business.id] });
      setCancelConfirmOpen(false);
      setSelectedEventForAction(null);
    }
  });

  const handleSave = (eventData) => {
    if (editingEvent?.id) {
      return updateMutation.mutateAsync({ id: editingEvent.id, data: eventData });
    }
    return createMutation.mutateAsync(eventData);
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    setEditorOpen(true);
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
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
    window.open(`/Events/${event.id}`, '_blank');
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
    <Card className="p-6 bg-slate-900 border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Events</h2>
          <p className="text-sm text-slate-400">Manage your upcoming events</p>
        </div>
        {allowEdit && (
          <Button 
            onClick={handleAddEvent}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-slate-400">Loading events...</p>
      ) : events.length === 0 ? (
        <div 
          className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-lg p-12 text-center cursor-pointer transition-all group"
          onClick={allowEdit ? handleAddEvent : undefined}
        >
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
              <PlusCircle className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Schedule your first event</h3>
            <p className="text-sm text-slate-400 mb-4">Create classes, workshops, or gatherings for your community</p>
            {allowEdit && (
              <Button 
                variant="outline" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddEvent();
                }}
                className="bg-slate-800 border-slate-700 text-slate-200 hover:border-amber-500 hover:text-amber-400"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="border border-slate-700 rounded-lg p-4 bg-slate-800 hover:border-amber-500/30 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-100">{event.title}</h3>
                    {event.network && (
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                        {event.network === 'recess' ? 'Recess' : 'TCA'}
                      </Badge>
                    )}
                    {event.boost_end_at && new Date(event.boost_end_at) > new Date() && (
                      <Badge className="bg-amber-500/10 text-amber-500 text-xs border-amber-500/30">Boosted</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{event.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(event.date), 'MMM d, yyyy • h:mm a')}
                    </span>
                    {event.price > 0 ? (
                      <span>${event.price}</span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">FREE</span>
                    )}
                  </div>
                </div>
                {allowEdit && (userRole === 'Owner' || userRole === 'Manager') && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-slate-400 hover:text-slate-100 hover:bg-slate-700">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 min-w-[160px]">
                      <DropdownMenuItem
                        onClick={() => handleEditEvent(event)}
                        className="text-slate-200 focus:bg-slate-700 focus:text-white cursor-pointer"
                      >
                        <Pencil className="h-4 w-4 mr-2 text-slate-400" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(event)}
                        className="text-slate-200 focus:bg-slate-700 focus:text-white cursor-pointer"
                      >
                        <Copy className="h-4 w-4 mr-2 text-slate-400" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleViewOnLocalLane(event)}
                        className="text-slate-200 focus:bg-slate-700 focus:text-white cursor-pointer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2 text-slate-400" />
                        View on Local Lane
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem
                        onClick={() => handleCancelEvent(event)}
                        className="text-orange-500 focus:bg-slate-700 focus:text-orange-400 cursor-pointer"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Event
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteEvent(event)}
                        className="text-red-500 focus:bg-slate-700 focus:text-red-400 cursor-pointer"
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">
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
      <AlertDialogContent className="bg-slate-900 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Delete Event</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Are you sure you want to delete &quot;{selectedEventForAction?.title}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDelete}
            className="bg-red-500 hover:bg-red-400 text-white font-semibold"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Cancel Event Confirmation Dialog */}
    <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
      <AlertDialogContent className="bg-slate-900 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Cancel Event</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Are you sure you want to cancel &quot;{selectedEventForAction?.title}&quot;? This will mark the event as cancelled and hide it from listings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
            Go Back
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmCancel}
            className="bg-orange-500 hover:bg-orange-400 text-white font-semibold"
          >
            Cancel Event
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}