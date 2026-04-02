import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getFriendlyErrorMessage } from '@/lib/errorMessages';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Loader2, Lock } from 'lucide-react';
import { HouseholdManager } from '@/components/mylane/HouseholdManager';
import { format } from 'date-fns';
import { toast } from 'sonner';

function formatPhoneNumber(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const COMMUNITY_OPTIONS = [
  { value: 'greater_eugene', label: 'Greater Eugene Area' },
  { value: 'portland_metro', label: 'Portland Metro (Coming Soon)', disabled: true },
  { value: 'bend_area', label: 'Bend Area (Coming Soon)', disabled: true },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    home_region: 'greater_eugene',
  });
  const [hasChanges, setHasChanges] = useState(false);

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    }
  });

  useEffect(() => {
    if (currentUser && !hasChanges) {
      const rawPhone = (currentUser.data?.phone || currentUser.phone || '').toString().replace(/\D/g, '').slice(0, 10);
      setFormData({
        full_name: currentUser.data?.display_name || currentUser.data?.full_name || currentUser.full_name || '',
        phone: rawPhone,
        home_region: currentUser.data?.home_region || 'greater_eugene',
      });
    }
  }, [currentUser]);

  const updateUserMutation = useMutation({
    mutationFn: async (updates) => {
      await base44.functions.invoke('updateUser', {
        action: 'update_profile',
        data: {
          display_name: updates.full_name,
          phone: updates.phone,
          home_region: updates.home_region,
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['mylane'] });
      toast.success('Settings saved');
      setFormData({
        full_name: variables.full_name,
        phone: variables.phone,
        home_region: variables.home_region,
      });
      setHasChanges(false);
      // Navigate back to MyLane after save
      navigate(createPageUrl('MyLane'));
    },
    onError: (error) => {
      console.error('Settings save error:', error);
      toast.error(getFriendlyErrorMessage(error, 'Failed to save settings. Please try again.'));
    }
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateUserMutation.mutate({
      full_name: formData.full_name,
      phone: formData.phone,
      home_region: formData.home_region,
    });
  };

  if (!userLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-3">Settings</h1>
          <p className="text-muted-foreground mb-6">Please sign in to manage your settings.</p>
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const memberSince = currentUser?.created_date
    ? format(new Date(currentUser.created_date), 'MMMM yyyy')
    : 'Unknown';
  const accountType = currentUser?.data?.tier || 'Free';
  const displayNameForAvatar = currentUser?.data?.display_name || currentUser?.data?.full_name || currentUser?.full_name;
  const initials = displayNameForAvatar
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            to={createPageUrl('MyLane')}
            className="text-muted-foreground hover:text-primary text-sm flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to My Lane
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
            </div>
            {/* Photo upload disabled for now */}
            <p className="text-xs text-muted-foreground/70">Profile photo coming soon</p>
          </div>

          {/* Profile Section */}
          <div>
            <div className="border-b border-border pb-2 mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Profile
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name" className="text-sm font-medium text-foreground-soft mb-1">
                  Display Name *
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  className="bg-secondary border-border text-foreground rounded-lg focus:border-primary focus:ring-ring/20"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-foreground-soft mb-1">
                  Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    value={currentUser?.email || ''}
                    className="bg-secondary/50 border-border/50 text-muted-foreground/70 rounded-lg cursor-not-allowed pr-10"
                    readOnly
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-foreground-soft mb-1">
                  Phone (optional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formatPhoneNumber(formData.phone)}
                  onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="(541) 555-1234"
                  className="bg-secondary border-border text-foreground rounded-lg focus:border-primary focus:ring-ring/20"
                />
              </div>
            </div>
          </div>

          {/* My Community Section */}
          <div>
            <div className="border-b border-border pb-2 mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                My Community
              </h2>
            </div>

            <div>
              <Label htmlFor="home_region" className="text-sm font-medium text-foreground-soft mb-1">
                Home Community
              </Label>
              <Select
                value={formData.home_region}
                onValueChange={(value) => handleChange('home_region', value)}
              >
                <SelectTrigger className="bg-secondary border-border text-foreground rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNITY_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground/70 mt-1">
                This is your home community. Your recommendations and trust signals live here.
              </p>
            </div>
          </div>

          {/* My Household — hidden until Community Pass launches (not relevant for pilot) */}
          {false && (
            <div>
              <HouseholdManager />
              <p className="text-xs text-muted-foreground/70 mt-2 text-center">
                Household changes are saved automatically
              </p>
            </div>
          )}

          {/* Account Section */}
          <div>
            <div className="border-b border-border pb-2 mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Account
              </h2>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member since:</span>
                <span className="text-foreground">{memberSince}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account type:</span>
                <span className="text-foreground">{accountType}</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateUserMutation.isPending}
            className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateUserMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
