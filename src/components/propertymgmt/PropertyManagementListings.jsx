import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Megaphone, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

import ListingFilters from './ListingFilters';
import ListingCard from './ListingCard';
import ListingFormDialog from './ListingFormDialog';
import ListingPreview from './ListingPreview';

export default function PropertyManagementListings({ profile, currentUser, memberRole, canEdit }) {
  // Role guard
  if (!memberRole) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>You don't have access to this workspace.</p>
      </div>
    );
  }

  const profileId = profile?.id;

  // Data
  const [listings, setListings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // UI
  const [formOpen, setFormOpen] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [previewListing, setPreviewListing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeStatus, setActiveStatus] = useState('all');
  const [activeType, setActiveType] = useState('all');

  // Load data
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [lst, prop, grp] = await Promise.all([
          base44.entities.PMListing.filter({ profile_id: profileId }),
          base44.entities.PMProperty.filter({ profile_id: profileId }),
          base44.entities.PMPropertyGroup.filter({ profile_id: profileId }),
        ]);
        if (!cancelled) {
          setListings(lst || []);
          setProperties(prop || []);
          setGroups(grp || []);
        }
      } catch (err) {
        console.error('Listings data load error:', err);
        toast.error('Failed to load listings. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [profileId, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  // Property label helper
  const groupsById = useMemo(() => {
    const m = {};
    (groups || []).forEach((g) => { m[g.id] = g; });
    return m;
  }, [groups]);

  const getPropertyLabel = useCallback(
    (propertyId) => {
      if (!propertyId) return '—';
      const p = (properties || []).find((x) => x.id === propertyId);
      if (!p) return '—';
      const groupName = groupsById[p.group_id]?.name;
      return groupName ? `${groupName} — ${p.name}` : p.name;
    },
    [properties, groupsById]
  );

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { all: 0, active: 0, pending: 0, rented: 0 };
    (listings || []).forEach((l) => {
      counts.all++;
      if (counts[l.status] !== undefined) counts[l.status]++;
    });
    return counts;
  }, [listings]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = [...(listings || [])];
    if (activeStatus !== 'all') {
      list = list.filter((l) => l.status === activeStatus);
    }
    if (activeType !== 'all') {
      list = list.filter((l) => l.listing_type === activeType);
    }
    // Sort: active first, then by title
    list.sort((a, b) => {
      const statusOrder = { active: 0, pending: 1, rented: 2 };
      const sa = statusOrder[a.status] ?? 9;
      const sb = statusOrder[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      return (a.title || '').localeCompare(b.title || '');
    });
    return list;
  }, [listings, activeStatus, activeType]);

  // ── CRUD ──
  const handleSave = async (data) => {
    try {
      if (editingListing) {
        await base44.entities.PMListing.update(editingListing.id, data);
      } else {
        await base44.entities.PMListing.create({
          ...data,
          profile_id: profileId,
        });
      }
      setFormOpen(false);
      setEditingListing(null);
      toast.success('Listing saved.');
      refresh();
    } catch (err) {
      console.error('Listing save error:', err);
      toast.error('Failed to save listing. Please try again.');
    }
  };

  const handleStatusChange = async (listing, newStatus) => {
    try {
      await base44.entities.PMListing.update(listing.id, { status: newStatus });

      // If marking as rented and has a linked property, update property status too
      if (newStatus === 'rented' && listing.property_id) {
        try {
          await base44.entities.PMProperty.update(listing.property_id, {
            status: 'occupied',
          });
        } catch (e) {
          // Non-critical — property update is best-effort
        }
      }

      toast.success('Listing status updated.');
      refresh();
    } catch (err) {
      console.error('Status change error:', err);
      toast.error('Failed to update listing status. Please try again.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await base44.entities.PMListing.delete(deleteTarget.id);
      setDeleteTarget(null);
      toast.success('Listing deleted.');
      refresh();
    } catch (err) {
      console.error('Listing delete error:', err);
      toast.error('Failed to delete listing. Please try again.');
    }
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-slate-900 border border-slate-800 rounded-lg animate-pulse" />
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-slate-900 border border-slate-800 rounded-lg p-4 animate-pulse"
          >
            <div className="h-6 w-40 bg-slate-700 rounded mb-2" />
            <div className="h-4 w-24 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Listings</h2>
          <p className="text-sm text-slate-400">
            {listings.length === 0
              ? 'No listings yet'
              : `${listings.length} listing${listings.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingListing(null);
            setFormOpen(true);
          }}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Listing
        </Button>
      </div>

      {/* Filters */}
      {listings.length > 0 && (
        <ListingFilters
          activeStatus={activeStatus}
          statusCounts={statusCounts}
          activeType={activeType}
          onStatusChange={setActiveStatus}
          onTypeChange={setActiveType}
        />
      )}

      {/* Empty state */}
      {listings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <Megaphone className="h-7 w-7 text-amber-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-300 mb-1">No listings yet</h3>
          <p className="text-slate-400 mb-6 text-center max-w-sm">
            Create your first listing to advertise vacancies and attract tenants or guests
          </p>
          <Button
            onClick={() => setFormOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create Listing
          </Button>
        </div>
      )}

      {/* Filtered empty */}
      {listings.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-slate-400 text-sm">No listings match your filters</p>
        </div>
      )}

      {/* Listing cards */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              propertyLabel={getPropertyLabel(l.property_id)}
              onEdit={(listing) => {
                setEditingListing(listing);
                setFormOpen(true);
              }}
              onDelete={setDeleteTarget}
              onPreview={setPreviewListing}
              onStatusAction={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* ── Dialogs ── */}
      <ListingFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingListing(null);
        }}
        listing={editingListing}
        properties={properties}
        groups={groups}
        profile={profile}
        onSave={handleSave}
      />

      <ListingPreview
        open={!!previewListing}
        onClose={() => setPreviewListing(null)}
        listing={previewListing}
        propertyLabel={
          previewListing ? getPropertyLabel(previewListing.property_id) : null
        }
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="bg-slate-900 border border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">
              Delete this listing?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently remove &ldquo;{deleteTarget?.title}&rdquo;. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
