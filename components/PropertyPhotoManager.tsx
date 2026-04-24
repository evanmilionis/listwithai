'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X, Upload, Loader2, AlertCircle } from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  order_index: number;
}

interface Props {
  reportId: string;
}

const MAX_PHOTOS = 12;

export default function PropertyPhotoManager({ reportId }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/photos/upload?report_id=${reportId}`);
        const body = await res.json();
        if (!cancelled) setPhotos(body.photos ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reportId]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      if (photos.length >= MAX_PHOTOS) {
        setError(`You've hit the limit of ${MAX_PHOTOS} photos.`);
        break;
      }
      try {
        const fd = new FormData();
        fd.append('report_id', reportId);
        fd.append('file', file);
        const res = await fetch('/api/photos/upload', { method: 'POST', body: fd });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Upload failed');
        setPhotos((prev) => [...prev, body.photo]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleDelete(photoId: string) {
    const originalPhotos = photos;
    setPhotos((prev) => prev.filter((p) => p.id !== photoId)); // optimistic
    try {
      const res = await fetch(`/api/photos/upload?id=${photoId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    } catch {
      setPhotos(originalPhotos); // revert on error
      setError('Failed to delete photo. Please try again.');
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Camera size={14} />
            Property photos
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Upload photos for your public listing
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Buyers see these on your public page. Street View is used as a fallback if you don&apos;t upload any.
            Max {MAX_PHOTOS} photos, 10MB each.
          </p>
        </div>
      </div>

      {/* Grid of uploaded photos + upload tile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt="Property"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <button
              onClick={() => handleDelete(photo.id)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete photo"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload size={20} />
                Add photos
              </>
            )}
          </button>
        )}
      </div>

      {loading && photos.length === 0 && (
        <p className="mt-3 text-xs text-slate-400">Loading photos…</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && (
        <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {photos.length > 0 && (
        <p className="mt-3 text-[11px] text-slate-400">
          {photos.length} of {MAX_PHOTOS} uploaded. First photo shows as the hero image on your public page.
        </p>
      )}
    </div>
  );
}
