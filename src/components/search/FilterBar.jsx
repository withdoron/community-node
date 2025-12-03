import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowUpDown, Filter, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'mechanic', label: 'Mechanic' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'farm', label: 'Farm' },
  { value: 'bullion_dealer', label: 'Bullion Dealer' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'handyman', label: 'Handyman' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' }
];

const sortOptions = [
  { value: 'rating', label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviews' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' }
];

export default function FilterBar({ 
  filters, 
  onFiltersChange, 
  sortBy, 
  onSortChange,
  resultCount = 0 
}) {
  const activeFilterCount = [
    filters.category !== 'all' && filters.category,
    filters.acceptsSilver
  ].filter(Boolean).length;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Category */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">Category</Label>
        <Select
          value={filters.category || 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
        >
          <SelectTrigger className="w-full h-10 border-slate-200">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Accepts Silver */}
      <div className="flex items-center justify-between py-2">
        <Label htmlFor="silver" className="text-sm font-medium text-slate-700 cursor-pointer">
          Accepts Silver Payment
        </Label>
        <Switch
          id="silver"
          checked={filters.acceptsSilver || false}
          onCheckedChange={(checked) => onFiltersChange({ ...filters, acceptsSilver: checked })}
        />
      </div>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          className="w-full text-slate-600 hover:text-slate-900"
          onClick={() => onFiltersChange({ category: 'all', acceptsSilver: false })}
        >
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-slate-200">
      <div className="flex items-center gap-3">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{resultCount}</span> businesses found
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Sort */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px] h-9 border-slate-200">
            <ArrowUpDown className="h-3.5 w-3.5 mr-2 text-slate-500" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Desktop Filters */}
        <div className="hidden md:flex items-center gap-3">
          <Select
            value={filters.category || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
          >
            <SelectTrigger className="w-[160px] h-9 border-slate-200">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={filters.acceptsSilver ? "default" : "outline"}
            size="sm"
            className={`h-9 ${filters.acceptsSilver ? 'bg-slate-900' : 'border-slate-200'}`}
            onClick={() => onFiltersChange({ ...filters, acceptsSilver: !filters.acceptsSilver })}
          >
            Accepts Silver
          </Button>
        </div>

        {/* Mobile Filter Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 md:hidden border-slate-200">
              <Filter className="h-3.5 w-3.5 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 h-5 w-5 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}