import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Store, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ClaimBusiness() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Look up the business by claim token via a filter
  const { data: businesses = [], isLoading: businessLoading, error: businessError } = useQuery({
    queryKey: ['claim-business', token],
    queryFn: async () => {
      if (!token) return [];
      const results = await base44.entities.Business.filter({ claim_token: token });
      return results || [];
    },
    enabled: !!token,
  });

  const business = businesses[0] || null;

  const claimMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('updateBusiness', {
        action: 'claim_business',
        claim_token: token,
      });
      return result;
    },
    onSuccess: () => {
      toast.success('Business claimed successfully!');
      navigate(createPageUrl('MyLane'));
    },
    onError: (error) => {
      console.error('Claim error:', error);
      toast.error(error?.message || 'Failed to claim business');
    },
  });

  const isLoading = userLoading || businessLoading;

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-card border-border">
          <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">Invalid Link</h2>
          <p className="text-muted-foreground mt-2">This claim link is missing a token. Please check the URL and try again.</p>
          <Button
            onClick={() => navigate(createPageUrl('Home'))}
            className="mt-6 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
          >
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Looking up business...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-card border-border">
          <Store className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">Claim Your Business</h2>
          {business ? (
            <p className="text-muted-foreground mt-2">
              Log in or create an account to claim <span className="text-primary-hover font-medium">{business.name}</span>.
            </p>
          ) : (
            <p className="text-muted-foreground mt-2">Log in or create an account to claim this business listing.</p>
          )}
          <p className="text-muted-foreground/70 text-sm mt-4">
            You'll be redirected back here after logging in.
          </p>
        </Card>
      </div>
    );
  }

  // Business not found or token invalid
  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-card border-border">
          <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">Link Expired or Invalid</h2>
          <p className="text-muted-foreground mt-2">
            This claim link is no longer valid. The business may have already been claimed, or the link has expired.
          </p>
          <Button
            onClick={() => navigate(createPageUrl('Home'))}
            className="mt-6 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
          >
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  // Business already claimed
  if (business.owner_user_id) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-card border-border">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">Already Claimed</h2>
          <p className="text-muted-foreground mt-2">
            <span className="text-foreground font-medium">{business.name}</span> has already been claimed.
          </p>
          <Button
            onClick={() => navigate(createPageUrl('Home'))}
            className="mt-6 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
          >
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  // Ready to claim
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 bg-card border-border">
        <div className="text-center">
          <Store className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">Claim Your Business</h2>
          <p className="text-muted-foreground mt-2">
            Claim <span className="text-primary-hover font-medium">{business.name}</span> as your business on LocalLane?
          </p>

          {/* Business preview */}
          <div className="mt-6 p-4 bg-secondary rounded-lg border border-border text-left">
            <h3 className="font-semibold text-foreground">{business.name}</h3>
            {business.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{business.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {business.city && (
                <span className="px-2 py-0.5 rounded-full bg-surface text-foreground-soft">{business.city}</span>
              )}
              {(business.primary_category || business.sub_category) && (
                <span className="px-2 py-0.5 rounded-full bg-surface text-foreground-soft">
                  {business.sub_category || business.primary_category}
                </span>
              )}
            </div>
          </div>

          <p className="text-muted-foreground/70 text-sm mt-4">
            You'll become the owner and can manage this listing from your dashboard.
          </p>

          <div className="flex flex-col gap-3 mt-6">
            <Button
              onClick={() => claimMutation.mutate()}
              disabled={claimMutation.isPending}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-3"
            >
              {claimMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                'Claim This Business'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl('Home'))}
              className="w-full bg-transparent border-border text-foreground-soft hover:bg-transparent hover:border-muted-foreground"
            >
              Not My Business
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
