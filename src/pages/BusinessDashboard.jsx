import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import PersonalDashboard from '@/components/dashboard/PersonalDashboard';
import BusinessSelector from '@/components/dashboard/BusinessSelector';
import OverviewWidget from '@/components/dashboard/widgets/OverviewWidget';
import EventsWidget from '@/components/dashboard/widgets/EventsWidget';
import StaffWidget from '@/components/dashboard/widgets/StaffWidget';
import FinancialWidget from '@/components/dashboard/widgets/FinancialWidget';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Store } from "lucide-react";

export default function BusinessDashboard() {
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: associatedBusinesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ['associatedBusinesses', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.associated_businesses?.length) return [];
      
      const businesses = await Promise.all(
        currentUser.associated_businesses.map(businessId => 
          base44.entities.Business.filter({ id: businessId }, '', 1)
        )
      );
      return businesses.flat();
    },
    enabled: !!currentUser
  });

  const isLoading = userLoading || businessesLoading;

  const getUserRole = (business) => {
    if (business.owner_user_id === currentUser?.id) return 'Owner';
    if (business.instructors?.includes(currentUser?.id)) return 'Instructor';
    return 'Editor';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // STEP 1: No business associations - Show Personal Dashboard
  if (!associatedBusinesses || associatedBusinesses.length === 0) {
    return <PersonalDashboard />;
  }

  // STEP 2: Has businesses but none selected - Show Business Selector
  if (!selectedBusinessId) {
    return (
      <BusinessSelector 
        businesses={associatedBusinesses}
        onSelectBusiness={setSelectedBusinessId}
      />
    );
  }

  // STEP 3: Business selected - Show role-based dashboard
  const selectedBusiness = associatedBusinesses.find(b => b.id === selectedBusinessId);
  if (!selectedBusiness) {
    setSelectedBusinessId(null);
    return null;
  }

  const userRole = getUserRole(selectedBusiness);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedBusinessId(null)}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Businesses
            </Button>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-slate-600" />
              <div>
                <h1 className="text-lg font-bold text-slate-900">{selectedBusiness.name}</h1>
                <p className="text-xs text-slate-500">{userRole} Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Overview - Everyone can see */}
        <OverviewWidget business={selectedBusiness} />

        {/* Events - Everyone can see and edit */}
        <EventsWidget 
          business={selectedBusiness} 
          allowEdit={true}
          userRole={userRole}
        />

        {/* Staff - Only Managers and Owners */}
        {(userRole === 'Manager' || userRole === 'Owner') && (
          <StaffWidget business={selectedBusiness} />
        )}

        {/* Financials - Only Owners */}
        {userRole === 'Owner' && (
          <FinancialWidget business={selectedBusiness} />
        )}
      </div>
    </div>
  );
}