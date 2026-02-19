import React, { useState, useEffect, useRef } from 'react';
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
};

export default function AdminSettingsPanel() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const lastAppliedSigRef = useRef(null);

  // Fetch existing settings
  const { data: savedSettings = [], isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => base44.entities.AdminSettings.list()
  });

  // Load settings from database once when data arrives; avoid loop from unstable savedSettings ref
  useEffect(() => {
    if (savedSettings.length === 0) return;
    const sig = JSON.stringify(savedSettings.map((s) => [s.key, s.value]));
    if (lastAppliedSigRef.current === sig) return;
    lastAppliedSigRef.current = sig;
    const loaded = { ...DEFAULT_SETTINGS };
    savedSettings.forEach((s) => {
      try {
        loaded[s.key] = JSON.parse(s.value);
      } catch {
        loaded[s.key] = s.value;
      }
    });
    setSettings(loaded);
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(settings)) {
        const existing = savedSettings.find(s => s.key === key);
        const valueStr = JSON.stringify(value);

        if (existing) {
          await base44.functions.invoke('updateAdminSettings', {
            action: 'update',
            id: existing.id,
            key,
            value: valueStr,
          });
        } else {
          await base44.functions.invoke('updateAdminSettings', {
            action: 'create',
            key,
            value: valueStr,
          });
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
      <Card className="p-6 bg-slate-900 border-slate-800">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Badge Visibility</h2>
        <p className="text-sm text-slate-400 mb-6">
          Control which badges are displayed on business listings in the public UI.
        </p>

        <div className="space-y-4">
          {/* Accepts Silver Badge */}
          <div className="flex items-center justify-between p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Coins className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <Label className="font-medium text-slate-100">Show "Accepts Silver" Badges</Label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Display the silver acceptance badge on eligible listings
                </p>
              </div>
            </div>
            <Switch
              checked={settings.show_accepts_silver_badge}
              onCheckedChange={(checked) => updateSetting('show_accepts_silver_badge', checked)}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>

          {/* Locally Owned Franchise Badge */}
          <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Store className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <Label className="font-medium text-slate-100">Show "Locally Owned Franchise" Badges</Label>
                <p className="text-xs text-slate-400 mt-0.5">
                  Display the local franchise badge on eligible listings
                </p>
              </div>
            </div>
            <Switch
              checked={settings.show_locally_owned_franchise_badge}
              onCheckedChange={(checked) => updateSetting('show_locally_owned_franchise_badge', checked)}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>

          {/* Future: Accepts Payments Badge */}
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700 opacity-60">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <CreditCard className="h-5 w-5 text-slate-500 shrink-0" />
              <div className="min-w-0">
                <Label className="font-medium text-slate-500">Show "Accepts Online Payments" Badges</Label>
                <p className="text-xs text-slate-500 mt-0.5">
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

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || saveMutation.isPending}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
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