import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Pencil, Trash2, PlusCircle } from "lucide-react";
import { format } from "date-fns";

export default function EventsWidget({ business, allowEdit, userRole }) {
  const [showEditor, setShowEditor] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
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
      setShowEditor(false);
      setEditingEvent(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events', business.id] });
      setShowEditor(false);
      setEditingEvent(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Event.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events', business.id] });
    }
  });

  const handleSave = (eventData) => {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: eventData });
    } else {
      createMutation.mutate(eventData);
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowEditor(true);
  };

  const handleDelete = (eventId) => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteMutation.mutate(eventId);
    }
  };

  if (showEditor) {
    return (
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {editingEvent ? 'Edit Event' : 'Create New Event'}
          </h2>
          <p className="text-sm text-slate-600">Event editor coming soon</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            setShowEditor(false);
            setEditingEvent(null);
          }}
        >
          Back to Events
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-slate-900 border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Events</h2>
          <p className="text-sm text-slate-400">Manage your upcoming events</p>
        </div>
        {allowEdit && (
          <Button 
            onClick={() => setShowEditor(true)}
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
          onClick={allowEdit ? () => setShowEditor(true) : undefined}
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
                  setShowEditor(true);
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
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleEdit(event)}
                      className="text-slate-400 hover:text-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleDelete(event.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}