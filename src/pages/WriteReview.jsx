import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import StarRating from '@/components/reviews/StarRating';
import { ChevronLeft, Loader2, Upload, X, CheckCircle } from "lucide-react";

export default function WriteReview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const businessId = urlParams.get('businessId');

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: business } = useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter({ id: businessId });
      return businesses[0];
    },
    enabled: !!businessId
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const submitReview = useMutation({
    mutationFn: async (reviewData) => {
      // Create the review
      await base44.entities.Review.create(reviewData);
      
      // Update business rating
      const allReviews = await base44.entities.Review.filter({ business_id: businessId });
      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = totalRating / allReviews.length;
      
      await base44.entities.Business.update(businessId, {
        average_rating: avgRating,
        review_count: allReviews.length
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reviews', businessId]);
      queryClient.invalidateQueries(['business', businessId]);
      setSubmitted(true);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) return;

    submitReview.mutate({
      business_id: businessId,
      reviewer_name: currentUser?.full_name || 'Anonymous',
      reviewer_email: currentUser?.email,
      rating,
      title,
      content,
      photos
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Thank You!</h2>
          <p className="text-slate-600 mt-2">
            Your review has been submitted successfully.
          </p>
          <Link to={createPageUrl(`BusinessProfile?id=${businessId}`)}>
            <Button className="mt-6 bg-slate-900 hover:bg-slate-800">
              Back to Business Profile
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center">
          <Link to={createPageUrl(`BusinessProfile?id=${businessId}`)}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">Write a Review</h1>
          {business && (
            <p className="text-slate-600 mt-1">for {business.name}</p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Rating */}
            <div>
              <Label className="text-base font-medium text-slate-900">
                Overall Rating <span className="text-red-500">*</span>
              </Label>
              <div className="mt-3">
                <StarRating 
                  rating={rating} 
                  onChange={setRating} 
                  interactive 
                  size="lg" 
                />
              </div>
              {rating > 0 && (
                <p className="text-sm text-slate-600 mt-2">
                  {rating === 5 ? 'Excellent!' : 
                   rating === 4 ? 'Very Good' : 
                   rating === 3 ? 'Good' : 
                   rating === 2 ? 'Fair' : 'Poor'}
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-base font-medium text-slate-900">
                Review Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Summarize your experience"
                className="mt-2"
              />
            </div>

            {/* Content */}
            <div>
              <Label htmlFor="content" className="text-base font-medium text-slate-900">
                Your Review <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share details of your experience with this business..."
                className="mt-2 min-h-[150px]"
                required
              />
            </div>

            {/* Photos */}
            <div>
              <Label className="text-base font-medium text-slate-900">
                Photos (optional)
              </Label>
              <p className="text-sm text-slate-500 mt-1">
                Add photos to help others see your experience
              </p>
              
              <div className="mt-3 flex flex-wrap gap-3">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={photo}
                      alt={`Upload ${idx + 1}`}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                <label className="h-20 w-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  ) : (
                    <Upload className="h-5 w-5 text-slate-400" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            {/* Submit */}
            <Button 
              type="submit" 
              size="lg"
              className="w-full bg-slate-900 hover:bg-slate-800"
              disabled={rating === 0 || !content || submitReview.isPending}
            >
              {submitReview.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}