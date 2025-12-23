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
  Check, Star, Zap, Crown, Store, Briefcase, Heart, Ticket, Compass
} from "lucide-react";
import { ARCHETYPE_CATEGORIES } from '@/components/categories/archetypeCategories';
import Step2Details from '@/components/onboarding/Step2Details';
import Step3Goals from '@/components/onboarding/Step3Goals';

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

const archetypes = [
  {
    id: 'explorer',
    icon: Compass,
    title: 'Local Explorer',
    description: 'I want to support local and discover hidden gems.',
    examples: 'Tailor your feed to your interests.',
    isHelperText: true,
    featured: true
  },
  {
    id: 'venue',
    icon: Store,
    title: 'Location / Venue',
    description: 'I have a physical space for customers to visit.',
    examples: 'Gym, Restaurant, Shop, Gallery'
  },
  {
    id: 'service',
    icon: Briefcase,
    title: 'Service Provider',
    description: 'I offer mobile services or professional skills.',
    examples: 'Instructor, Plumber, Consultant, Artist'
  },
  {
    id: 'organizer',
    icon: Ticket,
    title: 'Event Organizer',
    description: 'I host pop-ups, festivals, markets, or meetups.',
    examples: 'Concerts, Markets, Meetups, Nightlife'
  },
  {
    id: 'non_profit',
    icon: Heart,
    title: 'Community / Non-Profit',
    description: 'I lead a group, cause, church, or congregation.',
    examples: 'Social Club, Church, HOA, Charity'
  }
];

const steps = ['Archetype', 'Details', 'Goals', 'Choose Plan', 'Review'];

export default function BusinessOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    archetype: '',
    name: '',
    primary_category: '',
    sub_category: '',
    description: '',
    address: '',
    city: '',
    state: 'OR',
    zip_code: '',
    phone: '',
    email: '',
    website: '',
    display_full_address: false,
    service_area: '',
    primary_skill: '',
    organization_type: '',
    typical_event_size: '',
    selected_goals: [],
    accepts_silver: false,
    photos: [],
    services: [{ name: '', starting_price: '', description: '' }],
    subscription_tier: 'basic'
  });



  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Scroll to top when step changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const createBusiness = useMutation({
    mutationFn: async (data) => {
      const tier = tiers.find(t => t.id === data.subscription_tier);
      const business = await base44.entities.Business.create({
        ...data,
        owner_user_id: currentUser?.id,
        owner_email: currentUser?.email,
        slug: data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        bumps_remaining: tier?.bumps || 0,
        is_active: true
      });

      // Update user to be a business owner (if not already)
      if (!currentUser?.is_business_owner) {
        await base44.auth.updateMe({
          is_business_owner: true
        });
      }

      return business;
    },
    onSuccess: (business) => {
      navigate(createPageUrl('BusinessDashboard'));
    }
  });



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



  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.archetype;
      case 1:
        // Required: name, category, city, zip, phone, email
        if (!formData.name || !formData.primary_category || !formData.city || !formData.zip_code || !formData.phone || !formData.email) {
          return false;
        }
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          return false;
        }
        // Venue: full address required (street + state)
        if ((formData.archetype === 'location' || formData.archetype === 'venue') && (!formData.address || !formData.state)) {
          return false;
        }
        // Others: if display_full_address is true, address and state are required
        if (formData.display_full_address && (!formData.address || !formData.state)) {
          return false;
        }
        return true;
      case 2:
        return formData.goals && formData.goals.length > 0;
      case 3:
        return formData.subscription_tier;
      case 4:
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
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              if (currentStep === 0) {
                navigate(createPageUrl('BusinessDashboard'));
              } else {
                const newStep = currentStep - 1;
                setCurrentStep(newStep);
                if (newStep === 0) {
                  setFormData({ ...formData, archetype: '' });
                }
              }
            }}
            className="px-6 py-2 rounded-lg border border-slate-600 text-slate-300 bg-transparent hover:border-amber-500 hover:text-amber-500 hover:bg-slate-800/50 transition-all duration-200"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
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
                    ? 'bg-amber-500 text-black' 
                    : 'bg-slate-800 text-slate-500'}
                `}>
                  {idx < currentStep ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${idx < currentStep ? 'bg-amber-500' : 'bg-slate-800'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs">
            {steps.map((step, idx) => (
              <span 
                key={step}
                className={idx <= currentStep ? 'text-slate-100 font-medium' : 'text-slate-500'}
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        <Card className="p-6 sm:p-8 bg-slate-900 border-slate-800">
          {/* Step 0: Archetype Selector */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-100">How will you use Local Lane?</h2>
                <p className="text-slate-400 mt-2">Choose the option that best describes you.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                {archetypes.map((archetype) => {
                  const Icon = archetype.icon;
                  return (
                    <div
                      key={archetype.id}
                      onClick={() => {
                        setFormData({ ...formData, archetype: archetype.id });
                        setTimeout(() => setCurrentStep(1), 500);
                      }}
                      className={`
                        group p-6 rounded-lg border-2 cursor-pointer transition-all
                        ${archetype.featured ? 'md:col-span-2' : ''}
                        ${formData.archetype === archetype.id
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-800 bg-slate-900 hover:border-amber-500/50'}
                      `}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className={`
                          h-16 w-16 rounded-lg flex items-center justify-center mb-4
                          ${formData.archetype === archetype.id ? 'bg-amber-500/20' : 'bg-amber-500/10'}
                        `}>
                          <Icon className={`h-8 w-8 ${formData.archetype === archetype.id ? 'text-amber-500' : 'text-amber-500'}`} />
                        </div>
                        <h3 className={`font-bold text-lg mb-2 transition-colors ${formData.archetype === archetype.id ? '!text-amber-500' : 'text-slate-100 group-hover:!text-amber-500'}`}>{archetype.title}</h3>
                        <p className="text-sm text-slate-400 mb-3">{archetype.description}</p>
                        <p className={`text-xs ${archetype.isHelperText ? 'text-slate-500 italic' : 'text-slate-500'}`}>
                          {archetype.isHelperText ? archetype.examples : `Examples: ${archetype.examples}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1: Details */}
          {currentStep === 1 && (
            <Step2Details 
              formData={formData}
              setFormData={setFormData}
              uploading={uploading}
              setUploading={setUploading}
            />
          )}

          {/* Step 2: Goals */}
          {currentStep === 2 && (
            <Step3Goals 
              formData={formData}
              setFormData={setFormData}
            />
          )}

          {/* Step 3: Services */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-100">Add your services</h2>
                <p className="text-slate-400 mt-1">List the services you offer with starting prices (optional)</p>
              </div>

              <div className="space-y-4">
                {formData.services.map((service, idx) => (
                  <div key={idx} className="p-4 border border-slate-700 rounded-lg bg-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-slate-200">Service {idx + 1}</span>
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
                        className="bg-slate-900 border-slate-700 text-slate-100"
                      />
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Input
                          type="number"
                          value={service.starting_price}
                          onChange={(e) => updateService(idx, 'starting_price', e.target.value)}
                          placeholder="Starting price ($)"
                          className="bg-slate-900 border-slate-700 text-slate-100"
                        />
                        <Input
                          value={service.description}
                          onChange={(e) => updateService(idx, 'description', e.target.value)}
                          placeholder="Brief description"
                          className="bg-slate-900 border-slate-700 text-slate-100"
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

          {/* Step 4: Choose Plan */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-100">Choose your plan</h2>
                <p className="text-slate-400 mt-1">Select the tier that works best for your organization</p>
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
                          ? 'border-amber-500 bg-amber-500/10' 
                          : 'border-slate-700 hover:border-slate-600'}
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
                              <h3 className="font-semibold text-slate-100">{tier.name}</h3>
                              {tier.popular && (
                                <Badge className="bg-amber-500 text-black border-0">Popular</Badge>
                              )}
                            </div>
                            <p className="text-2xl font-bold text-slate-100">
                              {tier.price}
                              <span className="text-sm font-normal text-slate-400">{tier.period}</span>
                            </p>
                          </div>
                        </div>
                        <ul className="mt-4 space-y-2">
                          {tier.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                              <Check className="h-4 w-4 text-amber-500 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {formData.subscription_tier === tier.id && (
                        <div className="absolute top-4 right-4">
                          <div className="h-6 w-6 bg-amber-500 rounded-full flex items-center justify-center">
                            <Check className="h-4 w-4 text-black" />
                          </div>
                        </div>
                      )}
                    </label>
                  );
                })}
              </RadioGroup>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-100">Review your listing</h2>
                <p className="text-slate-400 mt-1">Make sure everything looks good</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                  <h3 className="font-semibold text-slate-100">{formData.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{formData.description || 'No description'}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="secondary">{formData.primary_category}</Badge>
                    {formData.sub_category && <Badge variant="outline">{formData.sub_category}</Badge>}
                    {formData.accepts_silver && <Badge variant="outline">Accepts Silver</Badge>}
                    <Badge>{tiers.find(t => t.id === formData.subscription_tier)?.name} Plan</Badge>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Location:</span>
                    <p className="font-medium text-slate-200">
                      {formData.address && `${formData.address}, `}
                      {formData.city}
                      {formData.state && `, ${formData.state}`}
                      {formData.zip_code && ` ${formData.zip_code}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Phone:</span>
                    <p className="font-medium text-slate-200">{formData.phone}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <p className="font-medium text-slate-200">{formData.email}</p>
                  </div>
                  {formData.website && (
                    <div>
                      <span className="text-slate-500">Website:</span>
                      <p className="font-medium text-slate-200">{formData.website}</p>
                    </div>
                  )}
                </div>

                {formData.services.filter(s => s.name).length > 0 && (
                  <div>
                    <span className="text-sm text-slate-500">Services:</span>
                    <div className="mt-2 space-y-2">
                      {formData.services.filter(s => s.name).map((service, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-slate-200">{service.name}</span>
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
          {currentStep !== 0 && (
            <div className="flex justify-between mt-8 pt-6 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={() => {
                const newStep = currentStep - 1;
                setCurrentStep(newStep);
                if (newStep === 0) {
                  setFormData({ ...formData, archetype: '' });
                }
              }}
              disabled={currentStep === 0}
              className="px-6 py-2 rounded-lg border border-slate-600 text-slate-300 bg-transparent hover:border-amber-500 hover:text-amber-500 hover:bg-slate-800/50 transition-all duration-200"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                Continue
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={createBusiness.isPending}
                className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                {createBusiness.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
              )}
              </div>
              )}
              </Card>
              </div>
              </div>
              );
              }