import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Zap, Lock } from "lucide-react";
import { format } from "date-fns";
import { useOrganization } from "@/hooks/useOrganization";

export default function EventEditor({ 
  business, 
  existingEvent, 
  onSave, 
  onCancel,
  instructors = [],
  locations = []
}) {
  const [formData, setFormData] = useState({
    title: existingEvent?.title || '',
    description: existingEvent?.description || '',
    date: existingEvent?.date ? format(new Date(existingEvent.date), "yyyy-MM-dd'T'HH:mm") : '',
    end_date: existingEvent?.end_date ? format(new Date(existingEvent.end_date), "yyyy-MM-dd'T'HH:mm") : '',
    instructor_id: existingEvent?.instructor_id || '',
    location_id: existingEvent?.location_id || '',
    location: existingEvent?.location || '',
    price: existingEvent?.price || 0,
    pricing_type: existingEvent?.first_visit_free ? 'first_free' : (existingEvent?.price > 0 ? 'paid' : 'free'),
    network: existingEvent?.network || '',
    punch_pass_accepted: existingEvent?.punch_pass_accepted || false,
    accepts_silver: existingEvent?.accepts_silver || false,
    pet_friendly: existingEvent?.pet_friendly || false,
    mats_provided: existingEvent?.mats_provided || false,
    wheelchair_accessible: existingEvent?.wheelchair_accessible || false,
    free_parking: existingEvent?.free_parking || false,
    setting: existingEvent?.setting || 'both',
    event_type: existingEvent?.event_type || '',
    audience_tags: existingEvent?.audience_tags || [],
    instructor_note: existingEvent?.instructor_note || '',
    boost_enabled: false
  });

  // Get tier information
  const { tier, tierLevel, canUsePunchPass, canUseMultipleTickets, canAutoPublish } = useOrganization(business);

  const boostCreditsAvailable = (business?.boost_credits_this_period || 0) - (business?.boosts_used_this_period || 0);
  const hasRecessPartnership = business?.add_ons?.includes('recess');
  const hasTCAPartnership = business?.add_ons?.includes('tca');

  // Auto-enable punch pass when network is selected (only if tier allows)
  useEffect(() => {
    if ((formData.network === 'recess' || formData.network === 'tca') && canUsePunchPass) {
      setFormData(prev => ({ ...prev, punch_pass_accepted: true }));
    } else if (!canUsePunchPass) {
      // Disable punch pass if tier doesn't allow it
      setFormData(prev => ({ ...prev, punch_pass_accepted: false }));
    }
  }, [formData.network, canUsePunchPass]);

  const handlePricingTypeChange = (value) => {
    // Prevent selecting multiple_tickets if tier doesn't allow it
    if (value === 'multiple_tickets' && !canUseMultipleTickets) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      pricing_type: value,
      price: value === 'free' ? 0 : prev.price,
      first_visit_free: value === 'first_free'
    }));
  };

  // Reset pricing type if user doesn't have access to multiple_tickets
  useEffect(() => {
    if (formData.pricing_type === 'multiple_tickets' && !canUseMultipleTickets) {
      setFormData(prev => ({ ...prev, pricing_type: 'paid' }));
    }
  }, [canUseMultipleTickets]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Set event status based on tier
    const eventStatus = tier === 'basic' ? 'pending_review' : 'published';
    
    const eventData = {
      ...existingEvent,
      business_id: business.id,
      title: formData.title,
      description: formData.description,
      date: new Date(formData.date).toISOString(),
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
      instructor_id: formData.instructor_id || undefined,
      location_id: formData.location_id || undefined,
      location: formData.location,
      price: formData.pricing_type === 'free' ? 0 : formData.price,
      first_visit_free: formData.pricing_type === 'first_free',
      network: formData.network || undefined,
      punch_pass_accepted: canUsePunchPass ? formData.punch_pass_accepted : false,
      accepts_silver: formData.accepts_silver,
      pet_friendly: formData.pet_friendly,
      mats_provided: formData.mats_provided,
      wheelchair_accessible: formData.wheelchair_accessible,
      free_parking: formData.free_parking,
      setting: formData.setting,
      event_type: formData.event_type || undefined,
      audience_tags: formData.audience_tags,
      instructor_note: formData.instructor_note || undefined,
      boost_start_at: formData.boost_enabled ? new Date().toISOString() : undefined,
      boost_end_at: formData.boost_enabled ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      status: eventStatus,
      is_active: true
    };

    onSave(eventData);
  };

  const toggleAudienceTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      audience_tags: prev.audience_tags.includes(tag)
        ? prev.audience_tags.filter(t => t !== tag)
        : [...prev.audience_tags, tag]
    }));
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {existingEvent ? 'Edit Event' : 'Create New Event'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {business?.name}
          </p>
        </div>
        <Badge 
          variant="outline" 
          className="bg-amber-500/10 border-amber-500/50 text-amber-400"
        >
          <Zap className="h-3 w-3 mr-1" />
          {boostCreditsAvailable} Boost Credits
        </Badge>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-slate-200">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="bg-slate-900 border-slate-700 text-white"
              placeholder="e.g., Morning Yoga Class"
              required
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-200">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="bg-slate-900 border-slate-700 text-white min-h-[100px]"
              placeholder="Describe your event..."
            />
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date" className="text-slate-200">Start Date & Time *</Label>
            <Input
              id="date"
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className="bg-slate-900 border-slate-700 text-white"
              required
            />
          </div>
          <div>
            <Label htmlFor="end_date" className="text-slate-200">End Date & Time</Label>
            <Input
              id="end_date"
              type="datetime-local"
              value={formData.end_date}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>
        </div>

        {/* Instructor & Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {instructors.length > 0 && (
            <div>
              <Label htmlFor="instructor" className="text-slate-200">Instructor</Label>
              <Select
                value={formData.instructor_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, instructor_id: value }))}
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value={null}>None</SelectItem>
                  {instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.id}>
                      {instructor.full_name || instructor.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {locations.length > 0 && (
            <div>
              <Label htmlFor="location_id" className="text-slate-200">Location</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => {
                  const selectedLocation = locations.find(l => l.id === value);
                  setFormData(prev => ({ 
                    ...prev, 
                    location_id: value,
                    location: selectedLocation ? `${selectedLocation.name || ''} ${selectedLocation.street_address || ''}`.trim() : prev.location
                  }));
                }}
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name || location.street_address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {!locations.length && (
          <div>
            <Label htmlFor="location" className="text-slate-200">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="bg-slate-900 border-slate-700 text-white"
              placeholder="Enter event location"
              required
            />
          </div>
        )}

        {/* Network Partnership */}
        {(hasRecessPartnership || hasTCAPartnership) && (
          <div className="space-y-3">
            <Label className="text-slate-200">Network Partnership</Label>
            <div className="space-y-2">
              {hasRecessPartnership && (
                <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer hover:border-amber-500/50 transition-colors">
                  <Checkbox
                    checked={formData.network === 'recess'}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, network: checked ? 'recess' : '' }))
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-white font-medium">Recess</p>
                    <p className="text-xs text-slate-400">Punch Pass automatically accepted</p>
                  </div>
                </label>
              )}
              {hasTCAPartnership && (
                <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer hover:border-amber-500/50 transition-colors">
                  <Checkbox
                    checked={formData.network === 'tca'}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, network: checked ? 'tca' : '' }))
                    }
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-white font-medium">The Creative Alliance (TCA)</p>
                    <p className="text-xs text-slate-400">Punch Pass automatically accepted</p>
                  </div>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="space-y-4">
          <Label className="text-slate-200">Pricing *</Label>
          <RadioGroup
            value={formData.pricing_type}
            onValueChange={handlePricingTypeChange}
            className="space-y-2"
          >
            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer hover:border-amber-500/50 transition-colors">
              <RadioGroupItem value="free" />
              <span className="text-white">Free</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer hover:border-amber-500/50 transition-colors">
              <RadioGroupItem value="paid" />
              <span className="text-white">Paid</span>
            </label>
            <label 
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                canUseMultipleTickets
                  ? 'bg-slate-900 border-slate-700 cursor-pointer hover:border-amber-500/50'
                  : 'bg-slate-900/50 border-slate-700 opacity-50 cursor-not-allowed'
              }`}
            >
              <RadioGroupItem value="multiple_tickets" disabled={!canUseMultipleTickets} />
              <div className="flex items-center gap-2">
                <span className="text-white">Multiple Tickets</span>
                {!canUseMultipleTickets && <Lock className="h-4 w-4 text-amber-500" />}
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer hover:border-amber-500/50 transition-colors">
              <RadioGroupItem value="first_free" />
              <div>
                <p className="text-white">First Visit Free</p>
                <p className="text-xs text-slate-400">Special intro offer for new attendees</p>
              </div>
            </label>
          </RadioGroup>

          {!canUseMultipleTickets && formData.pricing_type !== 'multiple_tickets' && (
            <p className="text-xs text-slate-400">
              Multiple ticket types require Standard tier.{' '}
              <button
                type="button"
                onClick={() => window.open('https://hub.locallane.com/pricing?target=standard', '_blank')}
                className="text-amber-500 hover:underline"
              >
                Upgrade
              </button>
            </p>
          )}

          {formData.pricing_type === 'paid' && (
            <div className="space-y-3 ml-6">
              <div>
                <Label htmlFor="price" className="text-slate-200">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="0.00"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.accepts_silver}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, accepts_silver: checked }))}
                />
                <span className="text-sm text-slate-300">Accepts Silver Payment</span>
              </label>
            </div>
          )}
        </div>

        {/* Punch Pass Eligible */}
        <div className="space-y-3">
          <Label className="text-slate-200">Punch Pass</Label>
          {canUsePunchPass ? (
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl">
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.punch_pass_accepted}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, punch_pass_accepted: checked }))}
                />
                <div>
                  <Label className="text-slate-200 cursor-pointer">Punch Pass Eligible</Label>
                  <p className="text-slate-400 text-sm">This event accepts Punch Pass payments</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-xl opacity-50">
                <div className="flex items-center gap-3">
                  <Switch disabled />
                  <div>
                    <Label className="text-slate-400">Punch Pass Eligible</Label>
                    <p className="text-slate-500 text-sm">This event accepts Punch Pass payments</p>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Lock className="h-6 w-6 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs text-slate-300 font-medium">Standard tier required</p>
                  <button
                    type="button"
                    onClick={() => window.open('https://hub.locallane.com/pricing?target=standard', '_blank')}
                    className="text-xs text-amber-500 hover:underline mt-1"
                  >
                    Upgrade now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Event Type & Setting */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="event_type" className="text-slate-200">Event Type</Label>
            <Select
              value={formData.event_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, event_type: value }))}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="workshops_classes">Workshops & Classes</SelectItem>
                <SelectItem value="sports_active">Sports & Active</SelectItem>
                <SelectItem value="markets_fairs">Markets & Fairs</SelectItem>
                <SelectItem value="live_music">Live Music</SelectItem>
                <SelectItem value="food_drink">Food & Drink</SelectItem>
                <SelectItem value="art_culture">Art & Culture</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="setting" className="text-slate-200">Setting</Label>
            <Select
              value={formData.setting}
              onValueChange={(value) => setFormData(prev => ({ ...prev, setting: value }))}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="indoor">Indoor</SelectItem>
                <SelectItem value="outdoor">Outdoor</SelectItem>
                <SelectItem value="both">Both/Flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Audience Tags */}
        <div className="space-y-3">
          <Label className="text-slate-200">Audience</Label>
          <div className="grid grid-cols-2 gap-2">
            {['family_friendly', 'adults_only', 'pet_friendly', 'seniors'].map((tag) => (
              <label key={tag} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.audience_tags.includes(tag)}
                  onCheckedChange={() => toggleAudienceTag(tag)}
                />
                <span className="text-sm text-slate-300 capitalize">
                  {tag.replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div className="space-y-3">
          <Label className="text-slate-200">Amenities</Label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.pet_friendly}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, pet_friendly: checked }))}
              />
              <span className="text-sm text-slate-300">Pet Friendly</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.mats_provided}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, mats_provided: checked }))}
              />
              <span className="text-sm text-slate-300">Mats Provided</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.wheelchair_accessible}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, wheelchair_accessible: checked }))}
              />
              <span className="text-sm text-slate-300">Wheelchair Accessible</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.free_parking}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, free_parking: checked }))}
              />
              <span className="text-sm text-slate-300">Free Parking</span>
            </label>
          </div>
        </div>

        {/* Instructor Note */}
        <div>
          <Label htmlFor="instructor_note" className="text-slate-200">Instructor Note</Label>
          <Textarea
            id="instructor_note"
            value={formData.instructor_note}
            onChange={(e) => setFormData(prev => ({ ...prev, instructor_note: e.target.value }))}
            className="bg-slate-900 border-slate-700 text-white"
            placeholder="Personal message from the instructor..."
            rows={3}
          />
        </div>

        {/* Marketing Boost */}
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Marketing Boost</p>
              <p className="text-xs text-slate-400 mt-1">
                Featured placement for 7 days (1 credit)
              </p>
            </div>
            <Switch
              checked={formData.boost_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, boost_enabled: checked }))}
              disabled={boostCreditsAvailable < 1}
            />
          </div>
          {boostCreditsAvailable < 1 && (
            <p className="text-xs text-amber-400 mt-2">
              No boost credits available. Upgrade your plan to get more.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-700">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
          >
            Save Event
          </Button>
        </div>
      </form>
    </div>
  );
}
