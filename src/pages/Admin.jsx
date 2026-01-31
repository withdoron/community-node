import React, { useState, useMemo } from 'react';
import { Link, Routes, Route, Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, ChevronLeft, MapPin, Network } from "lucide-react";
import AdminBusinessTable from '@/components/admin/AdminBusinessTable';
import AdminFilters from '@/components/admin/AdminFilters';
import BusinessEditDrawer from '@/components/admin/BusinessEditDrawer';
import AdminSettingsPanel from '@/components/admin/AdminSettingsPanel';
import AdminLocationsTable from '@/components/admin/AdminLocationsTable';
import AdminLayout from '@/components/admin/AdminLayout';
import ConfigSection from '@/components/admin/config/ConfigSection';

function PlaceholderSection({ title, description }) {
  return (
    <Card className="p-6 bg-slate-900 border-slate-700">
      <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
      <p className="text-slate-400 text-sm">{description}</p>
    </Card>
  );
}

export default function Admin() {
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    ownerSearch: '',
    tier: 'all',
    boosted: 'all',
    acceptsSilver: 'all',
    localFranchise: 'all',
    status: 'all',
  });

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const queryClient = useQueryClient();

  const { data: businesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ['admin-businesses'],
    queryFn: () => base44.entities.Business.list('-created_date', 500),
    enabled: currentUser?.role === 'admin'
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: () => base44.entities.Location.list('-created_date', 1000),
    enabled: currentUser?.role === 'admin'
  });

  const { data: spokes = [], isLoading: spokesLoading } = useQuery({
    queryKey: ['admin-spokes'],
    queryFn: () => base44.entities.Spoke.list('-created_date', 100),
    enabled: currentUser?.role === 'admin'
  });

  const updateLocation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Location.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
      toast.success('Location updated');
    },
    onError: () => toast.error('Failed to update location'),
  });

  const updateBusiness = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.Business.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success('Business updated');
    },
    onError: () => toast.error('Failed to update business'),
  });

  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => {
      if (b.is_deleted === true || b.status === 'deleted') return false;
      if (filters.search && !b.name?.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.ownerSearch && !b.owner_email?.toLowerCase().includes(filters.ownerSearch.toLowerCase())) return false;
      if (filters.tier !== 'all' && (b.subscription_tier || 'basic') !== filters.tier) return false;
      if (filters.boosted === 'yes' && !b.is_bumped) return false;
      if (filters.boosted === 'no' && b.is_bumped) return false;
      if (filters.acceptsSilver === 'yes' && !b.accepts_silver) return false;
      if (filters.acceptsSilver === 'no' && b.accepts_silver) return false;
      if (filters.localFranchise === 'yes' && !b.is_locally_owned_franchise) return false;
      if (filters.localFranchise === 'no' && b.is_locally_owned_franchise) return false;
      if (filters.status === 'active' && b.is_active === false) return false;
      if (filters.status === 'inactive' && b.is_active !== false) return false;
      return true;
    });
  }, [businesses, filters]);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-slate-900 border-slate-800">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100">Access Denied</h2>
          <p className="text-slate-400 mt-2">You don't have permission to access the admin panel.</p>
          <Link to={createPageUrl('Home')}>
            <Button className="mt-4 bg-transparent border-slate-600 text-slate-300 hover:bg-transparent hover:border-amber-500 hover:text-amber-500" variant="outline">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Admin Panel</h1>
              <p className="text-slate-400 mt-1">Manage businesses, tiers, and settings</p>
            </div>
            <Link to={createPageUrl('Home')}>
              <Button variant="outline" size="sm" className="bg-transparent border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Site
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <AdminLayout>
        <div className="p-6">
          <Routes>
            <Route index element={<Navigate to="businesses" replace />} />

            <Route path="businesses" element={
              <Card className="p-6 bg-slate-900 border-slate-700">
                <div className="mb-6">
                  <AdminFilters filters={filters} onFiltersChange={setFilters} />
                </div>
                <div className="mb-4 text-sm text-slate-400">
                  Showing {filteredBusinesses.length} of {businesses.length} businesses
                </div>
                {businessesLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : filteredBusinesses.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">No businesses match your filters</div>
                ) : (
                  <AdminBusinessTable
                    businesses={filteredBusinesses}
                    onSelectBusiness={setSelectedBusiness}
                    onUpdateBusiness={(id, data) => updateBusiness.mutate({ id, data })}
                    updatingId={updateBusiness.isPending ? updateBusiness.variables?.id : null}
                  />
                )}
              </Card>
            } />

            <Route path="users" element={
              <PlaceholderSection title="Users" description="User management — coming soon." />
            } />

            <Route path="locations" element={
              <Card className="p-6 bg-slate-900 border-slate-700">
                <div className="mb-4 text-sm text-slate-400">Showing {locations.length} locations across all businesses</div>
                {locationsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <AdminLocationsTable
                    locations={locations}
                    businesses={businesses}
                    onToggleAutoBoost={(loc, enabled) => updateLocation.mutate({ id: loc.id, data: { is_auto_boost_enabled: enabled } })}
                    onClearBoost={(loc) => updateLocation.mutate({ id: loc.id, data: { boost_start_at: null, boost_end_at: null } })}
                    updatingId={updateLocation.isPending ? updateLocation.variables?.id : null}
                  />
                )}
              </Card>
            } />

            <Route path="partners" element={
              <Card className="p-6 bg-slate-900 border-slate-700">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">Partners (Spoke Apps)</h2>
                    <p className="text-sm text-slate-400 mt-1">Manage connected spoke applications</p>
                  </div>
                  <Link to={createPageUrl('SpokeDetails')}>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">Add New Spoke</Button>
                  </Link>
                </div>
                {spokesLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : spokes.length === 0 ? (
                  <div className="text-center py-12">
                    <Network className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400">No spoke apps configured yet</p>
                    <Link to={createPageUrl('SpokeDetails')}>
                      <Button className="mt-4 bg-amber-500 hover:bg-amber-600 text-black font-semibold">Create Your First Spoke</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Organization</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Spoke ID</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">API Key</th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spokes.map((spoke) => (
                          <tr key={spoke.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-100">{spoke.organization_name}</div>
                              {spoke.description && <div className="text-xs text-slate-500 mt-0.5">{spoke.description}</div>}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-300 font-mono">{spoke.spoke_id}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${spoke.is_active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                                {spoke.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 font-mono">{spoke.api_key?.substring(0, 20)}...</td>
                            <td className="py-3 px-4 text-right">
                              <Link to={createPageUrl('SpokeDetails') + `?spokeId=${spoke.id}`}>
                                <Button variant="outline" size="sm" className="bg-transparent border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500">Edit</Button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            } />

            <Route path="networks" element={<ConfigSection domain="platform" configType="networks" title="Networks" />} />
            <Route path="tiers" element={<PlaceholderSection title="Tiers" description="Business and user tier definitions — coming soon." />} />
            <Route path="punch-pass" element={<PlaceholderSection title="Punch Pass" description="Punch Pass system settings — coming soon." />} />

            <Route path="events/types" element={<ConfigSection domain="events" configType="event_types" title="Event Types" />} />
            <Route path="events/age-groups" element={<ConfigSection domain="events" configType="age_groups" title="Age Groups" />} />
            <Route path="events/durations" element={<ConfigSection domain="events" configType="duration_presets" title="Duration Presets" />} />
            <Route path="events/accessibility" element={<ConfigSection domain="events" configType="accessibility_features" title="Accessibility Features" />} />

            <Route path="onboarding/business" element={<PlaceholderSection title="Business Onboarding" description="Business onboarding wizard config — coming soon." />} />
            <Route path="onboarding/user" element={<PlaceholderSection title="User Onboarding" description="User onboarding config — coming soon." />} />

            <Route path="settings" element={<AdminSettingsPanel />} />
          </Routes>
        </div>
      </AdminLayout>

      <BusinessEditDrawer
        business={selectedBusiness}
        open={!!selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
        adminEmail={currentUser?.email}
      />
    </div>
  );
}
