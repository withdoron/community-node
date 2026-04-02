import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { generateInviteCode } from '@/utils/inviteCode';

// ═══ Step Indicator ═══

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i + 1 === current
              ? 'w-8 bg-primary'
              : i + 1 < current
                ? 'w-2 bg-primary/60'
                : 'w-2 bg-surface'
          }`}
        />
      ))}
    </div>
  );
}

// ═══ Constants ═══

const PROPERTY_TYPES = [
  { value: 'long_term', label: 'Long-term rental' },
  { value: 'short_term', label: 'Short-term rental' },
  { value: 'both', label: 'Both' },
];

const MANAGER_ROLES = [
  { value: 'owner_operator', label: 'Owner-operator' },
  { value: 'property_manager', label: 'Property manager' },
  { value: 'investor', label: 'Investor' },
];

const STRUCTURE_TYPES = [
  { value: 'single', label: 'Single family' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'triplex', label: 'Triplex' },
  { value: 'fourplex', label: 'Fourplex' },
  { value: 'apartment_building', label: 'Apartment building' },
  { value: 'other', label: 'Other' },
];

const WORKSPACE_FEATURES = [
  'Property and unit tracking',
  'Expense and labor logging',
  'Maintenance request management',
  'Monthly settlement waterfall',
  'Owner distribution calculations',
  'Reserve fund tracking',
];

// ═══ Main Component ═══

export default function PropertyManagementOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  // Step 1: Property Info
  const [propertyType, setPropertyType] = useState('long_term');
  const [managerRole, setManagerRole] = useState('owner_operator');
  const [businessName, setBusinessName] = useState('');

  // Step 2: First Property
  const [propertyName, setPropertyName] = useState('');
  const [structureType, setStructureType] = useState('single');
  const [numUnits, setNumUnits] = useState(1);
  const [unitName, setUnitName] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isShortTerm = propertyType === 'short_term';
  const rentLabel = isShortTerm ? 'Nightly rate' : 'Monthly rent';

  // ─── Create workspace mutation ────────────────────
  const createWorkspace = useMutation({
    mutationFn: async () => {
      // 1. Create PMPropertyProfile
      const profile = await base44.entities.PMPropertyProfile.create({
        user_id: currentUser.id,
        workspace_name: businessName.trim() || 'My Properties',
        property_types: propertyType,
        manager_role: managerRole,
        business_name: businessName.trim() || '',
        manager_name: currentUser?.full_name || currentUser?.data?.display_name || '',
        manager_email: currentUser?.email || '',
        manager_phone: '',
        default_mgmt_fee_pct: 10,
        default_maint_reserve_pct: 10,
        default_emerg_reserve_pct: 5,
        tenant_invite_code: generateInviteCode(),
        owner_invite_code: generateInviteCode(),
        manager_invite_code: generateInviteCode(),
        user_roles: '[]',
        linked_finance_workspace_id: null,
        linked_business_workspace_id: null,
      });

      // Create admin workspace member for the creator
      try {
        await base44.entities.PMWorkspaceMember.create({
          profile_id: profile.id,
          user_id: currentUser.id,
          role: 'admin',
          name: currentUser?.full_name || currentUser?.data?.display_name || '',
          status: 'active',
          joined_at: new Date().toISOString(),
        });
      } catch (err) {
        // PMWorkspaceMember entity may not exist yet — non-critical
        console.error('PMWorkspaceMember create (non-critical):', err);
      }

      // 2. Create PMPropertyGroup
      const group = await base44.entities.PMPropertyGroup.create({
        profile_id: profile.id,
        name: propertyName.trim(),
        address: '',
        structure_type: structureType,
        description: '',
        management_fee_pct: 10,
        maintenance_reserve_pct: 10,
        emergency_reserve_pct: 5,
        emergency_reserve_target: 0,
        has_insurance: false,
        insurance_notes: '',
      });

      // 3. Create first PMProperty
      await base44.entities.PMProperty.create({
        profile_id: profile.id,
        group_id: group.id,
        name: unitName.trim() || propertyName.trim(),
        unit_label: unitName.trim() || '',
        property_type: structureType === 'single' ? 'single_family' : 'duplex_unit',
        address: '',
        monthly_rent: isShortTerm ? 0 : (parseFloat(monthlyRent) || 0),
        nightly_rate: isShortTerm ? (parseFloat(monthlyRent) || 0) : 0,
        bedrooms: parseInt(bedrooms) || 0,
        bathrooms: parseInt(bathrooms) || 0,
        has_garage: false,
        status: 'vacant',
        tenant_name: '',
        tenant_email: '',
        tenant_phone: '',
        lease_start: '',
        lease_end: '',
        notes: '',
      });

      return profile;
    },
    onSuccess: (profile) => {
      toast.success('Property Management space created');
      navigate(createPageUrl('MyLane'));
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to create space');
    },
  });

  // ─── Validation ─────────────────────────────────
  const step2Valid = propertyName.trim().length > 0;

  // ─── Loading gate ─────────────────────────────────
  if (!currentUser?.id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Create a Property Management Space</h1>
            <p className="text-sm text-muted-foreground">
              {step === 1 && 'Tell us about your properties'}
              {step === 2 && 'Add your first property'}
              {step === 3 && "You're all set"}
            </p>
          </div>
        </div>

        <StepIndicator current={step} total={3} />

        {/* ═══ Step 1: Property Info ═══ */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Property Info
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                What kind of properties do you manage?
              </p>

              <div className="space-y-6">
                {/* Property Type */}
                <div className="space-y-3">
                  <Label className="text-muted-foreground">Property type</Label>
                  {PROPERTY_TYPES.map((t) => (
                    <label
                      key={t.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors min-h-[44px] ${
                        propertyType === t.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-secondary hover:border-border'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          propertyType === t.value
                            ? 'border-primary'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {propertyType === t.value && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="text-sm text-foreground">{t.label}</span>
                      <input
                        type="radio"
                        name="propertyType"
                        value={t.value}
                        checked={propertyType === t.value}
                        onChange={() => setPropertyType(t.value)}
                        className="sr-only"
                      />
                    </label>
                  ))}
                </div>

                {/* Manager Role */}
                <div className="space-y-3">
                  <Label className="text-muted-foreground">Your role</Label>
                  {MANAGER_ROLES.map((r) => (
                    <label
                      key={r.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors min-h-[44px] ${
                        managerRole === r.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-secondary hover:border-border'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          managerRole === r.value
                            ? 'border-primary'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {managerRole === r.value && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <span className="text-sm text-foreground">{r.label}</span>
                      <input
                        type="radio"
                        name="managerRole"
                        value={r.value}
                        checked={managerRole === r.value}
                        onChange={() => setManagerRole(r.value)}
                        className="sr-only"
                      />
                    </label>
                  ))}
                </div>

                {/* Business Name */}
                <div>
                  <Label className="text-muted-foreground">Business name (optional)</Label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
                    placeholder="e.g., Fletcher Properties LLC"
                  />
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    This becomes your space name. Defaults to "My Properties" if left blank.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-6 min-h-[44px]"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ Step 2: First Property ═══ */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Your First Property
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                You can always add more properties later.
              </p>

              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Property name or address *</Label>
                  <Input
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
                    placeholder="e.g., Oregon Duplex or 123 Main St"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Structure type</Label>
                    <select
                      value={structureType}
                      onChange={(e) => setStructureType(e.target.value)}
                      className="w-full mt-1 h-10 px-3 bg-secondary border border-border text-foreground rounded-md focus:border-primary focus:ring-1 focus:ring-ring"
                    >
                      {STRUCTURE_TYPES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Number of units</Label>
                    <Input
                      type="number"
                      min="1"
                      value={numUnits}
                      onChange={(e) => setNumUnits(parseInt(e.target.value) || 1)}
                      className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-sm text-foreground-soft mb-3">First unit details</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Unit name/label</Label>
                  <Input
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
                    placeholder='e.g., "Unit A" or "Main House"'
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{rentLabel}</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={monthlyRent}
                        onChange={(e) => setMonthlyRent(e.target.value)}
                        className="pl-7 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
                        placeholder={isShortTerm ? '150.00' : '1,200.00'}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Bedrooms</Label>
                    <Input
                      type="number"
                      min="0"
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                      className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Bathrooms</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                      className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
                      placeholder="1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!step2Valid}
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-6 min-h-[44px] disabled:opacity-50"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ Step 3: Review ═══ */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Ready to Go
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Your property management space is ready.
              </p>

              {/* Summary */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Space</span>
                  <span className="text-foreground font-medium">{businessName || 'My Properties'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Property type</span>
                  <span className="text-foreground">{PROPERTY_TYPES.find((t) => t.value === propertyType)?.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your role</span>
                  <span className="text-foreground">{MANAGER_ROLES.find((r) => r.value === managerRole)?.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">First property</span>
                  <span className="text-foreground font-medium">{propertyName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Structure</span>
                  <span className="text-foreground">{STRUCTURE_TYPES.find((s) => s.value === structureType)?.label}</span>
                </div>
                {monthlyRent && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{rentLabel}</span>
                    <span className="text-primary font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(monthlyRent) || 0)}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-6">
                <p className="text-sm text-foreground-soft mb-3">Your space includes:</p>
                <ul className="space-y-2">
                  {WORKSPACE_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 mt-6">
                <p className="text-xs text-muted-foreground">
                  You can invite property owners and workers from the People tab after your space is created.
                </p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent min-h-[44px]"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => createWorkspace.mutate()}
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-6 min-h-[44px]"
                disabled={createWorkspace.isPending}
              >
                {createWorkspace.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create Space'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
