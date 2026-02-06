import { useState, useEffect, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';

export function useBusinessRevenue(businessId, dateRange = {}) {
  const [redemptions, setRedemptions] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { startDate, endDate } = useMemo(() => {
    if (dateRange.startDate && dateRange.endDate) {
      return dateRange;
    }
    const now = new Date();
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    };
  }, [dateRange.startDate, dateRange.endDate]);

  const fetchData = useCallback(async () => {
    if (!businessId) return;
    try {
      setIsLoading(true);

      const eventsForBusiness = await base44.entities.Event.filter(
        { business_id: businessId, is_active: true },
        '-date',
        500
      );
      const eventIds = (eventsForBusiness || []).map(e => e.id);
      if (eventIds.length === 0) {
        setRedemptions([]);
        setEvents(eventsForBusiness || []);
        setError(null);
        setIsLoading(false);
        return;
      }

      const allRsvps = await Promise.all(
        eventIds.map((id) => base44.entities.RSVP.filter({ event_id: id }))
      ).then((arrays) => arrays.flat());

      const filtered = allRsvps.filter((r) => {
        if (!r.checked_in) return false;
        const status = r.status || '';
        if (status !== 'redeemed' && status !== 'going') return false;
        const checkedAt = r.checked_in_at || r.updated_date;
        if (!checkedAt) return false;
        return checkedAt >= startDate && checkedAt <= endDate;
      });

      setRedemptions(filtered);
      setEvents(eventsForBusiness || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch revenue data:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const analytics = useMemo(() => {
    const totalRedemptions = redemptions.length;
    const totalCoinsRedeemed = redemptions.reduce((sum, r) => sum + (r.joy_coin_total || 0), 0);

    const redemptionsByEvent = {};
    redemptions.forEach((r) => {
      const key = r.event_id || 'unknown';
      if (!redemptionsByEvent[key]) {
        const event = events.find((e) => e.id === key);
        redemptionsByEvent[key] = {
          eventId: key,
          eventTitle: event?.title || 'Unknown Event',
          count: 0,
          coins: 0
        };
      }
      redemptionsByEvent[key].count += 1;
      redemptionsByEvent[key].coins += r.joy_coin_total || 0;
    });

    const redemptionsByDay = {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    redemptions.forEach((r) => {
      const date = new Date(r.checked_in_at || r.updated_date);
      const day = dayNames[date.getDay()];
      redemptionsByDay[day] = (redemptionsByDay[day] || 0) + 1;
    });

    const uniqueFamilies = new Set(redemptions.map((r) => r.user_id)).size;

    return {
      totalRedemptions,
      totalCoinsRedeemed,
      uniqueFamilies,
      redemptionsByEvent: Object.values(redemptionsByEvent).sort((a, b) => b.count - a.count),
      redemptionsByDay: dayNames.map((day) => ({
        day,
        count: redemptionsByDay[day] || 0
      })),
      // Estimated payout uses per-coin value from DEC-032
      // Actual calculation happens server-side via calculateRevenueShare.js
      // This is a client-side estimate for display (DEC-037)
      estimatedPerCoinValue: 2.5,
      estimatedPayout: totalCoinsRedeemed * 2.5
    };
  }, [redemptions, events]);

  return {
    ...analytics,
    isLoading,
    error,
    refresh: fetchData
  };
}
