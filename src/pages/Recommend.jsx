import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { sanitizeText } from '@/utils/sanitize';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ThumbsUp, BookOpen, ChevronLeft, Loader2, Upload, X, CheckCircle, ShieldCheck, Shield } from "lucide-react";
import ConcernForm from '@/components/recommendations/ConcernForm';

export default function Recommend({ businessId: businessIdProp, initialMode } = {}) {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const businessId = businessIdProp || urlParams.get('businessId');
  const urlMode = initialMode || urlParams.get('mode');

  // mode: 'choose' | 'story' | 'nod-done' | 'story-done' | 'concern' | 'concern-done' | 'vouch' | 'vouch-done'
  const [mode, setMode] = useState(
    urlMode === 'story' ? 'story' :
    urlMode === 'concern' ? 'concern' :
    urlMode === 'vouch' ? 'vouch' :
    'choose'
  );
  const [serviceUsed, setServiceUsed] = useState('');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [vouchServiceUsed, setVouchServiceUsed] = useState('');
  const [vouchDate, setVouchDate] = useState('');
  const [vouchHireAgain, setVouchHireAgain] = useState(null);
  const [vouchRelationship, setVouchRelationship] = useState('');
  const [vouchStatement, setVouchStatement] = useState('');

  const { data: business } = useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      const results = await base44.entities.Business.filter({ id: businessId });
      return results[0];
    },
    enabled: !!businessId
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Check if user already vouched
  const { data: existingVouch } = useQuery({
    queryKey: ['existing-vouch', businessId, currentUser?.id],
    queryFn: async () => {
      const vouches = await base44.entities.Recommendation.filter({
        business_id: businessId,
        user_id: currentUser.id,
        type: 'vouch',
        is_active: true
      });
      return vouches[0] || null;
    },
    enabled: !!businessId && !!currentUser?.id
  });

  // Check if user already nodded this business
  const { data: existingNod } = useQuery({
    queryKey: ['existing-nod', businessId, currentUser?.id],
    queryFn: async () => {
      const nods = await base44.entities.Recommendation.filter({
        business_id: businessId,
        user_id: currentUser.id,
        type: 'nod',
        is_active: true
      });
      return nods[0] || null;
    },
    enabled: !!businessId && !!currentUser?.id
  });

  // Submit a Nod
  const submitNod = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('manageRecommendation', {
        action: 'create',
        data: {
          business_id: businessId,
          user_id: currentUser.id,
          type: 'nod',
          is_active: true,
        },
      });
      await base44.functions.invoke('updateBusiness', {
        action: 'update_counters',
        business_id: businessId,
        data: {
          nod_count: (business.nod_count || 0) + 1,
          recommendation_count: (business.recommendation_count || 0) + 1,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['existing-nod', businessId]);
      queryClient.invalidateQueries(['business', businessId]);
      queryClient.invalidateQueries(['recommendations', businessId]);
      setMode('nod-done');
    }
  });

  // Remove a Nod
  const removeNod = useMutation({
    mutationFn: async () => {
      if (existingNod) {
        await base44.functions.invoke('manageRecommendation', {
          action: 'remove',
          recommendation_id: existingNod.id,
        });
        await base44.functions.invoke('updateBusiness', {
          action: 'update_counters',
          business_id: businessId,
          data: {
            nod_count: Math.max((business.nod_count || 1) - 1, 0),
            recommendation_count: Math.max((business.recommendation_count || 1) - 1, 0),
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['existing-nod', businessId]);
      queryClient.invalidateQueries(['business', businessId]);
      queryClient.invalidateQueries(['recommendations', businessId]);
    }
  });

  // Submit a Story (also auto-nods if not already nodded)
  const submitStory = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('manageRecommendation', {
        action: 'create',
        data: {
          business_id: businessId,
          user_id: currentUser.id,
          type: 'story',
          service_used: sanitizeText(serviceUsed),
          content: sanitizeText(content),
          photos,
          is_active: true,
        },
      });

      let newNodCount = business.nod_count || 0;
      if (!existingNod) {
        await base44.functions.invoke('manageRecommendation', {
          action: 'create',
          data: {
            business_id: businessId,
            user_id: currentUser.id,
            type: 'nod',
            is_active: true,
          },
        });
        newNodCount += 1;
      }

      await base44.functions.invoke('updateBusiness', {
        action: 'update_counters',
        business_id: businessId,
        data: {
          nod_count: newNodCount,
          story_count: (business.story_count || 0) + 1,
          recommendation_count: (business.recommendation_count || 0) + (existingNod ? 1 : 2),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['existing-nod', businessId]);
      queryClient.invalidateQueries(['business', businessId]);
      queryClient.invalidateQueries(['recommendations', businessId]);
      setMode('story-done');
    }
  });

  const submitVouch = useMutation({
    mutationFn: async () => {
      await base44.functions.invoke('manageRecommendation', {
        action: 'create',
        data: {
          business_id: businessId,
          user_id: currentUser.id,
          type: 'vouch',
          service_used: sanitizeText(vouchServiceUsed.trim()),
          content: JSON.stringify({
            approximate_date: sanitizeText(vouchDate.trim()),
            hire_again: vouchHireAgain,
            relationship: vouchRelationship,
            statement: sanitizeText(vouchStatement.trim()),
          }),
          is_active: true,
        },
      });

      const businesses = await base44.entities.Business.filter({ id: businessId });
      const biz = businesses[0];
      await base44.functions.invoke('updateBusiness', {
        action: 'update_counters',
        business_id: businessId,
        data: {
          vouch_count: (biz?.vouch_count || 0) + 1,
          recommendation_count: (biz?.recommendation_count || 0) + 1,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['business', businessId]);
      queryClient.invalidateQueries(['recommendations', businessId]);
      queryClient.invalidateQueries(['existing-vouch', businessId]);
      setMode('vouch-done');
    }
  });

  const handlePhotoUpload = async (e) => {
    const { validateFile } = await import('@/utils/fileValidation');
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    const uploadedUrls = [];
    for (const file of files) {
      const check = validateFile(file);
      if (!check.valid) { toast.error(check.error); continue; }
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }
    setPhotos([...photos, ...uploadedUrls]);
    setUploading(false);
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // Not logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-card border-border">
          <ThumbsUp className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">Sign in to Recommend</h2>
          <p className="text-muted-foreground mt-2">Your name stands behind your recommendation — sign in to get started.</p>
          <Button className="mt-6 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold" onClick={() => base44.auth.signIn()}>
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  // Nod success
  if (mode === 'nod-done') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-card border-border">
          <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ThumbsUp className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">You've Recommended {business?.name}!</h2>
          <p className="text-muted-foreground mt-2">Your neighbors can see your recommendation on their profile.</p>
          <Link to={createPageUrl(`BusinessProfile?id=${businessId}`)}>
            <Button className="mt-6 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold">
              Back to {business?.name}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Concern form
  if (mode === 'concern') {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-background/90 backdrop-blur-sm border-b border-border sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center">
            <Button variant="ghost" size="sm" className="text-foreground-soft hover:text-primary hover:bg-secondary" onClick={() => setMode('choose')}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <ConcernForm
            businessId={businessId}
            businessName={business?.name}
            onClose={() => setMode('choose')}
            onSuccess={() => setMode('concern-done')}
          />
        </div>
      </div>
    );
  }

  // Concern success
  if (mode === 'concern-done') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-card border-border">
          <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Concern Received</h2>
          <p className="text-muted-foreground mt-2">We'll review this and follow up if needed. Thank you for helping keep our community trustworthy.</p>
          <Link to={createPageUrl(`BusinessProfile?id=${businessId}`)}>
            <Button className="mt-6 bg-surface hover:bg-surface text-foreground">
              Back to {business?.name}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Vouch success
  if (mode === 'vouch-done') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-card border-border">
          <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Vouch Submitted!</h2>
          <p className="text-muted-foreground mt-2">Your verified endorsement helps your neighbors find businesses they can trust.</p>
          <Link to={createPageUrl(`BusinessProfile?id=${businessId}`)}>
            <Button className="mt-6 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold">
              Back to {business?.name}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Vouch form
  if (mode === 'vouch') {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-background/90 backdrop-blur-sm border-b border-border sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center">
            <Button variant="ghost" size="sm" className="text-foreground-soft hover:text-primary hover:bg-secondary" onClick={() => setMode('choose')}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card className="p-6 sm:p-8 bg-card border-border">
            <div className="flex items-center gap-3 mb-1">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Vouch for {business?.name}</h1>
            </div>
            <p className="text-muted-foreground mt-1 mb-2">A vouch is a verified endorsement. It carries weight because you're putting your reputation behind it.</p>
            <p className="text-muted-foreground/70 text-sm mb-8">We'll ask a few verification questions to confirm your experience.</p>

            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium text-foreground">
                  What service or product did you use? <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={vouchServiceUsed}
                  onChange={(e) => setVouchServiceUsed(e.target.value)}
                  placeholder="e.g., Kitchen remodel, Oil change, Farm stand purchase"
                  className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>

              <div>
                <Label className="text-base font-medium text-foreground">
                  Approximately when? <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={vouchDate}
                  onChange={(e) => setVouchDate(e.target.value)}
                  placeholder="e.g., January 2026, Last summer, Two weeks ago"
                  className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>

              <div>
                <Label className="text-base font-medium text-foreground">
                  Would you use them again? <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setVouchHireAgain(true)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      vouchHireAgain === true
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground-soft hover:bg-surface'
                    }`}
                  >
                    Absolutely
                  </button>
                  <button
                    onClick={() => setVouchHireAgain(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      vouchHireAgain === false
                        ? 'bg-surface text-foreground'
                        : 'bg-secondary text-foreground-soft hover:bg-surface'
                    }`}
                  >
                    Probably not
                  </button>
                </div>
                {vouchHireAgain === false && (
                  <p className="text-sm text-muted-foreground/70 mt-2">
                    A vouch means you stand behind them. If you wouldn't use them again, consider sharing a Story or flagging a Concern instead.
                  </p>
                )}
              </div>

              <div>
                <Label className="text-base font-medium text-foreground">
                  How do you know this business?
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { value: 'customer', label: 'I was a customer' },
                    { value: 'neighbor', label: "They're my neighbor" },
                    { value: 'business_owner', label: "I'm a fellow business owner" },
                    { value: 'other', label: 'Other' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setVouchRelationship(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        vouchRelationship === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-foreground-soft hover:bg-surface'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-medium text-foreground">
                  Why do you vouch for them? (optional)
                </Label>
                <Textarea
                  value={vouchStatement}
                  onChange={(e) => setVouchStatement(e.target.value)}
                  placeholder="A sentence or two about why you trust this business..."
                  className="mt-2 min-h-[80px] bg-secondary border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Your vouch will appear as <span className="text-foreground font-medium">{currentUser?.full_name || currentUser?.email}</span> — verified endorsement, visible to the community.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setMode('choose')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => submitVouch.mutate()}
                  disabled={!vouchServiceUsed.trim() || !vouchDate.trim() || vouchHireAgain === null || vouchHireAgain === false || submitVouch.isPending}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
                >
                  {submitVouch.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                  ) : (
                    'Submit Vouch'
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Story success
  if (mode === 'story-done') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-card border-border">
          <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Story Shared!</h2>
          <p className="text-muted-foreground mt-2">Thank you for helping your neighbors discover {business?.name}.</p>
          <Link to={createPageUrl(`BusinessProfile?id=${businessId}`)}>
            <Button className="mt-6 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold">
              Back to {business?.name}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Story form
  if (mode === 'story') {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-background/90 backdrop-blur-sm border-b border-border sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center">
            <Button variant="ghost" size="sm" className="text-foreground-soft hover:text-primary hover:bg-secondary" onClick={() => setMode('choose')}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card className="p-6 sm:p-8 bg-card border-border">
            <div className="flex items-center gap-3 mb-1">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Share Your Story</h1>
            </div>
            {business && (
              <p className="text-muted-foreground mt-1">about {business.name}</p>
            )}

            <div className="mt-8 space-y-6">
              {/* Service Used */}
              <div>
                <Label className="text-base font-medium text-foreground">
                  What service or experience did you have?
                </Label>
                <Input
                  value={serviceUsed}
                  onChange={(e) => setServiceUsed(e.target.value)}
                  placeholder="e.g., Kitchen remodel, Oil change, Farm stand"
                  className="mt-2 bg-secondary border-border text-foreground placeholder:text-muted-foreground/70"
                />
              </div>

              {/* Story Content */}
              <div>
                <Label className="text-base font-medium text-foreground">
                  Tell your story <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What happened? How did it go? Would you go back?"
                  className="mt-2 min-h-[150px] bg-secondary border-border text-foreground placeholder:text-muted-foreground/70"
                  required
                />
              </div>

              {/* Photos */}
              <div>
                <Label className="text-base font-medium text-foreground">Add photos (optional)</Label>
                <p className="text-sm text-muted-foreground/70 mt-1">Photos help your neighbors see the experience</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img src={photo} alt={`Upload ${idx + 1}`} className="h-20 w-20 rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/10 transition-colors">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    )}
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>

              {/* Identity reminder */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                  <span className="text-xs font-semibold text-foreground-soft">
                    {(currentUser?.full_name || currentUser?.email || 'Y')[0].toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your story will be published as <span className="text-foreground font-medium">{currentUser?.full_name || currentUser?.email}</span>
                </p>
              </div>

              {/* Submit */}
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
                disabled={!content.trim() || submitStory.isPending}
                onClick={() => submitStory.mutate()}
              >
                {submitStory.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sharing...</>
                ) : (
                  'Share Your Story'
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Choose mode (default)
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-background/90 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center">
          <Link to={createPageUrl(`BusinessProfile?id=${businessId}`)}>
            <Button variant="ghost" size="sm" className="text-foreground-soft hover:text-primary hover:bg-secondary">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground">
          How would you like to recommend{business ? ` ${business.name}` : ''}?
        </h1>
        <p className="text-muted-foreground mt-2">Your name stands behind your recommendation</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          {/* Quick Nod Card */}
          <Card className="p-6 bg-card border-border hover:border-primary/50 transition-all flex flex-col">
            <ThumbsUp className="h-10 w-10 text-primary mb-4" />
            <h2 className="text-lg font-semibold text-foreground">Quick Nod</h2>
            <p className="text-sm text-muted-foreground mt-2">One click. Your name says it all.</p>

            {existingNod ? (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">You recommend this business</span>
                </div>
                <button
                  onClick={() => removeNod.mutate()}
                  disabled={removeNod.isPending}
                  className="text-sm text-muted-foreground/70 hover:text-red-400 mt-2 transition-colors"
                >
                  {removeNod.isPending ? 'Removing...' : 'Remove recommendation'}
                </button>
              </div>
            ) : (
              <Button
                className="w-full mt-4 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
                disabled={submitNod.isPending}
                onClick={() => submitNod.mutate()}
              >
                {submitNod.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Recommending...</>
                ) : (
                  'Recommend'
                )}
              </Button>
            )}
          </Card>

          {/* Share a Story Card */}
          <Card className="p-6 bg-card border-border hover:border-primary/50 transition-all flex flex-col">
            <BookOpen className="h-10 w-10 text-primary mb-4" />
            <h2 className="text-lg font-semibold text-foreground">Share a Story</h2>
            <p className="text-sm text-muted-foreground mt-2">Tell your neighbors what happened.</p>
            <Button
              variant="outline"
              className="w-full mt-4 border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent"
              onClick={() => setMode('story')}
            >
              Start Writing
            </Button>
          </Card>

          {/* Vouch Card */}
          <Card
            className="p-6 bg-card border-border hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center text-center"
            onClick={() => !existingVouch && setMode('vouch')}
          >
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Vouch</h3>
            <p className="text-sm text-muted-foreground">
              Stand behind this business. Verified endorsement with your reputation.
            </p>
            {existingVouch ? (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">You've vouched for this business</span>
                </div>
              </div>
            ) : (
              <Button className="mt-4 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold w-full" onClick={(e) => { e.stopPropagation(); setMode('vouch'); }}>
                Vouch for Them
              </Button>
            )}
          </Card>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => setMode('concern')}
            className="text-sm text-muted-foreground/70 hover:text-foreground-soft transition-colors"
          >
            Had a different experience?
          </button>
        </div>
      </div>
    </div>
  );
}
