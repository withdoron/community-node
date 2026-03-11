import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HardHat, Loader2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

// ═══ Step Indicator ═══

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i + 1 === current
              ? 'w-8 bg-amber-500'
              : i + 1 < current
                ? 'w-2 bg-amber-500/60'
                : 'w-2 bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
}

// ═══ Default values ═══

const DEFAULT_PHASE_LABELS = ['Before', 'Demo', 'Framing', 'Rough-in', 'Finish', 'Final'];

const WORKSPACE_FEATURES = [
  'Project tracking',
  'Daily logging with photos and voice',
  'Client estimates and payment tracking',
  'Permit and inspection tracking',
];

// ═══ Main Component ═══

export default function FieldServiceOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  // Step 1: Your Business
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 2: Your Rates
  const [hourlyRate, setHourlyRate] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [tagline, setTagline] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // ─── Create workspace mutation ────────────────────
  const createWorkspace = useMutation({
    mutationFn: async () => {
      const profile = await base44.entities.FieldServiceProfile.create({
        user_id: currentUser.id,
        workspace_name: businessName.trim() || 'My Field Service',
        business_name: businessName.trim() || '',
        owner_name: ownerName.trim() || '',
        license_number: licenseNumber.trim() || '',
        phone: phone.trim() || '',
        email: email.trim() || '',
        website: '',
        hourly_rate: parseFloat(hourlyRate) || 0,
        service_area: serviceArea.trim() || '',
        tagline: tagline.trim() || '',
        workers_json: [],
        user_roles: [],
        default_terms: '',
        phase_labels: DEFAULT_PHASE_LABELS,
        linked_business_workspace_id: null,
        linked_finance_workspace_id: null,
        brand_color: null,
        logo_url: null,
      });
      return profile;
    },
    onSuccess: (profile) => {
      toast.success('Field Service workspace created');
      navigate(createPageUrl('BusinessDashboard') + '?fieldservice=' + profile.id);
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to create workspace');
    },
  });

  // ─── Validation ─────────────────────────────────
  const step1Valid = businessName.trim().length > 0 && ownerName.trim().length > 0;

  // ─── Loading gate ─────────────────────────────────
  if (!currentUser?.id) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <HardHat className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Create a Field Service Workspace</h1>
            <p className="text-sm text-slate-400">
              {step === 1 && 'Tell us about your business'}
              {step === 2 && 'Set your rates and service area'}
              {step === 3 && "You're all set"}
            </p>
          </div>
        </div>

        <StepIndicator current={step} total={3} />

        {/* ═══ Step 1: Your Business ═══ */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-1">
                Your Business
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                This information appears on your estimates and client portal.
              </p>

              <div className="space-y-4">
                <div>
                  <Label className="text-slate-400">Business name *</Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="What's your business name?"
                    autoFocus
                  />
                </div>

                <div>
                  <Label className="text-slate-400">Your name *</Label>
                  <Input
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <Label className="text-slate-400">License/CCB number (optional)</Label>
                  <Input
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="License/CCB number"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-400">Business phone</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      placeholder="(541) 555-0100"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400">Business email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 min-h-[44px] disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ Step 2: Your Rates ═══ */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-1">
                Your Rates
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                You can always change these in Settings.
              </p>

              <div className="space-y-4">
                <div>
                  <Label className="text-slate-400">Default hourly labor rate</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="pl-7 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      placeholder="65.00"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    This is your standard hourly labor rate. Workers can have individual rates.
                  </p>
                </div>

                <div>
                  <Label className="text-slate-400">Service area</Label>
                  <Input
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                    className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="e.g., Eugene-Springfield area"
                  />
                </div>

                <div>
                  <Label className="text-slate-400">Tagline (optional)</Label>
                  <Input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="A short description of your business"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 min-h-[44px]"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ Step 3: Ready to Go ═══ */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-1">
                Ready to Go
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                Here's what you've set up.
              </p>

              {/* Summary */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Business</span>
                  <span className="text-slate-100 font-medium">{businessName || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Owner</span>
                  <span className="text-slate-100">{ownerName || '—'}</span>
                </div>
                {licenseNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">License</span>
                    <span className="text-slate-100">{licenseNumber}</span>
                  </div>
                )}
                {hourlyRate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Hourly rate</span>
                    <span className="text-amber-500 font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(hourlyRate) || 0)}
                    </span>
                  </div>
                )}
                {serviceArea && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Service area</span>
                    <span className="text-slate-100">{serviceArea}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-800 pt-6">
                <p className="text-sm text-slate-300 mb-3">Your workspace includes:</p>
                <ul className="space-y-2">
                  {WORKSPACE_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-slate-400">
                      <Check className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => createWorkspace.mutate()}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 min-h-[44px]"
                disabled={createWorkspace.isPending}
              >
                {createWorkspace.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create Workspace'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
