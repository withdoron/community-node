import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
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
      eventType: [],
      networks: [],
      audience: [],
      setting: [],
      acceptsSilver: false,
      wheelchairAccessible: false,
      freeParking: false
    };
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  };

  const toggleEventType = (value) => {
    const current = localFilters.eventType || [];
    if (current.includes(value)) {
      setLocalFilters({ ...localFilters, eventType: current.filter(t => t !== value) });
    } else {
      setLocalFilters({ ...localFilters, eventType: [...current, value] });
    }
  };

  const toggleNetwork = (value) => {
    const current = localFilters.networks || [];
    if (current.includes(value)) {
      setLocalFilters({ ...localFilters, networks: current.filter(n => n !== value) });
    } else {
      setLocalFilters({ ...localFilters, networks: [...current, value] });
    }
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
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md p-0 [&>button]:hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Filters</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* Price Range */}
          <div>
            <Label className="text-white font-bold mb-3 block">Price</Label>
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

          {/* Event Type */}
          <div>
            <Label className="text-white font-bold mb-3 block">Event Type</Label>
            <div className="space-y-2">
              {[
                { id: 'markets_fairs', label: 'Markets & Fairs' },
                { id: 'live_music', label: 'Live Music' },
                { id: 'food_drink', label: 'Food & Drink' },
                { id: 'workshops_classes', label: 'Workshops & Classes' },
                { id: 'sports_active', label: 'Sports & Active' },
                { id: 'art_culture', label: 'Art & Culture' }
              ].map((type) => (
                <label key={type.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={localFilters.eventType?.includes(type.id)}
                    onCheckedChange={() => toggleEventType(type.id)}
                    className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <span className="text-sm text-slate-300">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Networks */}
          <div>
            <Label className="text-white font-bold mb-3 block">Networks</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={localFilters.networks?.includes('recess')}
                  onCheckedChange={() => toggleNetwork('recess')}
                  className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <div className="flex flex-col">
                  <span className="text-sm text-slate-300">Recess</span>
                  <span className="text-xs text-slate-500">Accepts Joy Coins</span>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={localFilters.networks?.includes('tca')}
                  onCheckedChange={() => toggleNetwork('tca')}
                  className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <div className="flex flex-col">
                  <span className="text-sm text-slate-300">The Creative Alliance</span>
                  <span className="text-xs text-slate-500">Accepts Joy Coins</span>
                </div>
              </label>
            </div>
          </div>

          {/* Audience */}
          <div>
            <Label className="text-white font-bold mb-3 block">Audience</Label>
            <div className="space-y-2">
              {[
                { id: 'family_friendly', label: 'Family Friendly' },
                { id: 'adults_only', label: '21+ / Adults Only' },
                { id: 'pet_friendly', label: 'Pet Friendly' },
                { id: 'seniors', label: 'Seniors' }
              ].map((aud) => (
                <label key={aud.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={localFilters.audience?.includes(aud.id)}
                    onCheckedChange={() => toggleAudience(aud.id)}
                    className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <span className="text-sm text-slate-300">{aud.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Setting */}
          <div>
            <Label className="text-white font-bold mb-3 block">Setting</Label>
            <div className="space-y-2">
              {['indoor', 'outdoor'].map((set) => (
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

          {/* Amenities */}
          <div>
            <Label className="text-white font-bold mb-3 block">Amenities</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={localFilters.wheelchairAccessible}
                  onCheckedChange={(checked) => setLocalFilters({ ...localFilters, wheelchairAccessible: checked })}
                  className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <span className="text-sm text-slate-300">♿ Wheelchair Accessible</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={localFilters.freeParking}
                  onCheckedChange={(checked) => setLocalFilters({ ...localFilters, freeParking: checked })}
                  className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <span className="text-sm text-slate-300">🅿️ Free Parking</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={localFilters.acceptsSilver}
                  onCheckedChange={(checked) => setLocalFilters({ ...localFilters, acceptsSilver: checked })}
                  className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <span className="text-sm text-slate-300">🪙 Silver Accepted</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-900 flex gap-2">
          <Button
            variant="outline"
            onClick={handleClear}
            className="flex-1 bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Clear All
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
          >
            Show Results
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}