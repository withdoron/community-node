import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Camera, X, Loader2 } from 'lucide-react';

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
  } catch { return d; }
};

const DEFAULT_PHASES = ['Before', 'Demo', 'Framing', 'Rough-in', 'Finish', 'Final'];

export default function FieldServicePhotoGallery({ projectId, phases }) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [activePhase, setActivePhase] = useState('all');
  const [showAll, setShowAll] = useState(false);

  const phaseLabels = phases && phases.length > 0 ? phases : DEFAULT_PHASES;

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['fs-project-photos', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const list = await base44.entities.FSDailyPhoto.filter({ project_id: projectId });
      return (Array.isArray(list) ? list : list ? [list] : [])
        .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
    },
    enabled: !!projectId,
  });

  const photosByPhase = useMemo(() => {
    const map = { all: photos };
    phaseLabels.forEach((phase) => {
      map[phase] = photos.filter((p) => (p.phase || '').toLowerCase() === phase.toLowerCase());
    });
    map['Untagged'] = photos.filter((p) => !p.phase || !phaseLabels.some(
      (ph) => ph.toLowerCase() === (p.phase || '').toLowerCase()
    ));
    return map;
  }, [photos, phaseLabels]);

  const filteredPhotos = activePhase === 'all' ? photos : (photosByPhase[activePhase] || []);
  const displayPhotos = showAll ? filteredPhotos : filteredPhotos.slice(0, 6);

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-bold text-slate-100">Photos</h3>
        </div>
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (photos.length === 0) return null;

  const allChips = ['all', ...phaseLabels.filter((p) => (photosByPhase[p] || []).length > 0)];
  if ((photosByPhase['Untagged'] || []).length > 0) allChips.push('Untagged');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Camera className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-bold text-slate-100">Photos</h3>
        <span className="text-xs text-slate-500 ml-auto">{photos.length} total</span>
      </div>

      {/* Phase filter chips */}
      {allChips.length > 2 && (
        <div className="flex gap-2 flex-wrap">
          {allChips.map((phase) => (
            <button key={phase} type="button"
              onClick={() => { setActivePhase(phase); setShowAll(false); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors min-h-[32px] ${
                activePhase === phase
                  ? 'bg-amber-500 text-black'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}>
              {phase === 'all' ? 'All' : phase}
              <span className="ml-1 opacity-70">
                {phase === 'all' ? photos.length : (photosByPhase[phase] || []).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
        {displayPhotos.map((p, i) => {
          const url = typeof p.photo === 'object' && p.photo?.url ? p.photo.url : (p.photo || '');
          if (!url) return null;
          return (
            <button key={p.id || i} type="button"
              onClick={() => setLightboxPhoto(p)}
              className="aspect-square rounded-lg overflow-hidden border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 relative group">
              <img src={url} alt={p.caption || ''} className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {p.phase && (
                  <span className="text-xs bg-amber-500/80 text-black px-1.5 py-0.5 rounded font-medium">
                    {p.phase}
                  </span>
                )}
                {p.caption && <p className="text-xs text-white truncate mt-0.5">{p.caption}</p>}
              </div>
              {/* Always show phase badge on mobile */}
              {p.phase && (
                <span className="absolute top-1.5 left-1.5 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded sm:hidden">
                  {p.phase}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Show more / less */}
      {filteredPhotos.length > 6 && (
        <button type="button" onClick={() => setShowAll(!showAll)}
          className="w-full text-center text-sm text-amber-500 hover:text-amber-400 min-h-[36px]">
          {showAll ? 'Show fewer' : `View all ${filteredPhotos.length} photos`}
        </button>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)} role="dialog" aria-modal="true" aria-label="Photo full size">
          <button type="button" onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-amber-500 rounded-lg bg-slate-800/80 transition-colors"
            aria-label="Close">
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={typeof lightboxPhoto.photo === 'object' && lightboxPhoto.photo?.url ? lightboxPhoto.photo.url : (lightboxPhoto.photo || '')}
              alt={lightboxPhoto.caption || ''}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="mt-3 text-center">
              {lightboxPhoto.phase && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full mr-2">
                  {lightboxPhoto.phase}
                </span>
              )}
              {lightboxPhoto.caption && (
                <span className="text-sm text-slate-300">{lightboxPhoto.caption}</span>
              )}
              <p className="text-xs text-slate-500 mt-1">{fmtDate(lightboxPhoto.created_date)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
