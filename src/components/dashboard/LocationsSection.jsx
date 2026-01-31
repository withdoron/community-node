import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin } from "lucide-react";
import { toast } from "sonner";
import LocationsTable from '@/components/locations/LocationsTable';
import LocationEditDialog from '@/components/locations/LocationEditDialog';

export default function LocationsSection({ business }) {
  const queryClient = useQueryClient();
  const [editingLocation, setEditingLocation] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // Fetch locations for this business
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['locations', business?.id],
    queryFn: () => base44.entities.Location.filter({ business_id: business.id }, '-created_date', 50),
    enabled: !!business?.id
  });

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

  const handleEdit = (location) => {
    setEditingLocation(location);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingLocation(null);
    setDialogOpen(true);
  };

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

      <LocationsTable
        locations={locations}
        onEdit={handleEdit}
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