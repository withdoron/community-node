import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronLeft, ChevronRight, Loader2, Upload, X, Plus, Trash2,
  Check, Star, Zap, Crown
} from "lucide-react";
import { mainCategories, getMainCategory } from '@/components/categories/categoryData';

const tiers = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$9',
    period: '/month',
    icon: Star,
    features: ['Business listing', 'Basic profile', 'Contact info', 'Customer reviews'],
    bumps: 0
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '$29',
    period: '/month',
    icon: Zap,
    popular: true,
    features: ['Everything in Basic', 'Photo gallery', 'Service listings', '3 bumps per month', 'Priority support'],
    bumps: 3
  },
  {
    id: 'partner',
    name: 'Partner',
    price: '$79',
    period: '/month',
    icon: Crown,
    features: ['Everything in Standard', 'Partner badge', 'Featured placement', '10 bumps per month', 'Analytics dashboard'],
    bumps: 10
  }
];

const steps = ['Business Info', 'Services', 'Choose Plan', 'Review'];

export default function BusinessOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    main_category: '',
    subcategories: [],
    description: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    service_area: '',
    accepts_silver: false,
    photos: [],
    services: [{ name: '', starting_price: '', description: '' }],
    subscription_tier: 'basic'
  });

  const selectedMainCategory = getMainCategory(formData.main_category);
  const availableSubcategories = selectedMainCategory?.subcategories.filter(s => !s.id.startsWith('all_')) || [];

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const createBusiness = useMutation({
    mutationFn: async (data) => {
      const tier = tiers.find(t => t.id === data.subscription_tier);
      const business = await base44.entities.Business.create({
        ...data,
        owner_email: currentUser?.email,
        slug: data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        bumps_remaining: tier?.bumps || 0,
        is_active: true
      });

      // Update user to be a business owner
      await base44.auth.updateMe({
        is_business_owner: true,
        business_id: business.id
      });

      return business;
    },
    onSuccess: (business) => {
      navigate(createPageUrl('BusinessDashboard'));
    }
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const uploadedUrls = [];

    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }

    setFormData({ ...formData, photos: [...formData.photos, ...uploadedUrls] });
    setUploading(false);
  };

  const removePhoto = (index) => {
    setFormData({ 
      ...formData, 
      photos: formData.photos.filter((_, i) => i !== index) 
    });
  };

  const addService = () => {
    setFormData({
      ...formData,
      services: [...formData.services, { name: '', starting_price: '', description: '' }]
    });
  };

  const removeService = (index) => {
    setFormData({
      ...formData,
      services: formData.services.filter((_, i) => i !== index)
    });
  };

  const updateService = (index, field, value) => {
    const newServices = [...formData.services];
    newServices[index] = { ...newServices[index], [field]: value };
    setFormData({ ...formData, services: newServices });
  };

  const handleMainCategoryChange = (value) => {
    setFormData({ 
      ...formData, 
      main_category: value, 
      subcategories: [] // Reset subcategories when main category changes
    });
  };

  const handleSubcategoryToggle = (subId) => {
    const current = formData.subcategories || [];
    if (current.includes(subId)) {
      setFormData({ ...formData, subcategories: current.filter(s => s !== subId) });
    } else {
      setFormData({ ...formData, subcategories: [...current, subId] });
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.name && formData.main_category && formData.city;
      case 1:
        return true;
      case 2:
        return formData.subscription_tier;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    const cleanedServices = formData.services
      .filter(s => s.name)
      .map(s => ({
        ...s,
        starting_price: s.starting_price ? parseFloat(s.starting_price) : null
      }));

    createBusiness.mutate({
      ...formData,
      services: cleanedServices
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('Home'))}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, idx) => (
              <div 
                key={step}
                className={`flex items-center ${idx < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div className={`
                  h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${idx <= currentStep 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-200 text-slate-500'}
                `}>
                  {idx < currentStep ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${idx < currentStep ? 'bg-slate-900' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm">
            {steps.map((step, idx) => (
              <span 
                key={step}
                className={idx <= currentStep ? 'text-slate-900 font-medium' : 'text-slate-500'}
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        <Card className="p-6 sm:p-8">
          {/* Step 1: Business Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Tell us about your business</h2>
                <p className="text-slate-600 mt-1">Basic information to get started</p>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Business Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your business name"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="main_category">Category <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.main_category}
                    onValueChange={handleMainCategoryChange}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {mainCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.main_category && availableSubcategories.length > 0 && (
                  <div>
                    <Label>Subcategories (select all that apply)</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {availableSubcategories.map((sub) => (
                        <label
                          key={sub.id}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            formData.subcategories.includes(sub.id)
                              ? 'border-slate-900 bg-slate-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Checkbox
                            checked={formData.subcategories.includes(sub.id)}
                            onCheckedChange={() => handleSubcategoryToggle(sub.id)}
                          />
                          <span className="text-sm">{sub.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tell customers about your business..."
                    className="mt-1.5 min-h-[100px]"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street address"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@business.com"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="service_area">Service Area</Label>
                  <Input
                    id="service_area"
                    value={formData.service_area}
                    onChange={(e) => setFormData({ ...formData, service_area: e.target.value })}
                    placeholder="e.g., 25 mile radius, Greater Austin Area"
                    className="mt-1.5"
                  />
                </div>

                <div className="flex items-center justify-between py-3 px-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div>
                    <Label htmlFor="silver" className="font-medium text-slate-900">Accept Silver Payment</Label>
                    <p className="text-sm text-slate-600">Let customers know you accept silver/precious metals</p>
                  </div>
                  <Switch
                    id="silver"
                    checked={formData.accepts_silver}
                    onCheckedChange={(checked) => setFormData({ ...formData, accepts_silver: checked })}
                  />
                </div>

                {/* Photos */}
                <div>
                  <Label>Photos</Label>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {formData.photos.map((photo, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={photo}
                          alt={`Upload ${idx + 1}`}
                          className="h-24 w-24 rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      ) : (
                        <Upload className="h-5 w-5 text-slate-400" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Services */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Add your services</h2>
                <p className="text-slate-600 mt-1">List the services you offer with starting prices</p>
              </div>

              <div className="space-y-4">
                {formData.services.map((service, idx) => (
                  <div key={idx} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-slate-700">Service {idx + 1}</span>
                      {formData.services.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeService(idx)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3">
                      <Input
                        value={service.name}
                        onChange={(e) => updateService(idx, 'name', e.target.value)}
                        placeholder="Service name"
                      />
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Input
                          type="number"
                          value={service.starting_price}
                          onChange={(e) => updateService(idx, 'starting_price', e.target.value)}
                          placeholder="Starting price ($)"
                        />
                        <Input
                          value={service.description}
                          onChange={(e) => updateService(idx, 'description', e.target.value)}
                          placeholder="Brief description"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={addService}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Service
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Choose Plan */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Choose your plan</h2>
                <p className="text-slate-600 mt-1">Select the tier that works best for your business</p>
              </div>

              <RadioGroup
                value={formData.subscription_tier}
                onValueChange={(value) => setFormData({ ...formData, subscription_tier: value })}
                className="grid gap-4"
              >
                {tiers.map((tier) => {
                  const Icon = tier.icon;
                  return (
                    <label
                      key={tier.id}
                      className={`
                        relative flex cursor-pointer rounded-xl border-2 p-5 transition-all
                        ${formData.subscription_tier === tier.id 
                          ? 'border-slate-900 bg-slate-50' 
                          : 'border-slate-200 hover:border-slate-300'}
                      `}
                    >
                      <RadioGroupItem value={tier.id} className="sr-only" />
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`
                            h-10 w-10 rounded-lg flex items-center justify-center
                            ${tier.id === 'partner' ? 'bg-amber-100' : 
                              tier.id === 'standard' ? 'bg-blue-100' : 'bg-slate-100'}
                          `}>
                            <Icon className={`h-5 w-5 ${
                              tier.id === 'partner' ? 'text-amber-600' : 
                              tier.id === 'standard' ? 'text-blue-600' : 'text-slate-600'
                            }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900">{tier.name}</h3>
                              {tier.popular && (
                                <Badge className="bg-blue-100 text-blue-700 border-0">Popular</Badge>
                              )}
                            </div>
                            <p className="text-2xl font-bold text-slate-900">
                              {tier.price}
                              <span className="text-sm font-normal text-slate-500">{tier.period}</span>
                            </p>
                          </div>
                        </div>
                        <ul className="mt-4 space-y-2">
                          {tier.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                              <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {formData.subscription_tier === tier.id && (
                        <div className="absolute top-4 right-4">
                          <div className="h-6 w-6 bg-slate-900 rounded-full flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </label>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Review your listing</h2>
                <p className="text-slate-600 mt-1">Make sure everything looks good</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-semibold text-slate-900">{formData.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">{formData.description || 'No description'}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="secondary">{selectedMainCategory?.label || formData.main_category}</Badge>
                    {formData.subcategories.length > 0 && formData.subcategories.map(subId => {
                      const sub = availableSubcategories.find(s => s.id === subId);
                      return sub ? <Badge key={subId} variant="outline">{sub.label}</Badge> : null;
                    })}
                    {formData.accepts_silver && <Badge variant="outline">Accepts Silver</Badge>}
                    <Badge>{tiers.find(t => t.id === formData.subscription_tier)?.name} Plan</Badge>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Location:</span>
                    <p className="font-medium">{formData.city}{formData.address ? `, ${formData.address}` : ''}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Service Area:</span>
                    <p className="font-medium">{formData.service_area || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Phone:</span>
                    <p className="font-medium">{formData.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <p className="font-medium">{formData.email || 'Not provided'}</p>
                  </div>
                </div>

                {formData.services.filter(s => s.name).length > 0 && (
                  <div>
                    <span className="text-sm text-slate-500">Services:</span>
                    <div className="mt-2 space-y-2">
                      {formData.services.filter(s => s.name).map((service, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{service.name}</span>
                          {service.starting_price && (
                            <span className="font-medium">From ${service.starting_price}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {formData.photos.length > 0 && (
                  <div>
                    <span className="text-sm text-slate-500">Photos:</span>
                    <div className="flex gap-2 mt-2">
                      {formData.photos.map((photo, idx) => (
                        <img key={idx} src={photo} alt="" className="h-16 w-16 rounded-lg object-cover" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className="bg-slate-900 hover:bg-slate-800"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createBusiness.isPending}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {createBusiness.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Listing'
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}