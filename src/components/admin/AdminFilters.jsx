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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by business name..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by owner email..."
            value={filters.ownerSearch || ''}
            onChange={(e) => updateFilter('ownerSearch', e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-3">
        <Select value={filters.tier} onValueChange={(v) => updateFilter('tier', v)}>
          <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-slate-300">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="all" className="text-slate-300 focus:bg-slate-800">All Tiers</SelectItem>
            <SelectItem value="basic" className="text-slate-300 focus:bg-slate-800">Basic</SelectItem>
            <SelectItem value="standard" className="text-slate-300 focus:bg-slate-800">Standard</SelectItem>
            <SelectItem value="partner" className="text-slate-300 focus:bg-slate-800">Partner</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.boosted} onValueChange={(v) => updateFilter('boosted', v)}>
          <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-slate-300">
            <SelectValue placeholder="Boosted" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="all" className="text-slate-300 focus:bg-slate-800">All</SelectItem>
            <SelectItem value="yes" className="text-slate-300 focus:bg-slate-800">Boosted</SelectItem>
            <SelectItem value="no" className="text-slate-300 focus:bg-slate-800">Not Boosted</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.acceptsSilver} onValueChange={(v) => updateFilter('acceptsSilver', v)}>
          <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700 text-slate-300">
            <SelectValue placeholder="Accepts Silver" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="all" className="text-slate-300 focus:bg-slate-800">All</SelectItem>
            <SelectItem value="yes" className="text-slate-300 focus:bg-slate-800">Accepts Silver</SelectItem>
            <SelectItem value="no" className="text-slate-300 focus:bg-slate-800">No Silver</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.localFranchise} onValueChange={(v) => updateFilter('localFranchise', v)}>
          <SelectTrigger className="w-[170px] bg-slate-800 border-slate-700 text-slate-300">
            <SelectValue placeholder="Local Franchise" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="all" className="text-slate-300 focus:bg-slate-800">All</SelectItem>
            <SelectItem value="yes" className="text-slate-300 focus:bg-slate-800">Local Franchise</SelectItem>
            <SelectItem value="no" className="text-slate-300 focus:bg-slate-800">Not Franchise</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
          <SelectTrigger className="w-[130px] bg-slate-800 border-slate-700 text-slate-300">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="all" className="text-slate-300 focus:bg-slate-800">All Status</SelectItem>
            <SelectItem value="active" className="text-slate-300 focus:bg-slate-800">Active</SelectItem>
            <SelectItem value="inactive" className="text-slate-300 focus:bg-slate-800">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-400 hover:text-amber-500">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}