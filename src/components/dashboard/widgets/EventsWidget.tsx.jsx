import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import EventEditor from '../EventEditor';

interface EventsWidgetProps {
  business: any;
  allowEdit: boolean;
  userRole: string;
}

export default function EventsWidget({ business, allowEdit, userRole }: EventsWidgetProps) {
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
    mutationFn: (eventData: any) => base44.entities.Event.create(eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events', business.id] });
      setShowEditor(false);
      setEditingEvent(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => base44.entities.Event.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events', business.id] });
      setShowEditor(false);
      setEditingEvent(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => base44.entities.Event.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-events', business.id] });
    }
  });

  const handleSave = (eventData: any) => {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: eventData });
    } else {
      createMutation.mutate(eventData);
    }
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    setShowEditor(true);
  };

  const handleDelete = (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteMutation.mutate(eventId);
    }
  };

  if (showEditor) {
    return (
      <EventEditor
        business={business}
        existingEvent={editingEvent}
        instructors={instructors}
        locations={locations}
        onSave={handleSave}
        onCancel={() => {
          setShowEditor(false);
          setEditingEvent(null);
        }}
      />
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Events</h2>
          <p className="text-sm text-slate-600">Manage your upcoming events</p>
        </div>
        {allowEdit && (
          <Button 
            onClick={() => setShowEditor(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-slate-500">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No events yet</p>
          {allowEdit && (
            <Button 
              variant="outline" 
              onClick={() => setShowEditor(true)}
              className="mt-4"
            >
              Create Your First Event
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900">{event.title}</h3>
                    {event.network && (
                      <Badge variant="outline" className="text-xs">
                        {event.network === 'recess' ? 'Recess' : 'TCA'}
                      </Badge>
                    )}
                    {event.boost_end_at && new Date(event.boost_end_at) > new Date() && (
                      <Badge className="bg-amber-500/10 text-amber-600 text-xs">Boosted</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{event.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(event.date), 'MMM d, yyyy • h:mm a')}
                    </span>
                    {event.price > 0 ? (
                      <span>${event.price}</span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">FREE</span>
                    )}
                  </div>
                </div>
                {allowEdit && (userRole === 'Owner' || userRole === 'Manager') && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleEdit(event)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleDelete(event.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
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