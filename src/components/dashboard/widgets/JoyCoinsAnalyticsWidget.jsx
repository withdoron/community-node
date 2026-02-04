import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Coins, Users, TrendingUp, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function StatCard({ icon: Icon, label, value, subValue, color = 'text-amber-500' }) {
  return (
    <div className="p-4 bg-slate-800/50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
    </div>
  );
}

function RecentRedemptionRow({ rsvp, event }) {
  const date = rsvp.checked_in_at ? new Date(rsvp.checked_in_at) : null;

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <div>
        <p className="text-sm text-slate-200">{rsvp.user_name}</p>
        <p className="text-xs text-slate-500">{event?.title || 'Event'}</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-amber-500">+{rsvp.joy_coin_total || 0} coins</p>
        {date && (
          <p className="text-xs text-slate-500">
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  );
}

export function JoyCoinsAnalyticsWidget({ business }) {
  const businessId = business?.id;

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['businessJoyEvents', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const records = await base44.entities.Event.filter({
        business_id: businessId,
        joy_coin_enabled: true,
        is_active: true
      });
      return records;
    },
    enabled: !!businessId
  });

  const eventIds = events.map((e) => e.id);

  const { data: rsvps = [], isLoading: rsvpsLoading } = useQuery({
    queryKey: ['businessJoyRsvps', businessId, eventIds],
    queryFn: async () => {
      if (!businessId || events.length === 0) return [];

      const allRsvps = await Promise.all(
        events.map((event) =>
          base44.entities.RSVP.filter({ event_id: event.id, is_active: true })
        )
      );
      return allRsvps.flat();
    },
    enabled: !!businessId && events.length > 0
  });

  const stats = useMemo(() => {
    const checkedIn = rsvps.filter((r) => r.checked_in);
    const totalRedemptions = checkedIn.reduce((sum, r) => sum + (r.joy_coin_total || 0), 0);
    const totalExpected = rsvps.reduce((sum, r) => sum + (r.joy_coin_total || 0), 0);
    const totalAttendees = checkedIn.reduce((sum, r) => sum + (r.party_size || 1), 0);
    const totalRsvps = rsvps.reduce((sum, r) => sum + (r.party_size || 1), 0);

    const attendanceRate = totalRsvps > 0 ? Math.round((totalAttendees / totalRsvps) * 100) : 0;

    const recentRedemptions = checkedIn
      .filter((r) => r.checked_in_at)
      .sort((a, b) => new Date(b.checked_in_at) - new Date(a.checked_in_at))
      .slice(0, 10);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const eventsThisMonth = events.filter((e) => new Date(e.date || e.start_date) >= startOfMonth);

    return {
      totalRedemptions,
      totalExpected,
      totalAttendees,
      totalRsvps,
      attendanceRate,
      recentRedemptions,
      totalEvents: events.length,
      eventsThisMonth: eventsThisMonth.length
    };
  }, [events, rsvps]);

  const eventMap = useMemo(() => {
    return events.reduce((map, event) => {
      map[event.id] = event;
      return map;
    }, {});
  }, [events]);

  const isLoading = eventsLoading || rsvpsLoading;

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Coins className="h-5 w-5 text-amber-500" />
            Joy Coins Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Coins className="h-5 w-5 text-amber-500" />
            Joy Coins Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center">
            <Coins className="h-10 w-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No Joy Coin events yet.</p>
            <p className="text-xs text-slate-600 mt-1">
              Enable Joy Coins on your events to start tracking redemptions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-100">
          <Coins className="h-5 w-5 text-amber-500" />
          Joy Coins Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={Coins}
            label="Coins Redeemed"
            value={stats.totalRedemptions}
            subValue={`of ${stats.totalExpected} reserved`}
            color="text-amber-500"
          />
          <StatCard
            icon={Users}
            label="Attendees"
            value={stats.totalAttendees}
            subValue={`${stats.attendanceRate}% show rate`}
            color="text-emerald-500"
          />
          <StatCard
            icon={Calendar}
            label="Joy Coin Events"
            value={stats.totalEvents}
            subValue={`${stats.eventsThisMonth} this month`}
            color="text-blue-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Est. Revenue Share"
            value="—"
            subValue="Calculated monthly"
            color="text-purple-500"
          />
        </div>

        {stats.recentRedemptions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-3">Recent Redemptions</h4>
            <div className="bg-slate-800/30 rounded-lg p-3">
              {stats.recentRedemptions.map((rsvp) => (
                <RecentRedemptionRow
                  key={rsvp.id}
                  rsvp={rsvp}
                  event={eventMap[rsvp.event_id]}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium text-slate-400 mb-3">Attendance Summary</h4>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-slate-300">{stats.totalAttendees} checked in</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-400">
                {Math.max(0, stats.totalRsvps - stats.totalAttendees)} pending/no-show
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
