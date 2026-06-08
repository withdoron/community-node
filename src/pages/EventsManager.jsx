import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';
import EventsWidget from '@/components/dashboard/widgets/EventsWidget';
import { Card } from '@/components/ui/card';

/**
 * EventsManager — a direct-access route to the owner-side Events widget.
 *
 * The EventsWidget (the business-dashboard event manager: create / edit /
 * duplicate / cancel / delete + RSVP counts) normally only mounts as the
 * "Events" tab of the BUSINESS workspace inside MyLaneDrillView — it has no
 * route of its own, and it is NOT a tab on the Field-Service / Desk workspace.
 * That makes it easy to lose when the nav doesn't surface the business
 * workspace's Events tab.
 *
 * This thin page gives the widget a typeable URL: /EventsManager. Auth-gated
 * (not in PUBLIC_PAGES → wrapped in ProtectedRoute by App.jsx). Reuses
 * useActiveBusiness (DEC-168) for "which business am I operating as," with a
 * picker when the user owns more than one. Read-only nav affordance — it mounts
 * the existing widget; it changes nothing about how events are stored or shown.
 */
export default function EventsManager() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const {
    activeBusiness,
    ownedBusinesses,
    setActiveBusiness,
    isMultiBusiness,
    isLoading,
  } = useActiveBusiness(currentUser);

  const businessLabel = (b) =>
    b?.business_name || b?.name || b?.title || 'Untitled business';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Events</h1>
        <p className="text-sm text-muted-foreground">
          Manage your business&apos;s events — create, edit, duplicate, cancel,
          and see RSVP counts. (Direct link to the business-dashboard Events
          widget.)
        </p>
      </div>

      {isMultiBusiness && (
        <div className="flex items-center gap-2">
          <label
            htmlFor="events-manager-business"
            className="text-sm text-muted-foreground"
          >
            Business
          </label>
          <select
            id="events-manager-business"
            value={activeBusiness?.id ?? ''}
            onChange={(e) => setActiveBusiness(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            {ownedBusinesses.map((b) => (
              <option key={b.id} value={b.id}>
                {businessLabel(b)}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
      ) : activeBusiness ? (
        <EventsWidget business={activeBusiness} allowEdit userRole="owner" />
      ) : (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            No business found on your account. Create or claim a business first,
            then return to <span className="text-foreground">/EventsManager</span>{' '}
            to manage its events.
          </p>
        </Card>
      )}
    </div>
  );
}
