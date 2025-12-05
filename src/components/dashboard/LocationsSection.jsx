import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Rocket, Info, Zap } from "lucide-react";
import { toast } from "sonner";
import LocationsTable from '@/components/locations/LocationsTable';
import LocationEditDialog from '@/components/locations/LocationEditDialog';
import { 
  calculateBoostWindow, 
  processAutoBoosts,
  countActiveAutoBoostsGlobal,
  countActiveAutoBoostsByCategory,
  MAX_SIMULTANEOUS_AUTOBOOST_GLOBAL,
  MAX_SIMULTANEOUS_AUTOBOOST_PER_CATEGORY,
  ALLOWED_AUTOBOOST_HOURS
} from '@/components/locations/autoBoostUtils';

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
    const runAutoBoost = async () => {
      if (locations.length > 0 && business?.bumps_remaining > 0) {
        // Add boost credits info to locations for the auto-boost check
        const locationsWithCredits = locations.map(loc => ({
          ...loc,
          boost_credits_this_period: business.bumps_remaining + (loc.boosts_used_this_period || 0),
          category_id: loc.category_id || business.main_category
        }));
        
        const boostedLocations = await processAutoBoosts(
          locationsWithCredits,
          async (locId, data) => {
            await base44.entities.Location.update(locId, data);
            await base44.entities.Business.update(business.id, {
              bumps_remaining: Math.max(0, (business.bumps_remaining || 0) - 1)
            });
          }
        );
        
        if (boostedLocations.length > 0) {
          queryClient.invalidateQueries(['locations', business.id]);
          queryClient.invalidateQueries(['myBusinesses']);
          boostedLocations.forEach(loc => {
            toast.success(`Smart Auto-Boost activated for ${loc.name || loc.city}`);
          });
        }
      }
    };
    
    runAutoBoost();
  }, [locations, business?.bumps_remaining]);

  // Geocode an address to get lat/lng
  const geocodeAddress = async (locationData) => {
    const addressParts = [
      locationData.street_address,
      locationData.address_line2,
      locationData.city,
      locationData.state,
      locationData.zip_code,
      locationData.country
    ].filter(Boolean);
    
    if (addressParts.length < 2) return null;
    
    const fullAddress = addressParts.join(', ');
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Return the latitude and longitude coordinates for this address: "${fullAddress}". Be precise.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            lat: { type: "number", description: "Latitude" },
            lng: { type: "number", description: "Longitude" }
          },
          required: ["lat", "lng"]
        }
      });
      
      if (result?.lat && result?.lng) {
        return { lat: result.lat, lng: result.lng };
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
    }
    return null;
  };

  // Create/update location mutation
  const saveLocation = useMutation({
    mutationFn: async (data) => {
      // Geocode the address to get lat/lng
      const coords = await geocodeAddress(data);
      const locationData = {
        ...data,
        ...(coords || {})
      };
      
      if (editingLocation?.id) {
        await base44.entities.Location.update(editingLocation.id, locationData);
      } else {
        await base44.entities.Location.create({
          ...locationData,
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

      {/* Smart Auto-Boost explanation */}
      <Card className="p-3 bg-emerald-50 border-emerald-200">
        <div className="flex items-start gap-2 text-sm">
          <Zap className="h-4 w-4 text-emerald-600 mt-0.5" />
          <div className="text-slate-600">
            <p>
              <strong className="text-slate-900">Smart Auto-Boost:</strong> When enabled, we'll only boost a location when:
            </p>
            <ul className="mt-1 ml-4 list-disc text-xs text-slate-500 space-y-0.5">
              <li>It's under-exposed (low recent views)</li>
              <li>It's during active hours ({ALLOWED_AUTOBOOST_HOURS.start}:00 AM – {ALLOWED_AUTOBOOST_HOURS.end > 12 ? ALLOWED_AUTOBOOST_HOURS.end - 12 : ALLOWED_AUTOBOOST_HOURS.end}:00 {ALLOWED_AUTOBOOST_HOURS.end >= 12 ? 'PM' : 'AM'})</li>
              <li>There's room in its category (max {MAX_SIMULTANEOUS_AUTOBOOST_PER_CATEGORY} per category)</li>
              <li>There's room platform-wide (max {MAX_SIMULTANEOUS_AUTOBOOST_GLOBAL} total)</li>
            </ul>
            <p className="mt-2 text-xs text-emerald-700 font-medium">
              When this location is Boosted, customers will see it as "Featured" on the site.
            </p>
          </div>
        </div>
      </Card>

      <LocationsTable
        locations={locations}
        allLocations={locations}
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