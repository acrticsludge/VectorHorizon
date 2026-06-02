'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { uploadImage } from '@/lib/api/worker';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { ShimmerSkeleton } from '@/components/layout/ShimmerSkeleton';

export default function NewWorldPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    // Validate
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('The selected file exceeds the 10MB limit. Please choose a smaller file.');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);
    setFileName(file.name);

    // Upload to Worker
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
  }, [router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const resetUpload = useCallback(() => {
    setPreviewUrl(null);
    setFileName('');
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0e0e10] text-[#e5e1e4]">
      <Navbar />
      <Sidebar />

      <main className="flex-1 mt-16 lg:ml-64 p-[16px] md:p-6 max-w-4xl mx-auto w-full flex flex-col items-center justify-center">
        {/* Page header */}
        <div className="text-center mb-12 mt-8">
          <h2 className="text-[32px] leading-[1.2] tracking-[-0.01em] font-medium mb-2">New World</h2>
          <p className="text-[14px] leading-[1.6] text-[#a1a1aa]">Upload an image to serve as your starting environment.</p>
        </div>

        <div className="w-full flex flex-col gap-8">
          {/* Upload zone */}
          <label
            className={`relative group cursor-pointer w-full aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 transition-all duration-300 ${
              dragOver ? 'border-white bg-[#201f22]' : 'border-[#27272a] bg-[#1c1b1d] hover:bg-[#201f22] hover:border-[#8e9192]'
            } ${previewUrl && !uploading ? 'hidden' : ''}`}
            htmlFor="file-input"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input accept=".jpg,.jpeg,.png,.webp" id="file-input" type="file" className="hidden" ref={inputRef} onChange={handleInputChange} />
            <div className="p-4 rounded-full bg-[#2a2a2c] text-[#a1a1aa] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[32px]">upload_file</span>
            </div>
            <div className="text-center">
              <p className="text-[18px] leading-[1.4] font-medium text-white">Drop an image here, or click to browse</p>
              <p className="text-[12px] leading-[1.0] tracking-[0.05em] font-medium uppercase text-[#a1a1aa] mt-1">JPEG, PNG, WebP — max 10MB</p>
            </div>
          </label>

          {/* Preview state */}
          {previewUrl && !uploading && (
            <div className="w-full p-6 border border-[#27272a] rounded-lg bg-[#201f22] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded border border-[#27272a] overflow-hidden bg-[#0e0e10]">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[18px] leading-[1.4] font-medium text-white">{fileName}</span>
                  <span className="text-[12px] leading-[1.0] tracking-[0.05em] font-medium uppercase text-[#a1a1aa]">Ready to process</span>
                </div>
              </div>
              <button onClick={resetUpload} className="p-2 text-[#a1a1aa] hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          )}

          {/* Uploading shimmer */}
          {uploading && <ShimmerSkeleton variant="thumbnail" />}

          {/* Error banner */}
          {error && (
            <div className="w-full p-4 bg-[#93000a] text-white rounded border border-red-500/20 flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <span className="text-[14px] leading-[1.6]">{error}</span>
            </div>
          )}

          {/* CTA */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => {
                const file = inputRef.current?.files?.[0];
                if (file) handleFile(file);
              }}
              disabled={!previewUrl || uploading}
              className="w-full max-w-xs bg-white text-black py-4 rounded text-[18px] leading-[1.4] font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all"
            >
              {uploading ? 'Processing...' : 'Start Exploring'}
            </button>
            <p className="text-[12px] leading-[1.0] tracking-[0.05em] font-medium text-[#a1a1aa]">
              Precision AI will analyze and generate the spatial depth from your source.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
