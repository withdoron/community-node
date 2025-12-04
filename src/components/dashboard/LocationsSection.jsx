import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Rocket, Info } from "lucide-react";
import { toast } from "sonner";
import LocationsTable from '@/components/locations/LocationsTable';
import LocationEditDialog from '@/components/locations/LocationEditDialog';
import { calculateBoostWindow, shouldAutoBoost } from '@/components/locations/locationUtils';

export default function LocationsSection({ business }) {
  const queryClient = useQueryClient();
  const [editingLocation, setEditingLocation] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [boostingId, setBoostingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  // Fetch locations for this business
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', business?.id],
    queryFn: () => base44.entities.Location.filter({ business_id: business.id }, '-created_date', 50),
    enabled: !!business?.id
  });

  // Check for auto-boost opportunities when locations load
  React.useEffect(() => {
    if (locations.length > 0 && business?.bumps_remaining > 0) {
      locations.forEach(async (loc) => {
        if (shouldAutoBoost(loc, business.bumps_remaining)) {
          // Auto-boost this location
          const { startAt, endAt } = calculateBoostWindow(4);
          await base44.entities.Location.update(loc.id, {
            boost_start_at: startAt,
            boost_end_at: endAt
          });
          await base44.entities.Business.update(business.id, {
            bumps_remaining: business.bumps_remaining - 1
          });
          queryClient.invalidateQueries(['locations', business.id]);
          queryClient.invalidateQueries(['myBusinesses']);
          toast.success(`Auto-boosted ${loc.name || loc.city}`);
        }
      });
    }
  }, [locations, business?.bumps_remaining]);

  // Create/update location mutation
  const saveLocation = useMutation({
    mutationFn: async (data) => {
      if (editingLocation?.id) {
        await base44.entities.Location.update(editingLocation.id, data);
      } else {
        await base44.entities.Location.create({
          ...data,
          business_id: business.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['locations', business.id]);
      setDialogOpen(false);
      setEditingLocation(null);
      toast.success(editingLocation?.id ? 'Location updated' : 'Location added');
    },
    onError: () => {
      toast.error('Failed to save location');
    }
  });

  // Boost location mutation
  const boostLocation = useMutation({
    mutationFn: async (location) => {
      setBoostingId(location.id);
      const { startAt, endAt } = calculateBoostWindow(4);
      
      await base44.entities.Location.update(location.id, {
        boost_start_at: startAt,
        boost_end_at: endAt
      });

      // Decrement bumps
      await base44.entities.Business.update(business.id, {
        bumps_remaining: (business.bumps_remaining || 0) - 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['locations', business.id]);
      queryClient.invalidateQueries(['myBusinesses']);
      toast.success('Location boosted for 4 hours!');
    },
    onError: () => {
      toast.error('Failed to boost location');
    },
    onSettled: () => {
      setBoostingId(null);
    }
  });

  // Toggle auto-boost mutation
  const toggleAutoBoost = useMutation({
    mutationFn: async ({ location, enabled }) => {
      setUpdatingId(location.id);
      await base44.entities.Location.update(location.id, {
        is_auto_boost_enabled: enabled
      });
    },
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries(['locations', business.id]);
      toast.success(enabled ? 'Auto-boost enabled' : 'Auto-boost disabled');
    },
    onError: () => {
      toast.error('Failed to update auto-boost');
    },
    onSettled: () => {
      setUpdatingId(null);
    }
  });

  const handleEdit = (location) => {
    setEditingLocation(location);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingLocation(null);
    setDialogOpen(true);
  };

  const canBoost = (business.subscription_tier === 'standard' || business.subscription_tier === 'partner') 
    && business.bumps_remaining > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-slate-600" />
          <h3 className="font-semibold text-lg text-slate-900">Locations</h3>
          <Badge variant="secondary">{locations.length}</Badge>
        </div>
        <Button onClick={handleAddNew} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Location
        </Button>
      </div>

      {/* Bumps info */}
      {(business.subscription_tier === 'standard' || business.subscription_tier === 'partner') && (
        <Card className="p-3 bg-slate-50 border-slate-200">
          <div className="flex items-center gap-2 text-sm">
            <Rocket className="h-4 w-4 text-purple-600" />
            <span className="text-slate-600">
              <strong className="text-slate-900">{business.bumps_remaining || 0}</strong> bumps remaining this month
            </span>
            {!canBoost && business.bumps_remaining <= 0 && (
              <Badge variant="outline" className="ml-auto text-slate-500">No bumps left</Badge>
            )}
          </div>
        </Card>
      )}

      {/* Auto-boost explanation */}
      <Card className="p-3 bg-emerald-50 border-emerald-200">
        <div className="flex items-start gap-2 text-sm">
          <Info className="h-4 w-4 text-emerald-600 mt-0.5" />
          <p className="text-slate-600">
            <strong className="text-slate-900">Auto-Boost:</strong> When enabled, we'll automatically boost a location as soon as its current boost expires (if you have bumps remaining).
          </p>
        </div>
      </Card>

      <LocationsTable
        locations={locations}
        bumpsRemaining={canBoost ? business.bumps_remaining : 0}
        onBoost={(loc) => boostLocation.mutate(loc)}
        onToggleAutoBoost={(loc, enabled) => toggleAutoBoost.mutate({ location: loc, enabled })}
        onEdit={handleEdit}
        boostingId={boostingId}
        updatingId={updatingId}
      />

      <LocationEditDialog
        location={editingLocation}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingLocation(null);
        }}
        onSave={(data) => saveLocation.mutate(data)}
        isSaving={saveLocation.isPending}
      />
    </div>
  );
}