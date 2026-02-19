import React from 'react';
import { Settings, Store, Star, Zap, Crown, ExternalLink, Mail, Phone, Globe, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import StaffWidget from './widgets/StaffWidget';

const TIER_CONFIG = {
  basic: {
    label: 'Basic',
    sublabel: 'Free',
    icon: Star,
    color: 'text-slate-300',
    bg: 'bg-slate-700',
    description: 'List your business, create events (pending review), appear in directory.'
  },
  standard: {
    label: 'Standard',
    sublabel: '$79/mo',
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-500/20',
    description: 'Accept Joy Coins, auto-publish events, revenue analytics, priority in directory.'
  },
  partner: {
    label: 'Partner',
    sublabel: '$149/mo',
    icon: Crown,
    color: 'text-amber-500',
    bg: 'bg-amber-500/20',
    description: 'Everything in Standard plus dedicated partner node, custom branding, priority support.'
  }
};

export default function BusinessSettings({ business, currentUserId }) {
  const tier = business?.subscription_tier || 'basic';
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.basic;
  const TierIcon = tierConfig.icon;

  // Dev tier override (only in development)
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="h-5 w-5 text-amber-500" />
          Business Settings
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Manage your profile, team, and subscription.
        </p>
      </div>

      {/* Business Profile Card */}
      <Card className="bg-slate-900 border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-100">Business Profile</h3>
          <Link to={createPageUrl(`BusinessProfile?id=${business?.id}`)}>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-slate-600 text-slate-300 hover:bg-transparent hover:border-amber-500 hover:text-amber-500"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View Public Profile
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {business?.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="h-12 w-12 rounded-lg object-cover border border-slate-700"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <Store className="h-6 w-6 text-slate-500" />
                </div>
              )}
              <div>
                <p className="text-slate-100 font-semibold">{business?.name || 'Unnamed Business'}</p>
                <p className="text-xs text-slate-400 capitalize">{business?.archetype || 'location'} · {business?.primary_category || business?.category || 'General'}</p>
              </div>
            </div>

            {business?.description && (
              <p className="text-sm text-slate-400 line-clamp-2">{business.description}</p>
            )}
          </div>

          <div className="space-y-2 text-sm">
            {(business?.city || business?.state) && (
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>{[business.city, business.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {(business?.email || business?.contact_email) && (
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>{business.email || business.contact_email}</span>
              </div>
            )}
            {business?.phone && (
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span>{business.phone}</span>
              </div>
            )}
            {business?.website && (
              <div className="flex items-center gap-2 text-slate-400">
                <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <a
                  href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-500 hover:text-amber-400 truncate"
                >
                  {business.website}
                </a>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Subscription Status */}
      <Card className="bg-slate-900 border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-100 mb-4">Subscription</h3>
        <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${tierConfig.bg}`}>
              <TierIcon className={`h-5 w-5 ${tierConfig.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-slate-100 font-semibold">{tierConfig.label}</p>
                <Badge className={`${tierConfig.bg} ${tierConfig.color} text-xs border-0`}>
                  {tierConfig.sublabel}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{tierConfig.description}</p>
            </div>
          </div>

          {tier !== 'partner' && (
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-slate-600 text-slate-300 hover:bg-transparent hover:border-amber-500 hover:text-amber-500"
            >
              Upgrade
            </Button>
          )}
        </div>

        {/* Tier comparison — quick reference */}
        {tier === 'basic' && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 mb-2">Unlock with Standard ($79/mo):</p>
            <div className="flex flex-wrap gap-2">
              {['Joy Coins', 'Auto-publish events', 'Revenue analytics', 'Priority listing'].map((feature) => (
                <span key={feature} className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Staff Management */}
      <StaffWidget business={business} currentUserId={currentUserId} />

      {/* Dev Tier Override */}
      {isDev && (
        <Card className="bg-slate-900 border-red-900/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-red-500/20 text-red-400 text-xs border-0">DEV ONLY</Badge>
            <h3 className="text-sm font-semibold text-slate-100">Tier Override</h3>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Override subscription tier for testing. Changes are saved to the database.
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TIER_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await base44.functions.invoke('updateBusiness', {
                      action: 'update',
                      business_id: business.id,
                      data: { subscription_tier: key },
                    });
                    window.location.reload();
                  } catch (err) {
                    console.error('Failed to update tier:', err);
                  }
                }}
                className={`${
                  tier === key
                    ? 'border-amber-500 text-amber-500'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                } bg-transparent hover:bg-transparent`}
              >
                {config.label}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
