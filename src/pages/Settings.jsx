import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getFriendlyErrorMessage } from '@/lib/errorMessages';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, Loader2, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const COMMUNITY_OPTIONS = [
  { value: 'greater_eugene', label: 'Greater Eugene Area' },
  { value: 'portland_metro', label: 'Portland Metro (Coming Soon)', disabled: true },
  { value: 'bend_area', label: 'Bend Area (Coming Soon)', disabled: true },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    home_region: 'greater_eugene',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    }
  });

  useEffect(() => {
    if (currentUser && !isInitialized) {
      setFormData({
        full_name: currentUser.data?.display_name || currentUser.full_name || '',
        phone: currentUser.data?.phone || currentUser.phone || '',
        home_region: currentUser.data?.home_region || 'greater_eugene',
      });
      setIsInitialized(true);
    }
  }, [currentUser, isInitialized]);

  const updateUserMutation = useMutation({
    mutationFn: async (updates) => {
      // Get fresh user data to avoid stale closure
      const freshUser = await base44.auth.me();

      // Store everything in user.data — full_name is read-only
      const dataFields = {
        ...freshUser.data,  // Preserve existing data
        display_name: updates.full_name,
        phone: updates.phone,
        home_region: updates.home_region,
      };

      console.log('Settings mutation - freshUser.data before:', freshUser.data);
      console.log('Settings mutation - saving dataFields:', dataFields);

      await base44.entities.User.update(freshUser.id, {
        data: dataFields
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['mylane'] });
      toast.success('Settings saved');
      setIsInitialized(false);  // Allow form to reload with new data
      setHasChanges(false);
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-100 mb-3">Settings</h1>
          <p className="text-slate-400 mb-6">Please sign in to manage your settings.</p>
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const memberSince = currentUser?.created_date
    ? format(new Date(currentUser.created_date), 'MMMM yyyy')
    : 'Unknown';
  const accountType = currentUser?.data?.tier || 'Free';
  const displayNameForAvatar = currentUser?.data?.display_name || currentUser?.full_name;
  const initials = displayNameForAvatar
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            to={createPageUrl('MyLane')}
            className="text-slate-400 hover:text-amber-500 text-sm flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to My Lane
          </Link>
          <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 rounded-full bg-amber-500 flex items-center justify-center mb-3">
              <span className="text-2xl font-bold text-black">{initials}</span>
            </div>
            {/* Photo upload disabled for now */}
            <p className="text-xs text-slate-500">Profile photo coming soon</p>
          </div>

          {/* Profile Section */}
          <div>
            <div className="border-b border-slate-800 pb-2 mb-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Profile
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name" className="text-sm font-medium text-slate-300 mb-1">
                  Display Name *
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-100 rounded-lg focus:border-amber-500 focus:ring-amber-500/20"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-slate-300 mb-1">
                  Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    value={currentUser?.email || ''}
                    className="bg-slate-800/50 border-slate-700/50 text-slate-500 rounded-lg cursor-not-allowed pr-10"
                    readOnly
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-slate-300 mb-1">
                  Phone (optional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="(541) 555-1234"
                  className="bg-slate-800 border-slate-700 text-slate-100 rounded-lg focus:border-amber-500 focus:ring-amber-500/20"
                />
              </div>
            </div>
          </div>

          {/* My Community Section */}
          <div>
            <div className="border-b border-slate-800 pb-2 mb-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                My Community
              </h2>
            </div>

            <div>
              <Label htmlFor="home_region" className="text-sm font-medium text-slate-300 mb-1">
                Home Community
              </Label>
              <Select
                value={formData.home_region}
                onValueChange={(value) => handleChange('home_region', value)}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 rounded-lg">
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
              <p className="text-xs text-slate-500 mt-1">
                This is your home community. Your recommendations and trust signals live here.
              </p>
            </div>
          </div>

          {/* Account Section */}
          <div>
            <div className="border-b border-slate-800 pb-2 mb-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Account
              </h2>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Member since:</span>
                <span className="text-slate-100">{memberSince}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account type:</span>
                <span className="text-slate-100">{accountType}</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateUserMutation.isPending}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
