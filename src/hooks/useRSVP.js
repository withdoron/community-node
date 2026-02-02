import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useRSVP(eventId, currentUser) {
  const queryClient = useQueryClient();
  const userId = currentUser?.id;

  // Fetch the current user's RSVP for this event
  const { data: userRSVP, isLoading: rsvpLoading } = useQuery({
    queryKey: ['user-rsvp', eventId, userId],
    queryFn: async () => {
      const rsvps = await base44.entities.RSVP.filter({
        event_id: eventId,
        user_id: userId,
        is_active: true
      });
      return rsvps[0] || null;
    },
    enabled: !!eventId && !!userId
  });

  // Fetch total attendee count for this event
  const { data: attendees = [], isLoading: attendeesLoading } = useQuery({
    queryKey: ['event-attendees', eventId],
    queryFn: async () => {
      return await base44.entities.RSVP.filter({
        event_id: eventId,
        is_active: true
      });
    },
    enabled: !!eventId
  });

  // RSVP "I'm Going"
  const rsvpGoing = useMutation({
    mutationFn: async () => {
      const existing = await base44.entities.RSVP.filter({
        event_id: eventId,
        user_id: userId
      });

      if (existing.length > 0) {
        await base44.entities.RSVP.update(existing[0].id, {
          status: 'going',
          is_active: true
        });
      } else {
        await base44.entities.RSVP.create({
          event_id: eventId,
          user_id: userId,
          user_name: currentUser.full_name || currentUser.email,
          status: 'going',
          is_active: true,
          created_date: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-rsvp', eventId, userId] });
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      queryClient.invalidateQueries({ queryKey: ['user-rsvps'] });
      queryClient.invalidateQueries({ queryKey: ['all-events-for-rsvp'] });
    }
  });

  // Cancel RSVP
  const rsvpCancel = useMutation({
    mutationFn: async () => {
      if (userRSVP) {
        await base44.entities.RSVP.update(userRSVP.id, {
          status: 'cancelled',
          is_active: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-rsvp', eventId, userId] });
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] });
      queryClient.invalidateQueries({ queryKey: ['user-rsvps'] });
      queryClient.invalidateQueries({ queryKey: ['all-events-for-rsvp'] });
    }
  });

  const isGoing = !!userRSVP;
  const attendeeCount = attendees.length;
  const attendeeNames = attendees
    .filter(a => a.user_id !== userId)
    .map(a => a.user_name)
    .slice(0, 3);

  return {
    isGoing,
    attendeeCount,
    attendeeNames,
    rsvpLoading,
    attendeesLoading,
    rsvpGoing,
    rsvpCancel
  };
}
