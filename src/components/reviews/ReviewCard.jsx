import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";
import StarRating from './StarRating';
import { format } from 'date-fns';

export default function ReviewCard({ review }) {
  return (
    <Card className="p-5 border-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
            <span className="text-sm font-semibold text-slate-600">
              {(review.reviewer_name || 'A')[0].toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium text-slate-900">
                {review.reviewer_name || 'Anonymous'}
              </p>
              {review.is_verified_purchase && (
                <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-0">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {format(new Date(review.created_date), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <StarRating rating={review.rating} size="sm" />
      </div>

      {review.title && (
        <h4 className="font-semibold text-slate-900 mt-4">{review.title}</h4>
      )}
      
      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
        {review.content}
      </p>

      {review.photos?.length > 0 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {review.photos.map((photo, idx) => (
            <img
              key={idx}
              src={photo}
              alt={`Review photo ${idx + 1}`}
              className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
            />
          ))}
        </div>
      )}
    </Card>
  );
}