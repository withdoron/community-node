import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Coins, Zap, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EventEditorProps {
  event?: any;
  businessId: string;
  currentUser: any;
  onSave?: () => void;
  onCancel?: () => void;
}

export default function EventEditor({ event, businessId, currentUser, onSave, onCancel }: EventEditorProps) {
  const queryClient = useQueryClient();
  const isEditing = !!event;
  const isOwner = currentUser?.role === 'admin' || currentUser?.is_business_owner;

  // Fetch business details to check add-ons and tier
  const { data: business } = useQuery({
    queryKey: ['business', businessId],
    queryFn: () => base44.entities.Business.filter({ id: businessId }, '-created_date', 1).then(r => r[0])
  });

  // Fetch business locations
  const { data: locations = [] } = useQuery({
    queryKey: ['locations', businessId],
    queryFn: () => base44.entities.Location.filter({ business_id: businessId, is_active: true }, '-created_date', 50)
  });

  // Calculate boost credits
  const boostsRemaining = business ? (business.boost_credits_this_period || 0) - (business.boosts_used_this_period || 0) : 0;
  const hasRecessAddon = business?.add_ons?.includes('recess') || false;
  const hasTCAAddon = business?.add_ons?.includes('tca') || false;

  // Form state
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    date: event?.date ? format(new Date(event.date), "yyyy-MM-dd'T'HH:mm") : '',
    end_date: event?.end_date ? format(new Date(event.end_date), "yyyy-MM-dd'T'HH:mm") : '',
    location_id: event?.location_id || '',
    instructor_id: event?.instructor_id || '',
    network: event?.network || '',
    pricing_type: event?.price === 0 ? 'free' : event?.first_visit_free ? 'first_free' : 'paid',
    price: event?.price || 0,
    accepts_silver: event?.accepts_silver || false,
    enable_boost: false,
    pet_friendly: event?.pet_friendly || false,
    mats_provided: event?.mats_provided || false,
    wheelchair_accessible: event?.wheelchair_accessible || false,
    free_parking: event?.free_parking || false,
    instructor_note: event?.instructor_note || ''
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-enable punch pass if network is selected
      if (field === 'network' && value) {
        updated.punch_pass_accepted = true;
      }
      
      return updated;
    });
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        return base44.entities.Event.update(event.id, data);
      } else {
        return base44.entities.Event.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(isEditing ? 'Event updated successfully' : 'Event created successfully');
      onSave?.();
    },
    onError: () => {
      toast.error('Failed to save event');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title || !formData.date || !formData.location_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.pricing_type === 'paid' && (!formData.price || formData.price <= 0)) {
      toast.error('Please enter a valid price');
      return;
    }

    // Prepare data for submission
    const submitData: any = {
      business_id: businessId,
      title: formData.title,
      description: formData.description,
      date: new Date(formData.date).toISOString(),
      end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
      location_id: formData.location_id,
      instructor_id: formData.instructor_id || null,
      network: formData.network || null,
      price: formData.pricing_type === 'free' ? 0 : parseFloat(formData.price.toString()),
      first_visit_free: formData.pricing_type === 'first_free',
      accepts_silver: formData.accepts_silver,
      pet_friendly: formData.pet_friendly,
      mats_provided: formData.mats_provided,
      wheelchair_accessible: formData.wheelchair_accessible,
      free_parking: formData.free_parking,
      instructor_note: formData.instructor_note,
      is_active: true
    };

    // Handle boost
    if (formData.enable_boost && boostsRemaining > 0) {
      submitData.boost_start_at = new Date().toISOString();
      submitData.boost_end_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
      
      // Update business boost usage
      await base44.entities.Business.update(businessId, {
        boosts_used_this_period: (business?.boosts_used_this_period || 0) + 1
      });
    }

    saveMutation.mutate(submitData);
  };

  // Role-based rendering
  const canEditBasicInfo = isOwner;
  const canEditInstructorNote = true; // Everyone can edit instructor notes

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* SECTION A: BASIC INFO */}
      <Card className="p-6 bg-white border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Basic Information</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-slate-700">Event Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g., Morning Yoga Flow"
              disabled={!canEditBasicInfo}
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-700">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Tell attendees what to expect..."
              disabled={!canEditBasicInfo}
              rows={4}
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="text-slate-700">Start Date & Time *</Label>
              <Input
                id="date"
                type="datetime-local"
                value={formData.date}
                onChange={(e) => updateField('date', e.target.value)}
                disabled={!canEditBasicInfo}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="end_date" className="text-slate-700">End Date & Time</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
                disabled={!canEditBasicInfo}
                className="mt-1.5"
              />
            </div>
          </div>

          {isOwner && (
            <div>
              <Label htmlFor="instructor" className="text-slate-700">Instructor</Label>
              <Select value={formData.instructor_id} onValueChange={(value) => updateField('instructor_id', value)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select instructor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No instructor assigned</SelectItem>
                  <SelectItem value="invite_new">+ Invite New Instructor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>

      {/* SECTION B: LOCATION & NETWORK */}
      <Card className="p-6 bg-white border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Location & Network</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="location" className="text-slate-700">Location *</Label>
            <Select value={formData.location_id} onValueChange={(value) => updateField('location_id', value)} disabled={!canEditBasicInfo}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc: any) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name || loc.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isOwner && (hasRecessAddon || hasTCAAddon) && (
            <div>
              <Label className="text-slate-700 mb-2 block">Network Partnership</Label>
              <div className="space-y-2">
                {hasRecessAddon && (
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                    <Checkbox
                      checked={formData.network === 'recess'}
                      onCheckedChange={(checked) => updateField('network', checked ? 'recess' : '')}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-900">Recess</span>
                      <p className="text-xs text-slate-500">Punch Pass Accepted</p>
                    </div>
                  </label>
                )}
                {hasTCAAddon && (
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                    <Checkbox
                      checked={formData.network === 'tca'}
                      onCheckedChange={(checked) => updateField('network', checked ? 'tca' : '')}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-900">The Creative Alliance</span>
                      <p className="text-xs text-slate-500">Punch Pass Accepted</p>
                    </div>
                  </label>
                )}
              </div>
              {formData.network && (
                <div className="mt-2 flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>Network events automatically accept Punch Pass</span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* SECTION C: PRICING & ECONOMY */}
      {isOwner && (
        <Card className="p-6 bg-white border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="h-5 w-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Pricing & Economy</h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-700 mb-2 block">Pricing Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={formData.pricing_type === 'free' ? 'default' : 'outline'}
                  className={formData.pricing_type === 'free' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                  onClick={() => updateField('pricing_type', 'free')}
                >
                  Free
                </Button>
                <Button
                  type="button"
                  variant={formData.pricing_type === 'paid' ? 'default' : 'outline'}
                  className={formData.pricing_type === 'paid' ? 'bg-slate-900 hover:bg-slate-800' : ''}
                  onClick={() => updateField('pricing_type', 'paid')}
                >
                  Paid
                </Button>
                <Button
                  type="button"
                  variant={formData.pricing_type === 'first_free' ? 'default' : 'outline'}
                  className={formData.pricing_type === 'first_free' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                  onClick={() => updateField('pricing_type', 'first_free')}
                >
                  First Free
                </Button>
              </div>
            </div>

            {formData.pricing_type !== 'free' && (
              <div>
                <Label htmlFor="price" className="text-slate-700">Price per Person *</Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => updateField('price', parseFloat(e.target.value))}
                    className="pl-7"
                    required
                  />
                </div>
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
              <Checkbox
                checked={formData.accepts_silver}
                onCheckedChange={(checked) => updateField('accepts_silver', checked)}
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-slate-900">🪙 Accepts Silver</span>
                <p className="text-xs text-slate-500">Allow customers to pay with silver</p>
              </div>
            </label>
          </div>
        </Card>
      )}

      {/* SECTION D: MARKETING & BOOSTS */}
      {isOwner && (
        <Card className="p-6 bg-white border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-900">Marketing & Boosts</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900">Boost Credits</p>
                <p className="text-xs text-slate-500">Available this month</p>
              </div>
              <Badge variant={boostsRemaining > 0 ? 'default' : 'secondary'} className="text-lg px-3 py-1">
                {boostsRemaining} / {business?.boost_credits_this_period || 0}
              </Badge>
            </div>

            {boostsRemaining > 0 && !isEditing && (
              <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border-2 border-amber-200 bg-amber-50 hover:bg-amber-100">
                <Checkbox
                  checked={formData.enable_boost}
                  onCheckedChange={(checked) => updateField('enable_boost', checked)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">Boost This Event</span>
                    <Badge variant="outline" className="text-xs">-1 Credit</Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Featured placement for 7 days • Higher visibility in search results
                  </p>
                </div>
              </label>
            )}

            {boostsRemaining === 0 && (
              <div className="flex items-start gap-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <AlertCircle className="h-4 w-4 text-slate-500 mt-0.5" />
                <div className="flex-1 text-xs text-slate-600">
                  <p className="font-medium">No boost credits remaining</p>
                  <p className="mt-1">Credits reset monthly based on your subscription tier. Consider upgrading for more boosts.</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="h-3 w-3" />
              <span>Enable Auto-Boost in your business settings for automatic event promotion</span>
            </div>
          </div>
        </Card>
      )}

      {/* SECTION E: AMENITIES */}
      <Card className="p-6 bg-white border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-900">Amenities & Details</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
              <Checkbox
                checked={formData.pet_friendly}
                onCheckedChange={(checked) => updateField('pet_friendly', checked)}
                disabled={!canEditBasicInfo}
              />
              <span className="text-sm text-slate-700">🐕 Pet Friendly</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
              <Checkbox
                checked={formData.mats_provided}
                onCheckedChange={(checked) => updateField('mats_provided', checked)}
                disabled={!canEditBasicInfo}
              />
              <span className="text-sm text-slate-700">🧘 Mats Provided</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
              <Checkbox
                checked={formData.wheelchair_accessible}
                onCheckedChange={(checked) => updateField('wheelchair_accessible', checked)}
                disabled={!canEditBasicInfo}
              />
              <span className="text-sm text-slate-700">♿ Wheelchair Accessible</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
              <Checkbox
                checked={formData.free_parking}
                onCheckedChange={(checked) => updateField('free_parking', checked)}
                disabled={!canEditBasicInfo}
              />
              <span className="text-sm text-slate-700">🅿️ Free Parking</span>
            </label>
          </div>

          {canEditInstructorNote && (
            <div>
              <Label htmlFor="instructor_note" className="text-slate-700">Instructor Note</Label>
              <Textarea
                id="instructor_note"
                value={formData.instructor_note}
                onChange={(e) => updateField('instructor_note', e.target.value)}
                placeholder="Add a personal message or special instructions..."
                rows={3}
                className="mt-1.5"
              />
              <p className="text-xs text-slate-500 mt-1">
                Share special tips, what to bring, or personal insights about this session
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* ACTION BUTTONS */}
      <div className="flex items-center justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          className="bg-slate-900 hover:bg-slate-800"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
}