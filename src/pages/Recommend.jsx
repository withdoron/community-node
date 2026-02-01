import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ThumbsUp, BookOpen, ChevronLeft, Loader2, Upload, X, CheckCircle, ShieldCheck } from "lucide-react";
import ConcernForm from '@/components/recommendations/ConcernForm';

export default function Recommend() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const businessId = urlParams.get('businessId');
  const urlMode = urlParams.get('mode');

  // mode: 'choose' | 'story' | 'nod-done' | 'story-done' | 'concern' | 'concern-done'
  const [mode, setMode] = useState(
    urlMode === 'story' ? 'story' :
    urlMode === 'concern' ? 'concern' :
    'choose'
  );
  const [serviceUsed, setServiceUsed] = useState('');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

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
      await base44.entities.Recommendation.create({
        business_id: businessId,
        user_id: currentUser.id,
        user_name: currentUser.full_name || currentUser.email,
        type: 'nod',
        is_active: true
      });
      // Update business counts
      await base44.entities.Business.update(businessId, {
        nod_count: (business.nod_count || 0) + 1,
        recommendation_count: (business.recommendation_count || 0) + 1
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
        await base44.entities.Recommendation.update(existingNod.id, { is_active: false });
        await base44.entities.Business.update(businessId, {
          nod_count: Math.max((business.nod_count || 1) - 1, 0),
          recommendation_count: Math.max((business.recommendation_count || 1) - 1, 0)
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
      // Create the story
      await base44.entities.Recommendation.create({
        business_id: businessId,
        user_id: currentUser.id,
        user_name: currentUser.full_name || currentUser.email,
        type: 'story',
        service_used: serviceUsed,
        content,
        photos,
        is_active: true
      });

      // Auto-nod if not already nodded
      let newNodCount = business.nod_count || 0;
      if (!existingNod) {
        await base44.entities.Recommendation.create({
          business_id: businessId,
          user_id: currentUser.id,
          user_name: currentUser.full_name || currentUser.email,
          type: 'nod',
          is_active: true
        });
        newNodCount += 1;
      }

      // Update business counts
      await base44.entities.Business.update(businessId, {
        nod_count: newNodCount,
        story_count: (business.story_count || 0) + 1,
        recommendation_count: (business.recommendation_count || 0) + (existingNod ? 1 : 2)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['existing-nod', businessId]);
      queryClient.invalidateQueries(['business', businessId]);
      queryClient.invalidateQueries(['recommendations', businessId]);
      setMode('story-done');
    }
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    const uploadedUrls = [];
    for (const file of files) {
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-slate-900 border-slate-800">
          <ThumbsUp className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white">Sign in to Recommend</h2>
          <p className="text-slate-400 mt-2">Your name stands behind your recommendation — sign in to get started.</p>
          <Button className="mt-6 bg-amber-500 hover:bg-amber-400 text-black font-semibold" onClick={() => base44.auth.signIn()}>
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  // Nod success
  if (mode === 'nod-done') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-slate-900 border-slate-800">
          <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ThumbsUp className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">You've Recommended {business?.name}!</h2>
          <p className="text-slate-400 mt-2">Your neighbors can see your recommendation on their profile.</p>
          <Link to={createPageUrl(`BusinessProfile?id=${businessId}`)}>
            <Button className="mt-6 bg-amber-500 hover:bg-amber-400 text-black font-semibold">
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
      <div className="min-h-screen bg-slate-950">
        <div className="bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-amber-500 hover:bg-slate-800" onClick={() => setMode('choose')}>
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-slate-900 border-slate-800">
          <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Concern Received</h2>
          <p className="text-slate-400 mt-2">We'll review this and follow up if needed. Thank you for helping keep our community trustworthy.</p>
          <Link to={createPageUrl(`BusinessProfile?id=${businessId}`)}>
            <Button className="mt-6 bg-slate-700 hover:bg-slate-600 text-white">
              Back to {business?.name}
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Story success
  if (mode === 'story-done') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center bg-slate-900 border-slate-800">
          <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">Story Shared!</h2>
          <p className="text-slate-400 mt-2">Thank you for helping your neighbors discover {business?.name}.</p>
          <Link to={createPageUrl(`BusinessProfile?id=${businessId}`)}>
            <Button className="mt-6 bg-amber-500 hover:bg-amber-400 text-black font-semibold">
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
      <div className="min-h-screen bg-slate-950">
        <div className="bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-amber-500 hover:bg-slate-800" onClick={() => setMode('choose')}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card className="p-6 sm:p-8 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-3 mb-1">
              <BookOpen className="h-6 w-6 text-amber-500" />
              <h1 className="text-2xl font-bold text-white">Share Your Story</h1>
            </div>
            {business && (
              <p className="text-slate-400 mt-1">about {business.name}</p>
            )}

            <div className="mt-8 space-y-6">
              {/* Service Used */}
              <div>
                <Label className="text-base font-medium text-slate-100">
                  What service or experience did you have?
                </Label>
                <Input
                  value={serviceUsed}
                  onChange={(e) => setServiceUsed(e.target.value)}
                  placeholder="e.g., Kitchen remodel, Oil change, Farm stand"
                  className="mt-2 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>

              {/* Story Content */}
              <div>
                <Label className="text-base font-medium text-slate-100">
                  Tell your story <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What happened? How did it go? Would you go back?"
                  className="mt-2 min-h-[150px] bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  required
                />
              </div>

              {/* Photos */}
              <div>
                <Label className="text-base font-medium text-slate-100">Add photos (optional)</Label>
                <p className="text-sm text-slate-500 mt-1">Photos help your neighbors see the experience</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img src={photo} alt={`Upload ${idx + 1}`} className="h-20 w-20 rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="h-20 w-20 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-500/10 transition-colors">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    ) : (
                      <Upload className="h-5 w-5 text-slate-400" />
                    )}
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>

              {/* Identity reminder */}
              <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center">
                  <span className="text-xs font-semibold text-slate-300">
                    {(currentUser?.full_name || currentUser?.email || 'Y')[0].toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  Your story will be published as <span className="text-slate-200 font-medium">{currentUser?.full_name || currentUser?.email}</span>
                </p>
              </div>

              {/* Submit */}
              <Button
                size="lg"
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold"
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
    <div className="min-h-screen bg-slate-950">
      <div className="bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center">
          <Link to={createPageUrl(`BusinessProfile?id=${businessId}`)}>
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-amber-500 hover:bg-slate-800">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white">
          How would you like to recommend{business ? ` ${business.name}` : ''}?
        </h1>
        <p className="text-slate-400 mt-2">Your name stands behind your recommendation</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          {/* Quick Nod Card */}
          <Card className="p-6 bg-slate-900 border-slate-800 hover:border-amber-500/50 transition-all">
            <ThumbsUp className="h-10 w-10 text-amber-500 mb-4" />
            <h2 className="text-lg font-semibold text-white">Quick Nod</h2>
            <p className="text-sm text-slate-400 mt-2">One click. Your name says it all.</p>

            {existingNod ? (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">You recommend this business</span>
                </div>
                <button
                  onClick={() => removeNod.mutate()}
                  disabled={removeNod.isPending}
                  className="text-sm text-slate-500 hover:text-red-400 mt-2 transition-colors"
                >
                  {removeNod.isPending ? 'Removing...' : 'Remove recommendation'}
                </button>
              </div>
            ) : (
              <Button
                className="w-full mt-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold"
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
          <Card className="p-6 bg-slate-900 border-slate-800 hover:border-amber-500/50 transition-all">
            <BookOpen className="h-10 w-10 text-amber-500 mb-4" />
            <h2 className="text-lg font-semibold text-white">Share a Story</h2>
            <p className="text-sm text-slate-400 mt-2">Tell your neighbors what happened.</p>
            <Button
              variant="outline"
              className="w-full mt-4 border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent"
              onClick={() => setMode('story')}
            >
              Start Writing
            </Button>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => setMode('concern')}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Had a different experience?
          </button>
        </div>
      </div>
    </div>
  );
}
