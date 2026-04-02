import React, { useState } from 'react';
import { Camera, X } from 'lucide-react';

const safeParseJSON = (val, fallback = []) => {
  if (!val) return fallback;
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
};

const resolveUrl = (url) =>
  typeof url === 'object' && url?.url ? url.url : (url || '');

/**
 * Photo grid with before/after sections and lightbox.
 * photos and completionPhotos are JSON arrays of URLs.
 */
export default function MaintenancePhotoGrid({ photos, completionPhotos, compact }) {
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const beforePhotos = safeParseJSON(photos);
  const afterPhotos = safeParseJSON(completionPhotos);
  const hasAny = beforePhotos.length > 0 || afterPhotos.length > 0;

  if (!hasAny) return null;

  const PhotoThumbnail = ({ url, label }) => {
    const resolved = resolveUrl(url);
    if (!resolved) return null;
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setLightboxUrl(resolved); }}
        className="relative shrink-0"
      >
        <img
          src={resolved}
          alt={label || 'Photo'}
          className={`rounded border border-border object-cover ${
            compact ? 'h-10 w-10' : 'h-16 w-16'
          }`}
        />
      </button>
    );
  };

  return (
    <>
      <div className="space-y-2">
        {beforePhotos.length > 0 && (
          <div>
            {!compact && afterPhotos.length > 0 && (
              <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide mb-1">Before</p>
            )}
            <div className="flex gap-2 overflow-x-auto">
              {beforePhotos.map((url, i) => (
                <PhotoThumbnail key={`b-${i}`} url={url} label="Before" />
              ))}
              {compact && beforePhotos.length > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground/70">
                  <Camera className="w-3 h-3" />
                  <span className="text-xs">{beforePhotos.length}</span>
                </div>
              )}
            </div>
          </div>
        )}
        {afterPhotos.length > 0 && (
          <div>
            {!compact && (
              <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide mb-1">After</p>
            )}
            <div className="flex gap-2 overflow-x-auto">
              {afterPhotos.map((url, i) => (
                <PhotoThumbnail key={`a-${i}`} url={url} label="After" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-lg text-foreground-soft hover:text-foreground hover:bg-secondary transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="max-w-lg max-h-[80vh] w-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxUrl}
              alt="Photo"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
