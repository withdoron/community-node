import React from 'react';
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StarRating({ 
  rating, 
  onChange, 
  size = 'md', 
  interactive = false,
  showValue = false 
}) {
  const sizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const handleClick = (value) => {
    if (interactive && onChange) {
      onChange(value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => handleClick(value)}
          disabled={!interactive}
          className={cn(
            "transition-transform",
            interactive && "hover:scale-110 cursor-pointer",
            !interactive && "cursor-default"
          )}
        >
          <Star
            className={cn(
              sizes[size],
              "transition-colors",
              value <= rating
                ? "fill-amber-400 text-amber-400"
                : "fill-slate-200 text-slate-200"
            )}
          />
        </button>
      ))}
      {showValue && (
        <span className="ml-1 text-sm font-medium text-slate-700">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}