import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, MapPin, Building2, Zap, Eye, Info } from "lucide-react";
import { format } from 'date-fns';
import { isLocationBoosted } from '@/components/locations/locationUtils';
import { 
  getAutoBoostStatus, 
  countActiveAutoBoostsByCategory, 
  countActiveAutoBoostsGlobal,
  countActiveLocationsPerCategory,
  LOW_TRAFFIC_VIEW_THRESHOLD 
} from '@/components/locations/autoBoostUtils';

export default function AdminLocationsTable({ 
  locations, 
  businesses,
  onToggleAutoBoost,
  onClearBoost,
  updatingId
}) {
  // Create a map of business IDs to business objects
  const businessMap = React.useMemo(() => {
    const map = {};
    businesses.forEach(b => { map[b.id] = b; });
    return map;
  }, [businesses]);

  // Calculate category and global counts for status
  const categoryCounts = countActiveAutoBoostsByCategory(locations);
  const globalCount = countActiveAutoBoostsGlobal(locations);
  const categorySizeCounts = countActiveLocationsPerCategory(locations);

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead>Business</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>City</TableHead>
            <TableHead className="text-center">Views (7d)</TableHead>
            <TableHead className="text-center">Boost Status</TableHead>
            <TableHead className="text-center">Smart Auto-Boost</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                No locations found
              </TableCell>
            </TableRow>
          ) : (
            locations.map((location) => {
              const business = businessMap[location.business_id];
              const isBoosted = isLocationBoosted(location);
              const isUpdating = updatingId === location.id;
              const autoBoostStatus = getAutoBoostStatus(location, categoryCounts, globalCount, categorySizeCounts);
              const views = location.views_last_7_days || 0;
              const isLowViews = views < LOW_TRAFFIC_VIEW_THRESHOLD;

              return (
                <TableRow key={location.id} className={isUpdating ? 'opacity-60' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span className="font-medium truncate max-w-[150px]">
                        {business?.name || 'Unknown'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{location.name || 'Main'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{location.city}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Eye className={`h-3 w-3 ${isLowViews ? 'text-amber-500' : 'text-slate-400'}`} />
                      <span className={isLowViews ? 'text-amber-600 font-medium' : 'text-slate-600'}>
                        {views}
                      </span>
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
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
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
                            <TooltipContent className="max-w-[200px]">
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
                           autoBoostStatus.status === 'not_underexposed' ? 'Good' :
                           autoBoostStatus.status === 'outside_hours' ? 'Hours' :
                           autoBoostStatus.status === 'category_limit' ? 'Cat.' :
                           autoBoostStatus.status === 'global_limit' ? 'Queue' :
                           autoBoostStatus.status === 'category_too_small' ? 'Small' :
                           'Wait'}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {isBoosted && (
                      <button
                        onClick={() => onClearBoost(location)}
                        className="text-xs text-red-600 hover:text-red-700 underline"
                      >
                        Clear Boost
                      </button>
                    )}
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