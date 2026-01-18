import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, ArrowLeft, Trash2, RefreshCw, Copy, Check } from "lucide-react";
import { toast } from "sonner";

function generateSecureKey() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export default function SpokeDetails() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spokeId = searchParams.get('spokeId');
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    spoke_id: '',
    organization_name: '',
    api_key: '',
    webhook_url: '',
    webhook_secret: '',
    is_active: true,
    description: ''
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Fetch current user
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch spoke data if editing
  const { data: spoke, isLoading: spokeLoading } = useQuery({
    queryKey: ['spoke', spokeId],
    queryFn: async () => {
      if (!spokeId) return null;
      const spokes = await base44.entities.Spoke.filter({ id: spokeId });
      return spokes[0] || null;
    },
    enabled: !!spokeId
  });

  // Populate form when spoke data is loaded
  useEffect(() => {
    if (spoke) {
      setFormData({
        spoke_id: spoke.spoke_id || '',
        organization_name: spoke.organization_name || '',
        api_key: spoke.api_key || '',
        webhook_url: spoke.webhook_url || '',
        webhook_secret: spoke.webhook_secret || '',
        is_active: spoke.is_active !== false,
        description: spoke.description || ''
      });
    }
  }, [spoke]);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (spokeId) {
        return await base44.entities.Spoke.update(spokeId, data);
      } else {
        return await base44.entities.Spoke.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['spoke', spokeId]);
      toast.success(spokeId ? 'Spoke updated successfully' : 'Spoke created successfully');
      if (!spokeId) {
        navigate(createPageUrl('Admin'));
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!spokeId) return;
      await base44.entities.Spoke.delete(spokeId);
    },
    onSuccess: () => {
      toast.success('Spoke deleted successfully');
      navigate(createPageUrl('Admin'));
    },
    onError: (error) => {
      toast.error(`Error deleting spoke: ${error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.spoke_id || !formData.organization_name || !formData.api_key) {
      toast.error('Please fill in all required fields');
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleGenerateApiKey = () => {
    setFormData({ ...formData, api_key: generateSecureKey() });
  };

  const handleGenerateWebhookSecret = () => {
    setFormData({ ...formData, webhook_secret: generateSecureKey() });
  };

  const handleCopy = (field, value) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (userLoading || spokeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Card className="p-8 bg-slate-900 border-slate-800 max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Access Denied</h1>
          <p className="text-slate-400">This page is only accessible to administrators.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Admin'))}
            className="text-slate-400 hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card className="p-8 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">
                {spokeId ? 'Edit Spoke' : 'Create New Spoke'}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage spoke app integration settings
              </p>
            </div>
            {spokeId && (
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Spoke ID */}
            <div>
              <Label htmlFor="spoke_id" className="text-slate-200">
                Spoke ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="spoke_id"
                value={formData.spoke_id}
                onChange={(e) => setFormData({ ...formData, spoke_id: e.target.value })}
                placeholder="e.g., austin-creative-collective"
                className="mt-1 bg-slate-800 border-slate-700 text-slate-100"
                disabled={!!spokeId}
              />
              <p className="text-xs text-slate-500 mt-1">
                Unique identifier (lowercase with hyphens). Cannot be changed after creation.
              </p>
            </div>

            {/* Organization Name */}
            <div>
              <Label htmlFor="organization_name" className="text-slate-200">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="organization_name"
                value={formData.organization_name}
                onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                placeholder="e.g., Austin Creative Collective"
                className="mt-1 bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-slate-200">
                Description
              </Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the spoke app"
                className="mt-1 bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>

            {/* API Key */}
            <div>
              <Label htmlFor="api_key" className="text-slate-200">
                API Key <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="api_key"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="Generate or enter API key"
                  className="bg-slate-800 border-slate-700 text-slate-100 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateApiKey}
                  className="border-slate-700"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {formData.api_key && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopy('api_key', formData.api_key)}
                    className="border-slate-700"
                  >
                    {copiedField === 'api_key' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Used by the spoke to authenticate API calls to Local Lane
              </p>
            </div>

            {/* Webhook URL */}
            <div>
              <Label htmlFor="webhook_url" className="text-slate-200">
                Webhook URL
              </Label>
              <Input
                id="webhook_url"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                placeholder="https://spoke-app.com/api/handleLocalLaneWebhook"
                className="mt-1 bg-slate-800 border-slate-700 text-slate-100"
              />
              <p className="text-xs text-slate-500 mt-1">
                URL where Local Lane will send webhook notifications (RSVP updates, etc.)
              </p>
            </div>

            {/* Webhook Secret */}
            <div>
              <Label htmlFor="webhook_secret" className="text-slate-200">
                Webhook Secret
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="webhook_secret"
                  value={formData.webhook_secret}
                  onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
                  placeholder="Generate or enter webhook secret"
                  className="bg-slate-800 border-slate-700 text-slate-100 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateWebhookSecret}
                  className="border-slate-700"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {formData.webhook_secret && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCopy('webhook_secret', formData.webhook_secret)}
                    className="border-slate-700"
                  >
                    {copiedField === 'webhook_secret' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Used by Local Lane to sign webhook requests sent to the spoke
              </p>
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
              <div>
                <Label htmlFor="is_active" className="text-slate-200">
                  Active Status
                </Label>
                <p className="text-xs text-slate-500 mt-1">
                  Enable or disable this spoke integration
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            {/* Environment Variables Instructions */}
            {formData.spoke_id && formData.api_key && (
              <div className="p-6 bg-slate-800 rounded-lg border-2 border-amber-500/20">
                <h3 className="text-lg font-semibold text-slate-100 mb-3">
                  Environment Variables for Spoke App
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Add these three keys as environment variables in your Base44 dashboard:
                </p>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-700">
                    <div>
                      <div className="text-amber-500 font-semibold">1. LOCAL_LANE_API_KEY</div>
                      <div className="text-slate-500 text-xs mt-1 break-all">{formData.api_key}</div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy('env_api_key', formData.api_key)}
                      className="border-slate-700 ml-3"
                    >
                      {copiedField === 'env_api_key' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-700">
                    <div>
                      <div className="text-amber-500 font-semibold">2. SPOKE_ID</div>
                      <div className="text-slate-500 text-xs mt-1">{formData.spoke_id}</div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopy('env_spoke_id', formData.spoke_id)}
                      className="border-slate-700 ml-3"
                    >
                      {copiedField === 'env_spoke_id' ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-900 rounded border border-slate-700">
                    <div>
                      <div className="text-amber-500 font-semibold">3. SPOKE_WEBHOOK_SECRET</div>
                      <div className="text-slate-500 text-xs mt-1 break-all">{formData.webhook_secret || '(generate one above)'}</div>
                    </div>
                    {formData.webhook_secret && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy('env_webhook_secret', formData.webhook_secret)}
                        className="border-slate-700 ml-3"
                      >
                        {copiedField === 'env_webhook_secret' ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  spokeId ? 'Update Spoke' : 'Create Spoke'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(createPageUrl('Admin'))}
                className="border-slate-700"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Delete Spoke</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this spoke? This will also remove all associated
              event mappings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate();
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}