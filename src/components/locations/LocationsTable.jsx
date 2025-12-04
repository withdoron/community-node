import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, MapPin, Rocket, Loader2, Pencil, Zap, Info, Eye } from "lucide-react";
import { format } from 'date-fns';
import { isLocationBoosted } from './locationUtils';
import { getAutoBoostStatus, countActiveAutoBoostsByCategory, countActiveAutoBoostsGlobal, LOW_TRAFFIC_VIEW_THRESHOLD } from './autoBoostUtils';

export default function LocationsTable({ 
  locations, 
  allLocations = [],
  bumpsRemaining,
  onBoost, 
  onToggleAutoBoost,
  onEdit,
  boostingId,
  updatingId
}) {
  // Calculate category and global counts for status messages
  const categoryCounts = countActiveAutoBoostsByCategory(allLocations.length > 0 ? allLocations : locations);
  const globalCount = countActiveAutoBoostsGlobal(allLocations.length > 0 ? allLocations : locations);
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Location</TableHead>
            <TableHead>City</TableHead>
            <TableHead className="text-center">Views (7d)</TableHead>
            <TableHead className="text-center">Boost Status</TableHead>
            <TableHead className="text-center">Smart Auto-Boost</TableHead>
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
              const autoBoostStatus = getAutoBoostStatus(location, categoryCounts, globalCount);
              const views = location.views_last_7_days || 0;
              const isLowViews = views < LOW_TRAFFIC_VIEW_THRESHOLD;

              return (
                <TableRow key={location.id} className={isUpdating ? 'opacity-60' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">{location.name || 'Main Location'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{location.city}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Eye className={`h-3 w-3 ${isLowViews ? 'text-amber-500' : 'text-slate-400'}`} />
                      <span className={isLowViews ? 'text-amber-600 font-medium' : 'text-slate-600'}>
                        {views}
                      </span>
                      {isLowViews && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Under-exposed (below {LOW_TRAFFIC_VIEW_THRESHOLD} views)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
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
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!location.is_auto_boost_enabled}
                          onCheckedChange={(checked) => onToggleAutoBoost(location, checked)}
                          disabled={isUpdating}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3 w-3 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px]">
                              <p className="text-xs">{autoBoostStatus.message}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {location.is_auto_boost_enabled && (
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] ${
                            autoBoostStatus.status === 'active' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                            autoBoostStatus.status === 'eligible' ? 'border-emerald-300 text-emerald-700 bg-emerald-50' :
                            'border-slate-200 text-slate-500'
                          }`}
                        >
                          <Zap className="h-2 w-2 mr-0.5" />
                          {autoBoostStatus.status === 'active' ? 'Running' :
                           autoBoostStatus.status === 'eligible' ? 'Ready' :
                           autoBoostStatus.status === 'not_underexposed' ? 'Good visibility' :
                           autoBoostStatus.status === 'outside_hours' ? 'Outside hours' :
                           autoBoostStatus.status === 'category_limit' ? 'Category full' :
                           autoBoostStatus.status === 'global_limit' ? 'Queue full' :
                           autoBoostStatus.status === 'no_credits' ? 'No credits' : 'Waiting'}
                        </Badge>
                      )}
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