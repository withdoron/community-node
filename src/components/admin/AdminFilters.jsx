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
      acceptsSilver: 'all',
      localFranchise: 'all',
      status: 'all',
      ownership: 'all',
    });
  };

  const hasActiveFilters = filters.search ||
    filters.ownerSearch ||
    filters.tier !== 'all' ||
    filters.acceptsSilver !== 'all' ||
    filters.localFranchise !== 'all' ||
    filters.status !== 'all' ||
    filters.ownership !== 'all';

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            name="admin-filter-search"
            id="admin-filter-search"
            placeholder="Search by business name..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            name="admin-filter-owner-email"
            id="admin-filter-owner-email"
            placeholder="Search by owner email..."
            value={filters.ownerSearch || ''}
            onChange={(e) => updateFilter('ownerSearch', e.target.value)}
            className="pl-10 bg-secondary border-border text-foreground placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-3">
        <Select value={filters.tier} onValueChange={(v) => updateFilter('tier', v)}>
          <SelectTrigger className="flex-1 min-w-[120px] bg-secondary border-border text-foreground-soft">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all" className="text-foreground-soft focus:bg-secondary">All Tiers</SelectItem>
            <SelectItem value="basic" className="text-foreground-soft focus:bg-secondary">Basic</SelectItem>
            <SelectItem value="standard" className="text-foreground-soft focus:bg-secondary">Standard</SelectItem>
            <SelectItem value="partner" className="text-foreground-soft focus:bg-secondary">Partner</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.acceptsSilver} onValueChange={(v) => updateFilter('acceptsSilver', v)}>
          <SelectTrigger className="flex-1 min-w-[120px] bg-secondary border-border text-foreground-soft">
            <SelectValue placeholder="Accepts Silver" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all" className="text-foreground-soft focus:bg-secondary">All</SelectItem>
            <SelectItem value="yes" className="text-foreground-soft focus:bg-secondary">Accepts Silver</SelectItem>
            <SelectItem value="no" className="text-foreground-soft focus:bg-secondary">No Silver</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.localFranchise} onValueChange={(v) => updateFilter('localFranchise', v)}>
          <SelectTrigger className="flex-1 min-w-[120px] bg-secondary border-border text-foreground-soft">
            <SelectValue placeholder="Local Franchise" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all" className="text-foreground-soft focus:bg-secondary">All</SelectItem>
            <SelectItem value="yes" className="text-foreground-soft focus:bg-secondary">Local Franchise</SelectItem>
            <SelectItem value="no" className="text-foreground-soft focus:bg-secondary">Not Franchise</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
          <SelectTrigger className="flex-1 min-w-[120px] bg-secondary border-border text-foreground-soft">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all" className="text-foreground-soft focus:bg-secondary">All Status</SelectItem>
            <SelectItem value="active" className="text-foreground-soft focus:bg-secondary">Active</SelectItem>
            <SelectItem value="inactive" className="text-foreground-soft focus:bg-secondary">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.ownership || 'all'} onValueChange={(v) => updateFilter('ownership', v)}>
          <SelectTrigger className="flex-1 min-w-[120px] bg-secondary border-border text-foreground-soft">
            <SelectValue placeholder="Ownership" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all" className="text-foreground-soft focus:bg-secondary">All Ownership</SelectItem>
            <SelectItem value="claimed" className="text-foreground-soft focus:bg-secondary">Claimed</SelectItem>
            <SelectItem value="unclaimed" className="text-foreground-soft focus:bg-secondary">Unclaimed</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-primary">
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}