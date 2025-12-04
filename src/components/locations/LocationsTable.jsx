import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sparkles, MapPin, Rocket, Loader2, Pencil } from "lucide-react";
import { format } from 'date-fns';
import { isLocationBoosted } from './locationUtils';

export default function LocationsTable({ 
  locations, 
  bumpsRemaining,
  onBoost, 
  onToggleAutoBoost,
  onEdit,
  boostingId,
  updatingId
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Location</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="text-center">Boost Status</TableHead>
            <TableHead className="text-center">Auto-Boost</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                No locations yet. Add your first location below.
              </TableCell>
            </TableRow>
          ) : (
            locations.map((location) => {
              const isBoosted = isLocationBoosted(location);
              const isUpdating = updatingId === location.id;
              const isBoosting = boostingId === location.id;

              return (
                <TableRow key={location.id} className={isUpdating ? 'opacity-60' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">{location.name || 'Main Location'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{location.city}</TableCell>
                  <TableCell className="text-slate-600 max-w-[200px] truncate">
                    {location.address || '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {isBoosted ? (
                      <div className="inline-flex flex-col items-center">
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Boosted
                        </Badge>
                        <span className="text-xs text-slate-500 mt-1">
                          Until {format(new Date(location.boost_end_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">Not boosted</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={!!location.is_auto_boost_enabled}
                        onCheckedChange={(checked) => onToggleAutoBoost(location, checked)}
                        disabled={isUpdating}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <span className="text-xs text-slate-500">
                        {location.is_auto_boost_enabled ? 'On' : 'Off'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!isBoosted && bumpsRemaining > 0 && (
                        <Button
                          size="sm"
                          onClick={() => onBoost(location)}
                          disabled={isBoosting}
                          className="bg-amber-500 hover:bg-amber-600"
                        >
                          {isBoosting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Rocket className="h-3 w-3 mr-1" />
                              Boost
                            </>
                          )}
                        </Button>
                      )}
                      {isBoosted && (
                        <Badge variant="outline" className="text-slate-500">
                          Already Boosted
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(location)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}