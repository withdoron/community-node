import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, CheckCircle, Coins, Store, Zap, CreditCard } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_SETTINGS = {
  show_accepts_silver_badge: true,
  show_locally_owned_franchise_badge: true,
  show_accepts_payments_badge: false,
  default_boost_duration_days: 1,
};

export default function AdminSettingsPanel() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch existing settings
  const { data: savedSettings = [], isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => base44.entities.AdminSettings.list()
  });

  // Load settings from database
  useEffect(() => {
    if (savedSettings.length > 0) {
      const loaded = { ...DEFAULT_SETTINGS };
      savedSettings.forEach(s => {
        try {
          loaded[s.key] = JSON.parse(s.value);
        } catch {
          loaded[s.key] = s.value;
        }
      });
      setSettings(loaded);
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save each setting
      for (const [key, value] of Object.entries(settings)) {
        const existing = savedSettings.find(s => s.key === key);
        const valueStr = JSON.stringify(value);
        
        if (existing) {
          await base44.entities.AdminSettings.update(existing.id, { value: valueStr });
        } else {
          await base44.entities.AdminSettings.create({ key, value: valueStr });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-settings']);
      setHasChanges(false);
      toast.success('Settings saved successfully');
    },
    onError: () => {
      toast.error('Failed to save settings');
    }
  });

  const updateSetting = (key, value) => {
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Badge Visibility Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Badge Visibility</h2>
        <p className="text-sm text-slate-500 mb-6">
          Control which badges are displayed on business listings in the public UI.
        </p>

        <div className="space-y-4">
          {/* Accepts Silver Badge */}
          <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-100">
            <div className="flex items-center gap-3">
              <Coins className="h-5 w-5 text-amber-600" />
              <div>
                <Label className="font-medium">Show "Accepts Silver" Badges</Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Display the silver acceptance badge on eligible listings
                </p>
              </div>
            </div>
            <Switch
              checked={settings.show_accepts_silver_badge}
              onCheckedChange={(checked) => updateSetting('show_accepts_silver_badge', checked)}
            />
          </div>

          {/* Locally Owned Franchise Badge */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-blue-600" />
              <div>
                <Label className="font-medium">Show "Locally Owned Franchise" Badges</Label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Display the local franchise badge on eligible listings
                </p>
              </div>
            </div>
            <Switch
              checked={settings.show_locally_owned_franchise_badge}
              onCheckedChange={(checked) => updateSetting('show_locally_owned_franchise_badge', checked)}
            />
          </div>

          {/* Future: Accepts Payments Badge */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 opacity-60">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-slate-400" />
              <div>
                <Label className="font-medium text-slate-500">Show "Accepts Online Payments" Badges</Label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Coming soon — Display when businesses accept online payments
                </p>
              </div>
            </div>
            <Switch
              checked={settings.show_accepts_payments_badge}
              onCheckedChange={(checked) => updateSetting('show_accepts_payments_badge', checked)}
              disabled
            />
          </div>
        </div>
      </Card>

      {/* Boost Configuration */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Boost Configuration</h2>
        <p className="text-sm text-slate-500 mb-6">
          Configure default settings for listing boosts.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-amber-500" />
              <Label className="font-medium">Default Boost Duration</Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="30"
                value={settings.default_boost_duration_days}
                onChange={(e) => updateSetting('default_boost_duration_days', parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <span className="text-sm text-slate-500">days</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
          className="bg-slate-900 hover:bg-slate-800"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saveMutation.isSuccess && !hasChanges ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}