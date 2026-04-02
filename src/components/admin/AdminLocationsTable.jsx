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
    <div className="border border-border rounded-xl overflow-x-auto bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 border-b border-border">
            <TableHead className="text-muted-foreground">Business</TableHead>
            <TableHead className="text-muted-foreground">Location</TableHead>
            <TableHead className="text-muted-foreground">City</TableHead>
            <TableHead className="text-center text-muted-foreground">Views (7d)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                No locations found
              </TableCell>
            </TableRow>
          ) : (
            locations.map((location) => {
              const business = businessMap[location.business_id];
              const isUpdating = updatingId === location.id;
              const views = location.views_last_7_days || 0;

              return (
                <TableRow key={location.id} className={`border-b border-border hover:bg-secondary/50 transition-colors ${isUpdating ? 'opacity-60' : ''}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground/70" />
                      <span className="font-medium text-foreground truncate max-w-[150px]">
                        {business?.name || <span className="text-red-400 italic">Orphaned</span>}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground/70" />
                      <span className="text-foreground-soft">{location.name || 'Main'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground-soft">{location.city}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Eye className="h-3 w-3 text-muted-foreground/70" />
                      <span className="text-foreground-soft">{views}</span>
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