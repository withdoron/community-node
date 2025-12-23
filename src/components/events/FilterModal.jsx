import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";

export default function FilterModal({ open, onOpenChange, filters, onFiltersChange }) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    const cleared = {
      priceRange: [0, 100],
      audience: [],
      setting: [],
      acceptsSilver: false,
      isVolunteer: false
    };
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  };

  const toggleAudience = (value) => {
    const current = localFilters.audience || [];
    if (current.includes(value)) {
      setLocalFilters({ ...localFilters, audience: current.filter(a => a !== value) });
    } else {
      setLocalFilters({ ...localFilters, audience: [...current, value] });
    }
  };

  const toggleSetting = (value) => {
    const current = localFilters.setting || [];
    if (current.includes(value)) {
      setLocalFilters({ ...localFilters, setting: current.filter(s => s !== value) });
    } else {
      setLocalFilters({ ...localFilters, setting: [...current, value] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Filters</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4 text-slate-400" />
            <span className="sr-only">Close</span>
          </button>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Price Range */}
          <div>
            <Label className="text-white font-semibold mb-3 block">Price Range</Label>
            <div className="px-2">
              <Slider
                value={localFilters.priceRange || [0, 100]}
                onValueChange={(value) => setLocalFilters({ ...localFilters, priceRange: value })}
                max={100}
                step={5}
                className="mb-2"
              />
              <div className="flex justify-between text-sm text-slate-400">
                <span>Free</span>
                <span>${localFilters.priceRange?.[1] || 100}+</span>
              </div>
            </div>
          </div>

          {/* Audience */}
          <div>
            <Label className="text-white font-semibold mb-3 block">Audience</Label>
            <div className="space-y-2">
              {['family', 'adults', 'teens', 'kids', 'all_ages'].map((aud) => (
                <label key={aud} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={localFilters.audience?.includes(aud)}
                    onCheckedChange={() => toggleAudience(aud)}
                    className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <span className="text-sm text-slate-300 capitalize">{aud.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Setting */}
          <div>
            <Label className="text-white font-semibold mb-3 block">Setting</Label>
            <div className="space-y-2">
              {['indoor', 'outdoor', 'both'].map((set) => (
                <label key={set} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={localFilters.setting?.includes(set)}
                    onCheckedChange={() => toggleSetting(set)}
                    className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <span className="text-sm text-slate-300 capitalize">{set}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Economy Options */}
          <div>
            <Label className="text-white font-semibold mb-3 block">Economy</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={localFilters.acceptsSilver}
                  onCheckedChange={(checked) => setLocalFilters({ ...localFilters, acceptsSilver: checked })}
                  className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <span className="text-sm text-slate-300">🪙 Accepts Silver</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={localFilters.isVolunteer}
                  onCheckedChange={(checked) => setLocalFilters({ ...localFilters, isVolunteer: checked })}
                  className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <span className="text-sm text-slate-300">🤝 Volunteer Opportunity</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClear}
            className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Clear All
          </Button>
          <Button
            onClick={handleApply}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
          >
            Show Results
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}