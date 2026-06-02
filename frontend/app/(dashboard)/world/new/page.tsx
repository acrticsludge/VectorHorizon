// Stitch generates the upload zone UI. This page handles file upload logic only.
// Stitch component expected props: onFileSelect, uploading, previewUrl, error
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadImage } from '@/lib/api/worker';

export default function NewWorldPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    const result = await uploadImage(file);
    setUploading(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.data) {
      router.push(`/world/${result.data.worldId}`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl pt-12">
      <h1 className="mb-2 text-2xl font-bold">New World</h1>
      <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
        Upload an image to serve as your starting environment.
      </p>

      {/* TODO: Replace with <StitchImageUploader onFileSelect={handleFileSelect} uploading={uploading} previewUrl={previewUrl} error={error} /> */}
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 p-12 dark:border-zinc-700">
        {uploading ? (
          <p className="text-sm text-zinc-500">Uploading...</p>
        ) : (
          <>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="text-sm"
            />
            <p className="mt-2 text-xs text-zinc-400">JPEG, PNG, WebP — max 10MB</p>
          </>
        )}
        {previewUrl && (
          <img src={previewUrl} alt="Preview" className="mt-4 max-h-48 rounded-lg" />
        )}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
