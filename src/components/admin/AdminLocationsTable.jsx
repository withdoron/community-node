import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Building2, Eye } from "lucide-react";

export default function AdminLocationsTable({ 
  locations, 
  businesses,
  updatingId
}) {
  // Create a map of business IDs to business objects
  const businessMap = React.useMemo(() => {
    const map = {};
    businesses.forEach(b => { map[b.id] = b; });
    return map;
  }, [businesses]);

  return (
    <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-800/50 border-b border-slate-700">
            <TableHead className="text-slate-400">Business</TableHead>
            <TableHead className="text-slate-400">Location</TableHead>
            <TableHead className="text-slate-400">City</TableHead>
            <TableHead className="text-center text-slate-400">Views (7d)</TableHead>
            <TableHead className="text-center text-slate-400">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                No locations found
              </TableCell>
            </TableRow>
          ) : (
            locations.map((location) => {
              const business = businessMap[location.business_id];
              const isUpdating = updatingId === location.id;
              const views = location.views_last_7_days || 0;

              return (
                <TableRow key={location.id} className={`border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${isUpdating ? 'opacity-60' : ''}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      <span className="font-medium text-slate-100 truncate max-w-[150px]">
                        {business?.name || <span className="text-red-400 italic">Orphaned</span>}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-500" />
                      <span className="text-slate-300">{location.name || 'Main'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-300">{location.city}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Eye className="h-3 w-3 text-slate-500" />
                      <span className="text-slate-300">{views}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {/* Actions column kept for future use (e.g. Edit link) */}
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