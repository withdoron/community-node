import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MapPin, Pencil, Eye } from "lucide-react";

export default function LocationsTable({ 
  locations, 
  onEdit,
  updatingId
}) {
  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary">
            <TableHead className="text-muted-foreground">Location</TableHead>
            <TableHead className="text-muted-foreground">City</TableHead>
            <TableHead className="text-center text-muted-foreground">Views (7d)</TableHead>
            <TableHead className="text-right text-muted-foreground">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground/70">
                No locations yet. Add your first location below.
              </TableCell>
            </TableRow>
          ) : (
            locations.map((location) => {
              const isUpdating = updatingId === location.id;
              const views = location.views_last_7_days || 0;

              return (
                <TableRow key={location.id} className={isUpdating ? 'opacity-60' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{location.name || 'Main Location'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground-soft">{location.city}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Eye className="h-3 w-3 text-muted-foreground" />
                      <span className="text-foreground-soft">{views}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="default"
                      onClick={() => onEdit(location)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
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