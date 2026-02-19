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
  Check, Star, Zap, Crown, Store, Briefcase, Heart, Ticket
} from "lucide-react";
import Step2Details from '@/components/onboarding/Step2Details';
import { ONBOARDING_CONFIG } from '@/config/onboardingConfig';

const ARCHETYPE_ICON_MAP = { Store, Briefcase, Heart, Ticket };

export default function BusinessOnboarding() {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [uploading, setUploading] = useState(false);

  const activeSteps = ONBOARDING_CONFIG.steps.filter(s => s.active);
  const currentStepId = activeSteps[currentStepIndex]?.id;

  const [formData, setFormData] = useState({
    archetype: '',
    archetype_id: '',
    name: '',
    primary_category: '',
    sub_category: '',
    sub_category_id: '',
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
    goals: [],
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

  // Fetch archetypes from database (only needed for archetype_id on save)
  const { data: dbArchetypes = [] } = useQuery({
    queryKey: ['archetypes'],
    queryFn: () => base44.entities.Archetype.list()
  });

  const visibleArchetypes = ONBOARDING_CONFIG.archetypes.filter(a => a.active);

  // Scroll to top when step changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStepIndex]);

  const createBusiness = useMutation({
    mutationFn: async (data) => {
      const business = await base44.entities.Business.create({
        ...data,
        owner_user_id: currentUser?.id,
        owner_email: currentUser?.email,
        slug: data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        is_active: true,
        sub_category_id: data.sub_category_id || null
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
    switch (currentStepId) {
      case 'archetype':
        return !!formData.archetype;
      case 'details': {
        if (!formData.name || !formData.city || !formData.zip_code || !formData.phone || !formData.email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) return false;
        if ((formData.archetype === 'location' || formData.archetype === 'venue' || formData.archetype === 'location_venue') && (!formData.address || !formData.state)) return false;
        if (formData.display_full_address && (!formData.address || !formData.state)) return false;
        return true;
      }
      case 'goals':
        return Array.isArray(formData.goals) && formData.goals.length > 0;
      case 'plan':
        return !!formData.subscription_tier;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    const activeStepIds = activeSteps.map(s => s.id);
    const goals = activeStepIds.includes('goals') ? (formData.goals || []) : ONBOARDING_CONFIG.defaults.goals;
    const subscription_tier = activeStepIds.includes('plan') ? (formData.subscription_tier || 'basic') : ONBOARDING_CONFIG.defaults.tier;

    const cleanedServices = (formData.services || [])
      .filter(s => s.name)
      .map(s => ({
        ...s,
        starting_price: s.starting_price ? parseFloat(s.starting_price) : null
      }));

    const dbArch = dbArchetypes.find(d =>
      d.slug === formData.archetype ||
      d.id === formData.archetype ||
      (formData.archetype && formData.archetype.includes(d.slug)) ||
      (d.slug && formData.archetype && d.slug.includes(formData.archetype))
    );
    const submitData = {
      ...formData,
      archetype_id: dbArch?.id || null,
      goals,
      subscription_tier,
      services: cleanedServices
    };
    createBusiness.mutate(submitData);
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
              if (currentStepIndex === 0) {
                navigate(createPageUrl('BusinessDashboard'));
              } else {
                setCurrentStepIndex(currentStepIndex - 1);
                if (currentStepIndex === 1 && currentStepId === 'details') {
                  setFormData(prev => ({ ...prev, archetype: '', archetype_id: '' }));
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
        {/* Progress — active steps only */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {activeSteps.map((step, idx) => (
              <div key={step.id} className={`flex items-center ${idx < activeSteps.length - 1 ? 'flex-1' : ''}`}>
                <div className={`
                  h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${idx <= currentStepIndex ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-500'}
                `}>
                  {idx < currentStepIndex ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                {idx < activeSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${idx < currentStepIndex ? 'bg-amber-500' : 'bg-slate-800'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs">
            {activeSteps.map((step, idx) => (
              <span key={step.id} className={idx <= currentStepIndex ? 'text-slate-100 font-medium' : 'text-slate-500'}>
                {step.label}
              </span>
            ))}
          </div>
        </div>

        <Card className="p-6 sm:p-8 bg-slate-900 border-slate-800">
          {/* Step: Archetype (Type) */}
          {currentStepId === 'archetype' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-100">How do you serve the community?</h2>
                <p className="text-slate-400 mt-2">Choose the option that best fits your business or group.</p>
              </div>
              {visibleArchetypes.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 mb-4">No archetypes configured. Please contact an administrator.</p>
                  <Button onClick={() => navigate(createPageUrl('Admin'))} variant="outline" className="border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500">
                    Go to Admin
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 mt-8">
                  {visibleArchetypes.map((arch) => {
                    const Icon = ARCHETYPE_ICON_MAP[arch.icon] || Store;
                    const isSelected = formData.archetype === arch.value;
                    return (
                      <div
                        key={arch.value}
                        onClick={() => {
                          const dbArch = dbArchetypes.find(d =>
                            d.slug === arch.value ||
                            d.id === arch.value ||
                            (arch.value && arch.value.includes(d.slug)) ||
                            (d.slug && arch.value && d.slug.includes(arch.value))
                          );
                          setFormData({ ...formData, archetype: arch.value, archetype_id: dbArch?.id || '' });
                          setTimeout(() => setCurrentStepIndex(1), 500);
                        }}
                        className={`group p-6 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 bg-slate-800/50 hover:border-amber-500/50 hover:bg-slate-800'}`}
                      >
                        <div className="flex flex-col items-center text-center">
                          <div className={`h-20 w-20 rounded-xl flex items-center justify-center mb-4 ${isSelected ? 'bg-amber-500/20' : 'bg-slate-700/50'}`}>
                            <Icon className="h-10 w-10 text-amber-500" />
                          </div>
                          <h3 className={`font-bold text-xl mb-2 transition-colors ${isSelected ? 'text-amber-500' : 'text-slate-100 group-hover:text-amber-500'}`}>{arch.label}</h3>
                          <p className="text-sm text-slate-400 mb-3 max-w-md">{arch.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step: Details */}
          {currentStepId === 'details' && (
            <Step2Details formData={formData} setFormData={setFormData} uploading={uploading} setUploading={setUploading} />
          )}

          {/* Step: Goals (config-driven when active) */}
          {currentStepId === 'goals' && (() => {
            const availableGoals = ONBOARDING_CONFIG.goalsByArchetype[formData.archetype] || [];
            const visibleGoals = ONBOARDING_CONFIG.goals.filter(g => g.active && availableGoals.includes(g.value));
            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">What are your goals?</h2>
                  <p className="text-slate-400 mt-1">Select all that apply (choose at least one)</p>
                </div>
                <div className="flex flex-col gap-3">
                  {visibleGoals.map((goal) => {
                    const selected = (formData.goals || []).includes(goal.value);
                    return (
                      <div
                        key={goal.value}
                        onClick={() => {
                          const next = selected ? (formData.goals || []).filter(g => g !== goal.value) : [...(formData.goals || []), goal.value];
                          setFormData({ ...formData, goals: next });
                        }}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${selected ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}
                      >
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? 'bg-amber-500/20' : 'bg-slate-700'}`}>
                          <Check className={`h-5 w-5 ${selected ? 'text-amber-500' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-100">{goal.label}</h3>
                          <p className="text-sm text-slate-400">{goal.description}</p>
                        </div>
                        {selected && <Check className="h-6 w-6 text-amber-500 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Step: Plan (tier selection when active) */}
          {currentStepId === 'plan' && (() => {
            const visibleTiers = ONBOARDING_CONFIG.tiers.filter(t => t.active);
            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">Choose your plan</h2>
                  <p className="text-slate-400 mt-1">Select the tier that works best for your organization</p>
                </div>
                <RadioGroup value={formData.subscription_tier} onValueChange={(v) => setFormData({ ...formData, subscription_tier: v })} className="grid gap-4">
                  {visibleTiers.map((tier) => (
                    <label key={tier.value} className={`relative flex cursor-pointer rounded-xl border-2 p-5 transition-all ${formData.subscription_tier === tier.value ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 hover:border-slate-600'}`}>
                      <RadioGroupItem value={tier.value} className="sr-only" />
                      <div className="flex-1 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-slate-800">
                          <Star className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-100">{tier.label}</h3>
                          <p className="text-slate-400">{tier.price}</p>
                        </div>
                      </div>
                      {formData.subscription_tier === tier.value && (
                        <div className="absolute top-4 right-4 h-6 w-6 bg-amber-500 rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-black" />
                        </div>
                      )}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            );
          })()}

          {/* Step: Review */}
          {currentStepId === 'review' && (() => {
            const activeStepIds = activeSteps.map(s => s.id);
            const tierLabel = ONBOARDING_CONFIG.tiers.find(t => t.value === (formData.subscription_tier || ONBOARDING_CONFIG.defaults.tier))?.label || formData.subscription_tier;
            return (
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
                      <Badge variant="secondary">{ONBOARDING_CONFIG.archetypes.find(a => a.value === formData.archetype)?.label || formData.archetype}</Badge>
                      <Badge variant="secondary">{formData.primary_category}</Badge>
                      {formData.sub_category && <Badge variant="outline">{formData.sub_category}</Badge>}
                      {formData.accepts_silver && <Badge variant="outline">Accepts Silver</Badge>}
                      <Badge>{tierLabel} Plan</Badge>
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
                  {activeStepIds.includes('goals') && Array.isArray(formData.goals) && formData.goals.length > 0 && (
                    <div>
                      <span className="text-sm text-slate-500">Goals:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(formData.goals || []).map((g) => (
                          <Badge key={g} variant="outline">{ONBOARDING_CONFIG.goals.find(go => go.value === g)?.label || g}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeStepIds.includes('plan') && (
                    <div>
                      <span className="text-sm text-slate-500">Plan:</span>
                      <p className="font-medium text-slate-200 mt-1">{tierLabel}</p>
                    </div>
                  )}
                  {(formData.services || []).filter(s => s.name).length > 0 && (
                    <div>
                      <span className="text-sm text-slate-500">Services:</span>
                      <div className="mt-2 space-y-2">
                        {formData.services.filter(s => s.name).map((service, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-slate-200">{service.name}</span>
                            {service.starting_price && <span className="font-medium">From ${service.starting_price}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(formData.photos || []).length > 0 && (
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
            );
          })()}

          {/* Navigation — only show when not on first step (archetype can auto-advance) */}
          {currentStepIndex > 0 && (
            <div className="flex justify-between mt-8 pt-6 border-t border-slate-700">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentStepIndex(currentStepIndex - 1);
                  if (currentStepIndex === 1) setFormData(prev => ({ ...prev, archetype: '', archetype_id: '' }));
                }}
                className="px-6 py-2 rounded-lg border border-slate-600 text-slate-300 bg-transparent hover:border-amber-500 hover:text-amber-500 hover:bg-slate-800/50 transition-all duration-200"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              {currentStepIndex < activeSteps.length - 1 ? (
                <Button onClick={() => setCurrentStepIndex(currentStepIndex + 1)} disabled={!canProceed()} className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5">
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={createBusiness.isPending} className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5">
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