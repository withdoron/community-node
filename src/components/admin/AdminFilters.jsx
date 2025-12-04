import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export default function AdminFilters({ filters, onFiltersChange }) {
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      ownerSearch: '',
      tier: 'all',
      boosted: 'all',
      acceptsSilver: 'all',
      localFranchise: 'all',
      status: 'all',
    });
  };

  const hasActiveFilters = filters.search || 
    filters.ownerSearch ||
    filters.tier !== 'all' || 
    filters.boosted !== 'all' || 
    filters.acceptsSilver !== 'all' || 
    filters.localFranchise !== 'all' || 
    filters.status !== 'all';

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by business name..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by owner email..."
            value={filters.ownerSearch || ''}
            onChange={(e) => updateFilter('ownerSearch', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-3">
        <Select value={filters.tier} onValueChange={(v) => updateFilter('tier', v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.boosted} onValueChange={(v) => updateFilter('boosted', v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Boosted" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Boosted</SelectItem>
            <SelectItem value="no">Not Boosted</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.acceptsSilver} onValueChange={(v) => updateFilter('acceptsSilver', v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Accepts Silver" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Accepts Silver</SelectItem>
            <SelectItem value="no">No Silver</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.localFranchise} onValueChange={(v) => updateFilter('localFranchise', v)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Local Franchise" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="yes">Local Franchise</SelectItem>
            <SelectItem value="no">Not Franchise</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}